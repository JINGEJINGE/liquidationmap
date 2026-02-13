import { z } from "zod";

export const reportSchema = z.object({
  beginner_explanation: z.string(),
  pro_analysis: z.string(),
  scenarios: z.array(
    z.object({
      name: z.string(),
      description: z.string()
    })
  ),
  trade_plan: z.array(
    z.object({
      name: z.enum(["Conservative", "Base", "Aggressive"]),
      direction: z.enum(["long", "wait"]),
      entry: z.number(),
      stop: z.number(),
      target1: z.number(),
      target2: z.number(),
      invalidation: z.string(),
      riskRewardToT1: z.number(),
      riskRewardToT2: z.number(),
      positionSizeUnits: z.number()
    })
  ),
  risks: z.array(z.string()),
  disclaimer: z.string()
});

export type ReportSchema = z.infer<typeof reportSchema>;
