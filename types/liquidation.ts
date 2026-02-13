export type LiquidationZone = "above" | "below" | "current";

export type LiquidationLevel = {
  price: number;
  distancePct: number;
  longUsd: number;
  shortUsd: number;
  totalUsd: number;
  zone: LiquidationZone;
};

export type LiquidationMap = {
  symbol: string;
  timeframe: "4h" | "1d" | "1w";
  currentPrice: number;
  generatedAtISO: string;
  levels: LiquidationLevel[];
  topLongLevels: LiquidationLevel[];
  topShortLevels: LiquidationLevel[];
  modelNotes: string[];
};

