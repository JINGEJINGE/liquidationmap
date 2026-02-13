import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { assertValidSymbol, fetchKlines, normalizeSymbol } from "@/lib/binance";
import { buildPrompt } from "@/lib/prompt";
import { reportSchema } from "@/lib/schema";
import { buildTradePlans } from "@/lib/trade-plan";
import { buildQuantSummary } from "@/lib/indicators";
import { ReportResponse, Timeframe } from "@/types/analysis";

const TIMEFRAMES: Timeframe[] = ["4h", "1d", "1w"];

function fallbackReport(symbol: string, summaryText: string, plans: ReturnType<typeof buildTradePlans>): ReportResponse {
  return {
    beginner_explanation:
      `${symbol} is being checked using trend (EMA), momentum (RSI/MACD), volatility (Bollinger/ATR), and volume. ` +
      "If indicators align, plans can be followed; if they conflict, wait for clearer confirmation.",
    pro_analysis: summaryText,
    scenarios: [
      {
        name: "Bullish continuation",
        description: "Price holds above key support and 4H/1D momentum remains constructive."
      },
      {
        name: "Range/chop",
        description: "Price oscillates between support and resistance with mixed RSI/MACD signals."
      },
      {
        name: "Bearish failure",
        description: "Support breaks with rising sell volume and momentum turns negative."
      }
    ],
    trade_plan: plans,
    risks: [
      "Crypto volatility can invalidate setups quickly.",
      "Macro or exchange-specific news may cause sudden moves.",
      "Low liquidity periods can increase slippage."
    ],
    disclaimer: "Educational only, not financial advice."
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { symbol?: string; accountEquity?: number };
    const symbol = normalizeSymbol(body.symbol ?? "BTCUSDT");
    const accountEquity = Number(body.accountEquity ?? 10000);

    assertValidSymbol(symbol);

    const entries = await Promise.all(
      TIMEFRAMES.map(async (tf) => {
        const candles = await fetchKlines(symbol, tf);
        return [tf, candles] as const;
      })
    );
    const data = Object.fromEntries(entries) as Record<Timeframe, Awaited<ReturnType<typeof fetchKlines>>>;

    const summary = buildQuantSummary(symbol, data);
    const plans = buildTradePlans(summary, accountEquity);

    const summaryText = `Regime=${summary.marketRegime}, alignmentScore=${summary.alignmentScore}, 1D trend=${summary.analyses["1d"].trend}, 4H trend=${summary.analyses["4h"].trend}`;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        symbol,
        asOfISO: summary.asOfISO,
        marketData: data,
        summary,
        report: fallbackReport(symbol, summaryText, plans),
        usedFallback: true
      });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = buildPrompt(summary, plans);

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You are a precise trading educator. Return strict JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("Empty model response");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start < 0 || end <= start) throw new Error("Model did not return valid JSON");
      parsed = JSON.parse(raw.slice(start, end + 1));
    }

    const report = reportSchema.parse(parsed);

    return NextResponse.json({
      symbol,
      asOfISO: summary.asOfISO,
      marketData: data,
      summary,
      report,
      usedFallback: false
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
