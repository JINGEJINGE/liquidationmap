"use client";

import { createChart, UTCTimestamp, CandlestickData, ISeriesApi } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { Candle } from "@/types/analysis";

type Props = {
  candles: Candle[];
  ema20?: number[];
  ema50?: number[];
  ema200?: number[];
};

function lineData(candles: Candle[], values: number[]) {
  const offset = candles.length - values.length;
  return values.map((v, i) => ({
    time: (candles[i + offset].openTime / 1000) as UTCTimestamp,
    value: v
  }));
}

export default function ChartPanel({ candles, ema20 = [], ema50 = [], ema200 = [] }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || candles.length === 0) return;

    const chart = createChart(ref.current, {
      height: 360,
      layout: { background: { color: "#ffffff" }, textColor: "#1b2a33" },
      grid: { vertLines: { color: "#eef3f7" }, horzLines: { color: "#eef3f7" } }
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#0f9d58",
      downColor: "#db4437",
      borderVisible: false,
      wickUpColor: "#0f9d58",
      wickDownColor: "#db4437"
    });

    const data: CandlestickData[] = candles.map((c) => ({
      time: (c.openTime / 1000) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));

    candleSeries.setData(data);

    const lines: Array<[ISeriesApi<"Line">, number[]]> = [
      [chart.addLineSeries({ color: "#007f7a", lineWidth: 2, title: "EMA20" }), ema20],
      [chart.addLineSeries({ color: "#0f3d57", lineWidth: 2, title: "EMA50" }), ema50],
      [chart.addLineSeries({ color: "#6d4c41", lineWidth: 2, title: "EMA200" }), ema200]
    ];

    lines.forEach(([series, values]) => {
      if (values.length) {
        series.setData(lineData(candles, values));
      }
    });

    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      if (ref.current) {
        chart.applyOptions({ width: ref.current.clientWidth });
      }
    });

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [candles, ema20, ema50, ema200]);

  return <div ref={ref} style={{ width: "100%", minHeight: 360 }} />;
}
