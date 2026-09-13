import { z } from "zod";

export const CharacterSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  role: z.string().min(1),
  portrait: z.string().min(1), // SVG 主题 key
  baseRelationship: z.number().min(0).max(100),
  traits: z.array(z.string()).default([]),
  /** 目标 */
  goals: z.string().min(1),
  /** 性格 */
  personality: z.string().min(1),
  /** 能提供什么 */
  offers: z.string().min(1),
  /** 常见冲突 */
  conflicts: z.string().min(1),
  /** 关系变化规则（自然语言 + 结构化提示） */
  relationshipRules: z.array(z.string()).default([]),
  campaignAvailability: z.array(z.string()).default([]),
  dynamicRules: z.array(z.string()).default([]),
  dialogueStyle: z.string().min(1),
});
export type Character = z.infer<typeof CharacterSchema>;

export const RELATIONSHIP_TIERS = ["estranged", "neutral", "trusting", "deep_trust"] as const;
export type RelationshipTier = (typeof RELATIONSHIP_TIERS)[number];

export function relationshipTier(score: number): RelationshipTier {
  if (score < 30) return "estranged";
  if (score < 55) return "neutral";
  if (score < 80) return "trusting";
  return "deep_trust";
}

export const RELATIONSHIP_TIER_LABEL: Record<RelationshipTier, string> = {
  estranged: "疏远",
  neutral: "一般",
  trusting: "信任",
  deep_trust: "高度信任",
};
