import { NextRequest, NextResponse } from "next/server";
import { assertValidSymbol, fetchKlines, normalizeSymbol } from "@/lib/binance";
import { Timeframe } from "@/types/analysis";

const TIMEFRAMES: Timeframe[] = ["4h", "1d", "1w"];

export async function GET(req: NextRequest) {
  try {
    const inputSymbol = req.nextUrl.searchParams.get("symbol") ?? "BTCUSDT";
    const symbol = normalizeSymbol(inputSymbol);
    assertValidSymbol(symbol);

    const entries = await Promise.all(
      TIMEFRAMES.map(async (tf) => {
        const candles = await fetchKlines(symbol, tf);
        return [tf, candles] as const;
      })
    );

    const data = Object.fromEntries(entries);

    return NextResponse.json({ symbol, data, asOfISO: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
