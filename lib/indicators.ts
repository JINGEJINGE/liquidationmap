import { ATR, BollingerBands, EMA, MACD, RSI, SMA } from "technicalindicators";
import { Candle, IndicatorSnapshot, QuantSummary, Timeframe, TimeframeAnalysis } from "@/types/analysis";

function lastOrNull(arr: number[] | { [key: string]: number }[]): any {
  return arr.length ? arr[arr.length - 1] : null;
}

function toFixedNumber(value: number | null, digits = 4): number | null {
  if (value === null || Number.isNaN(value)) return null;
  return Number(value.toFixed(digits));
}

function deriveTrend(price: number, ema50: number | null, ema200: number | null): "bullish" | "bearish" | "neutral" {
  if (ema50 === null || ema200 === null) return "neutral";
  if (price > ema50 && ema50 > ema200) return "bullish";
  if (price < ema50 && ema50 < ema200) return "bearish";
  return "neutral";
}

function deriveMomentum(rsi: number | null, macdHistogram: number | null): "strong" | "moderate" | "weak" | "mixed" {
  if (rsi === null || macdHistogram === null) return "mixed";
  if (rsi >= 60 && macdHistogram > 0) return "strong";
  if (rsi >= 50 && macdHistogram > 0) return "moderate";
  if (rsi <= 40 && macdHistogram < 0) return "weak";
  return "mixed";
}

function supportResistance(candles: Candle[], lookback = 40): { support: number; resistance: number } {
  const slice = candles.slice(-lookback);
  const lows = slice.map((c) => c.low);
  const highs = slice.map((c) => c.high);
  return {
    support: Math.min(...lows),
    resistance: Math.max(...highs)
  };
}

export function analyzeTimeframe(timeframe: Timeframe, candles: Candle[]): TimeframeAnalysis {
  if (candles.length < 60) {
    throw new Error(`Not enough candles for ${timeframe}. Need at least 60, got ${candles.length}.`);
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);

  const ema20 = lastOrNull(EMA.calculate({ period: 20, values: closes })) as number | null;
  const ema50 = lastOrNull(EMA.calculate({ period: 50, values: closes })) as number | null;
  const ema200 = lastOrNull(EMA.calculate({ period: 200, values: closes })) as number | null;

  const rsi14 = lastOrNull(RSI.calculate({ period: 14, values: closes })) as number | null;

  const macdRaw = lastOrNull(
    MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    })
  ) as { MACD: number; signal: number; histogram: number } | null;

  const bbRaw = lastOrNull(
    BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 })
  ) as { upper: number; middle: number; lower: number } | null;

  const atr14 = lastOrNull(ATR.calculate({ period: 14, high: highs, low: lows, close: closes })) as number | null;
  const volumeSma20 = lastOrNull(SMA.calculate({ period: 20, values: volumes })) as number | null;

  const latestPrice = closes[closes.length - 1];
  const sr = supportResistance(candles);

  const indicators: IndicatorSnapshot = {
    ema20: toFixedNumber(ema20),
    ema50: toFixedNumber(ema50),
    ema200: toFixedNumber(ema200),
    rsi14: toFixedNumber(rsi14),
    macd: toFixedNumber(macdRaw?.MACD ?? null),
    macdSignal: toFixedNumber(macdRaw?.signal ?? null),
    macdHistogram: toFixedNumber(macdRaw?.histogram ?? null),
    bbUpper: toFixedNumber(bbRaw?.upper ?? null),
    bbMiddle: toFixedNumber(bbRaw?.middle ?? null),
    bbLower: toFixedNumber(bbRaw?.lower ?? null),
    atr14: toFixedNumber(atr14),
    volumeSma20: toFixedNumber(volumeSma20)
  };

  return {
    timeframe,
    latestPrice: toFixedNumber(latestPrice, 6) ?? latestPrice,
    trend: deriveTrend(latestPrice, indicators.ema50, indicators.ema200),
    momentum: deriveMomentum(indicators.rsi14, indicators.macdHistogram),
    support: toFixedNumber(sr.support, 6) ?? sr.support,
    resistance: toFixedNumber(sr.resistance, 6) ?? sr.resistance,
    indicators
  };
}

export function buildQuantSummary(symbol: string, data: Record<Timeframe, Candle[]>): QuantSummary {
  const a4h = analyzeTimeframe("4h", data["4h"]);
  const a1d = analyzeTimeframe("1d", data["1d"]);
  const a1w = analyzeTimeframe("1w", data["1w"]);

  const bullishCount = [a4h, a1d, a1w].filter((a) => a.trend === "bullish").length;
  const bearishCount = [a4h, a1d, a1w].filter((a) => a.trend === "bearish").length;

  const alignmentScore = Number(((bullishCount - bearishCount) / 3).toFixed(2));
  const marketRegime = Math.abs(alignmentScore) >= 0.67 ? "trend" : Math.abs(alignmentScore) <= 0.33 ? "range" : "mixed";

  return {
    symbol,
    asOfISO: new Date().toISOString(),
    marketRegime,
    alignmentScore,
    analyses: {
      "4h": a4h,
      "1d": a1d,
      "1w": a1w
    }
  };
}
