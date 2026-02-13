"use client";

import { LiquidationLevel } from "@/types/liquidation";

type Props = {
  levels: LiquidationLevel[];
  currentPrice: number;
};

function formatUsd(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPrice(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatPct(value: number): string {
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

export default function LiquidationLadder({ levels, currentPrice }: Props) {
  const sorted = [...levels].sort((a, b) => b.price - a.price);
  const maxLong = Math.max(...levels.map((l) => l.longUsd), 1);
  const maxShort = Math.max(...levels.map((l) => l.shortUsd), 1);

  return (
    <div className="ladder">
      <div className="ladder-head">
        <span>Long Liquidations (price drops)</span>
        <span>Price Level</span>
        <span>Short Liquidations (price rises)</span>
      </div>
      <div className="ladder-body">
        {sorted.map((level) => {
          const longWidth = `${Math.max((level.longUsd / maxLong) * 100, 2)}%`;
          const shortWidth = `${Math.max((level.shortUsd / maxShort) * 100, 2)}%`;
          const isCurrent = level.zone === "current";

          return (
            <div key={level.price} className={`ladder-row ${isCurrent ? "is-current" : ""}`}>
              <div className="ladder-cell left">
                <div className={`bar long ${level.zone === "above" ? "muted-bar" : ""}`} style={{ width: longWidth }} />
                <span>{formatUsd(level.longUsd)}</span>
              </div>

              <div className="ladder-price">
                <strong>{formatPrice(level.price)}</strong>
                <span>{formatPct(level.distancePct)}</span>
              </div>

              <div className="ladder-cell right">
                <span>{formatUsd(level.shortUsd)}</span>
                <div className={`bar short ${level.zone === "below" ? "muted-bar" : ""}`} style={{ width: shortWidth }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="legend-note">Current BTC: {formatPrice(currentPrice)}. Bright bars indicate the direction with higher expected forced liquidations at that level.</p>
    </div>
  );
}

