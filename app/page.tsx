"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LiquidationLadder from "@/components/LiquidationLadder";
import { buildLiquidationMap } from "@/lib/liquidation";
import { Candle, Timeframe } from "@/types/analysis";

type MarketDataResponse = {
  symbol: string;
  asOfISO: string;
  data: Record<Timeframe, Candle[]>;
};

function formatPrice(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatUsd(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function HomePage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState<Timeframe>("4h");
  const [rangePct, setRangePct] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<MarketDataResponse | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/market-data?symbol=${symbol}`, { cache: "no-store" });
      const json = (await res.json()) as Partial<MarketDataResponse> & { error?: string };

      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch market data.");
      }

      setMarketData(json as MarketDataResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const map = useMemo(() => {
    const candles = marketData?.data[timeframe] ?? [];
    if (candles.length === 0) return null;
    return buildLiquidationMap(candles, {
      symbol: marketData?.symbol ?? symbol,
      timeframe,
      rangePct: rangePct / 100,
      stepPct: 0.01
    });
  }, [timeframe, marketData, rangePct, symbol]);

  return (
    <main className="shell">
      <section className="hero card">
        <div>
          <p className="eyebrow">BTC Risk Visualization</p>
          <h1>Liquidation Ladder</h1>
          <p className="muted">A cleaner alternative to heatmaps: each row shows how much forced closing is likely if BTC moves to that level.</p>
        </div>

        <div className="controls">
          <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="BTCUSDT" />
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value as Timeframe)}>
            <option value="4h">4H</option>
            <option value="1d">1D</option>
            <option value="1w">1W</option>
          </select>
          <select value={rangePct} onChange={(e) => setRangePct(Number(e.target.value))}>
            <option value={10}>Range ±10%</option>
            <option value={15}>Range ±15%</option>
            <option value={20}>Range ±20%</option>
          </select>
          <button onClick={refresh} disabled={loading}>{loading ? "Updating..." : "Update Map"}</button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </section>

      {!map ? (
        <section className="card">
          <p className="muted">{loading ? "Loading BTC market data..." : "No market data yet."}</p>
        </section>
      ) : (
        <>
          <section className="kpi-grid">
            <article className="kpi card">
              <p>Current BTC</p>
              <h2>{formatPrice(map.currentPrice)}</h2>
            </article>
            <article className="kpi card">
              <p>Largest Long Flush Zone</p>
              <h2>{formatPrice(map.topLongLevels[0]?.price ?? map.currentPrice)}</h2>
              <small>{formatUsd(map.topLongLevels[0]?.longUsd ?? 0)} est. long liquidations</small>
            </article>
            <article className="kpi card">
              <p>Largest Short Squeeze Zone</p>
              <h2>{formatPrice(map.topShortLevels[0]?.price ?? map.currentPrice)}</h2>
              <small>{formatUsd(map.topShortLevels[0]?.shortUsd ?? 0)} est. short liquidations</small>
            </article>
          </section>

          <section className="card">
            <h3>Liquidation Ladder</h3>
            <LiquidationLadder levels={map.levels} currentPrice={map.currentPrice} />
          </section>

          <section className="grid-two">
            <article className="card">
              <h3>Top Long Flush Levels</h3>
              <ul className="simple-list">
                {map.topLongLevels.map((level) => (
                  <li key={`long-${level.price}`}>
                    <span>{formatPrice(level.price)}</span>
                    <strong>{formatUsd(level.longUsd)}</strong>
                  </li>
                ))}
              </ul>
            </article>

            <article className="card">
              <h3>Top Short Squeeze Levels</h3>
              <ul className="simple-list">
                {map.topShortLevels.map((level) => (
                  <li key={`short-${level.price}`}>
                    <span>{formatPrice(level.price)}</span>
                    <strong>{formatUsd(level.shortUsd)}</strong>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="card">
            <h3>Model Notes</h3>
            <ul className="notes">
              {map.modelNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
            <p className="muted">As of {new Date(marketData?.asOfISO ?? map.generatedAtISO).toLocaleString()}.</p>
          </section>
        </>
      )}
    </main>
  );
}
