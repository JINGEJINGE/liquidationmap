import { Plan, QuantSummary } from "@/types/analysis";

function roundByPrice(value: number): number {
  if (value >= 1000) return Number(value.toFixed(2));
  if (value >= 1) return Number(value.toFixed(4));
  return Number(value.toFixed(6));
}

function rr(entry: number, stop: number, target: number): number {
  const risk = Math.abs(entry - stop);
  if (risk === 0) return 0;
  return Number((Math.abs(target - entry) / risk).toFixed(2));
}

export function buildTradePlans(summary: QuantSummary, accountEquity: number): Plan[] {
  const d = summary.analyses["1d"];
  const h4 = summary.analyses["4h"];

  const price = d.latestPrice;
  const atr = d.indicators.atr14 ?? Math.max(price * 0.02, 0.0001);

  const riskBudget = accountEquity * 0.01;

  const baseEntry = price;
  const baseStop = Math.max(0.0000001, d.support - atr * 0.5);
  const baseT1 = price + atr * 1.5;
  const baseT2 = price + atr * 3;
  const baseRiskPerUnit = Math.max(0.0000001, baseEntry - baseStop);
  const baseUnits = riskBudget / baseRiskPerUnit;

  const conservativeEntry = Math.min(price, h4.indicators.ema20 ?? price);
  const conservativeStop = Math.max(0.0000001, d.support - atr);
  const conservativeT1 = conservativeEntry + atr * 1.2;
  const conservativeT2 = conservativeEntry + atr * 2.2;
  const conservativeUnits = riskBudget / Math.max(0.0000001, conservativeEntry - conservativeStop);

  const aggressiveEntry = price;
  const aggressiveStop = Math.max(0.0000001, baseEntry - atr * 0.8);
  const aggressiveT1 = aggressiveEntry + atr;
  const aggressiveT2 = aggressiveEntry + atr * 2;
  const aggressiveUnits = riskBudget / Math.max(0.0000001, aggressiveEntry - aggressiveStop);

  const plans: Plan[] = [
    {
      name: "Conservative",
      direction: "long",
      entry: roundByPrice(conservativeEntry),
      stop: roundByPrice(conservativeStop),
      target1: roundByPrice(conservativeT1),
      target2: roundByPrice(conservativeT2),
      invalidation: `Daily close below ${roundByPrice(conservativeStop)} or RSI(14) on 1D < 45`,
      riskRewardToT1: rr(conservativeEntry, conservativeStop, conservativeT1),
      riskRewardToT2: rr(conservativeEntry, conservativeStop, conservativeT2),
      positionSizeUnits: roundByPrice(conservativeUnits)
    },
    {
      name: "Base",
      direction: "long",
      entry: roundByPrice(baseEntry),
      stop: roundByPrice(baseStop),
      target1: roundByPrice(baseT1),
      target2: roundByPrice(baseT2),
      invalidation: `Break and hold below daily support ${roundByPrice(d.support)}`,
      riskRewardToT1: rr(baseEntry, baseStop, baseT1),
      riskRewardToT2: rr(baseEntry, baseStop, baseT2),
      positionSizeUnits: roundByPrice(baseUnits)
    },
    {
      name: "Aggressive",
      direction: "long",
      entry: roundByPrice(aggressiveEntry),
      stop: roundByPrice(aggressiveStop),
      target1: roundByPrice(aggressiveT1),
      target2: roundByPrice(aggressiveT2),
      invalidation: `4H structure breaks and closes below ${roundByPrice(aggressiveStop)}`,
      riskRewardToT1: rr(aggressiveEntry, aggressiveStop, aggressiveT1),
      riskRewardToT2: rr(aggressiveEntry, aggressiveStop, aggressiveT2),
      positionSizeUnits: roundByPrice(aggressiveUnits)
    }
  ];

  return plans;
}
