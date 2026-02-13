import { Candle, Timeframe } from "@/types/analysis";
import { LiquidationLevel, LiquidationMap, LiquidationZone } from "@/types/liquidation";

type BuildMapOptions = {
  symbol: string;
  timeframe: Timeframe;
  rangePct?: number;
  stepPct?: number;
};

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = mean(values.map((v) => (v - avg) ** 2));
  return Math.sqrt(variance);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gauss(distance: number, center: number, spread: number): number {
  const normalized = (distance - center) / spread;
  return Math.exp(-normalized * normalized);
}

function nearestVolumeWeight(candles: Candle[], targetPrice: number): number {
  if (candles.length === 0) return 1;
  const sampled = candles.slice(-180);
  const closest = sampled.reduce(
    (best, candle) => {
      const mid = (candle.high + candle.low) / 2;
      const d = Math.abs(mid - targetPrice) / targetPrice;
      if (d < best.distance) {
        return { distance: d, volume: candle.volume };
      }
      return best;
    },
    { distance: Number.POSITIVE_INFINITY, volume: sampled[0].volume }
  );
  const avgVol = mean(sampled.map((c) => c.volume));
  if (avgVol === 0) return 1;
  return clamp(closest.volume / avgVol, 0.6, 1.8);
}

function computeZone(distancePct: number): LiquidationZone {
  if (distancePct > 0.0005) return "above";
  if (distancePct < -0.0005) return "below";
  return "current";
}

export function buildLiquidationMap(candles: Candle[], options: BuildMapOptions): LiquidationMap {
  const rangePct = options.rangePct ?? 0.15;
  const stepPct = options.stepPct ?? 0.01;
  const latest = candles[candles.length - 1];

  if (!latest) {
    return {
      symbol: options.symbol,
      timeframe: options.timeframe,
      currentPrice: 0,
      generatedAtISO: new Date().toISOString(),
      levels: [],
      topLongLevels: [],
      topShortLevels: [],
      modelNotes: ["No candle data available."]
    };
  }

  const currentPrice = latest.close;
  const sampled = candles.slice(-220);
  const returns = sampled
    .slice(1)
    .map((c, i) => Math.log(c.close / sampled[i].close))
    .filter((v) => Number.isFinite(v));
  const volatility = stdev(returns);
  const trendWindow = sampled.slice(-80);
  const trendPct = trendWindow.length > 1 ? trendWindow[trendWindow.length - 1].close / trendWindow[0].close - 1 : 0;
  const avgVolume = mean(sampled.map((c) => c.volume));
  const volumeImpulse = avgVolume > 0 ? clamp(latest.volume / avgVolume, 0.7, 1.6) : 1;

  const leverageAnchors = [
    { distance: 0.012, weight: 1.2 },
    { distance: 0.02, weight: 1.15 },
    { distance: 0.04, weight: 1 },
    { distance: 0.07, weight: 0.8 },
    { distance: 0.11, weight: 0.6 }
  ];

  const baseNotional = 34_000_000 * (1 + clamp(volatility * 20, 0.04, 0.65)) * volumeImpulse;

  const levels: LiquidationLevel[] = [];

  for (let pct = -rangePct; pct <= rangePct + 1e-6; pct += stepPct) {
    const distance = Math.abs(pct);
    const price = currentPrice * (1 + pct);
    const zone = computeZone(pct);

    const leverageDensity = leverageAnchors.reduce((acc, anchor) => {
      return acc + anchor.weight * gauss(distance, anchor.distance, 0.012 + anchor.distance * 0.15);
    }, 0);

    const nearCurrentDensity = gauss(distance, rangePct * 0.42, rangePct * 0.22);
    const historicalVolumeWeight = nearestVolumeWeight(sampled, price);
    const trendToLongs = clamp(1 + trendPct * 2.2, 0.55, 1.7);
    const trendToShorts = clamp(1 - trendPct * 2.2, 0.55, 1.7);

    let longPressure = 0;
    let shortPressure = 0;

    if (zone === "below") {
      longPressure = baseNotional * (0.35 + leverageDensity * 0.45 + nearCurrentDensity * 0.5) * historicalVolumeWeight * trendToLongs;
      shortPressure = baseNotional * (0.03 + leverageDensity * 0.04);
    } else if (zone === "above") {
      shortPressure = baseNotional * (0.35 + leverageDensity * 0.45 + nearCurrentDensity * 0.5) * historicalVolumeWeight * trendToShorts;
      longPressure = baseNotional * (0.03 + leverageDensity * 0.04);
    } else {
      longPressure = baseNotional * 0.11;
      shortPressure = baseNotional * 0.11;
    }

    const longUsd = Math.round(longPressure);
    const shortUsd = Math.round(shortPressure);

    levels.push({
      price,
      distancePct: pct,
      longUsd,
      shortUsd,
      totalUsd: longUsd + shortUsd,
      zone
    });
  }

  const topLongLevels = [...levels]
    .filter((l) => l.zone === "below")
    .sort((a, b) => b.longUsd - a.longUsd)
    .slice(0, 4);

  const topShortLevels = [...levels]
    .filter((l) => l.zone === "above")
    .sort((a, b) => b.shortUsd - a.shortUsd)
    .slice(0, 4);

  return {
    symbol: options.symbol,
    timeframe: options.timeframe,
    currentPrice,
    generatedAtISO: new Date().toISOString(),
    levels,
    topLongLevels,
    topShortLevels,
    modelNotes: [
      "Estimated liquidation pressure using recent BTC volatility, leverage-distance clustering, and nearby traded volume.",
      "Levels are model-based risk zones, not exact exchange liquidation positions.",
      "Use this as context for scenario planning, not as a standalone trading signal."
    ]
  };
}

