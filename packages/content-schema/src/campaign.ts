import { z } from "zod";
import { DEFAULT_STATE } from "./state.js";

export const CAMPAIGN_TYPES = ["research", "competition", "venture"] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const CampaignSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(CAMPAIGN_TYPES),
  cover: z.string().min(1),
  startMissionId: z.string().min(1),
  endingPool: z.array(z.string()).min(1),
  defaultState: z.record(z.string(), z.number()).default({}),
  skillFocus: z.array(z.string()).default([]),
  estimatedMinutes: z.number().int().min(1),
  /** 总天数 */
  totalDays: z.number().int().min(1),
});
export type Campaign = z.infer<typeof CampaignSchema>;

export function campaignDefaultState(c: Campaign): Record<string, number> {
  return { ...DEFAULT_STATE, ...c.defaultState };
}
