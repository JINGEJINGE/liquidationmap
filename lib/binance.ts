import { Candle, Timeframe } from "@/types/analysis";

const BASE_URL = "https://api.binance.com";

const timeframeToInterval: Record<Timeframe, string> = {
  "4h": "4h",
  "1d": "1d",
  "1w": "1w"
};

const timeframeToLimit: Record<Timeframe, number> = {
  "4h": 500,
  "1d": 500,
  "1w": 200
};

export function normalizeSymbol(input: string): string {
  const cleaned = input.trim().toUpperCase();
  if (!cleaned.endsWith("USDT")) {
    return `${cleaned}USDT`;
  }
  return cleaned;
}

export function assertValidSymbol(symbol: string): void {
  if (!/^[A-Z0-9]{3,20}USDT$/.test(symbol)) {
    throw new Error("Symbol must be alphanumeric and end with USDT (example: BTCUSDT)");
  }
}

export async function fetchKlines(symbol: string, timeframe: Timeframe): Promise<Candle[]> {
  const interval = timeframeToInterval[timeframe];
  const limit = timeframeToLimit[timeframe];
  const url = `${BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Binance error for ${timeframe}: ${text}`);
  }

  const raw = (await res.json()) as Array<[number, string, string, string, string, string]>;

  return raw.map((k) => ({
    openTime: k[0],
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5])
  }));
}
