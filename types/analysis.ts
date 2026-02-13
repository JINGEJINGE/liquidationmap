export type Timeframe = "4h" | "1d" | "1w";

export type Candle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type IndicatorSnapshot = {
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  atr14: number | null;
  volumeSma20: number | null;
};

export type TimeframeAnalysis = {
  timeframe: Timeframe;
  latestPrice: number;
  trend: "bullish" | "bearish" | "neutral";
  momentum: "strong" | "moderate" | "weak" | "mixed";
  support: number;
  resistance: number;
  indicators: IndicatorSnapshot;
};

export type QuantSummary = {
  symbol: string;
  asOfISO: string;
  marketRegime: "trend" | "range" | "mixed";
  alignmentScore: number;
  analyses: Record<Timeframe, TimeframeAnalysis>;
};

export type Plan = {
  name: "Conservative" | "Base" | "Aggressive";
  direction: "long" | "wait";
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  invalidation: string;
  riskRewardToT1: number;
  riskRewardToT2: number;
  positionSizeUnits: number;
};

export type ReportResponse = {
  beginner_explanation: string;
  pro_analysis: string;
  scenarios: Array<{ name: string; description: string }>;
  trade_plan: Array<Plan>;
  risks: string[];
  disclaimer: string;
};
