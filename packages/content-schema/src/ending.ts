import { z } from "zod";
import { ConditionSchema } from "./condition.js";

/** 成长变体维度（8 类） */
export const GROWTH_DIMENSIONS = [
  "independence",
  "aiDependence",
  "execution_vs_judgment",
  "judgment_vs_execution",
  "evidenceDiscipline",
  "technicalDebt",
  "academicDebt",
  "balanced",
] as const;
export type GrowthDimension = (typeof GROWTH_DIMENSIONS)[number];

export const EndingSchema = z.object({
  id: z.string().min(1),
  campaign: z.enum(["research", "competition", "venture", "global"]),
  title: z.string().min(1),
  /** 主结果（简洁陈述，如"顺利通过开题"） */
  mainResult: z.string().min(1),
  /** 达成条件 */
  requirements: ConditionSchema,
  /** 数字越大越优先 */
  priority: z.number().int(),
  tier: z.enum(["main", "special", "hidden"]).default("main"),
  /** 主文本骨架，支持 {{var}} 插值 */
  baseText: z.string().min(1),
  /** 成长变体规则：按隐藏状态分段生成段落 */
  growthVariantRules: z
    .array(
      z.object({
        dimension: z.string().min(1),
        variants: z
          .array(
            z.object({
              gte: z.number().min(0).max(100).optional(),
              lte: z.number().min(0).max(100).optional(),
              text: z.string().min(1),
            }),
          )
          .min(1),
      }),
    )
    .default([]),
  /** NPC 后日谈：按关系分档 */
  characterEpilogueRules: z
    .array(
      z.object({
        characterId: z.string().min(1),
        condition: ConditionSchema.optional(),
        positive: z.string().min(1),
        neutral: z.string().min(1),
        negative: z.string().min(1),
      }),
    )
    .default([]),
  /** 项目未来 */
  projectFutureRules: z
    .array(
      z.object({
        key: z.string().min(1),
        condition: ConditionSchema,
        text: z.string().min(1),
      }),
    )
    .default([]),
  /** 特殊 flag 附加段 */
  specialFlagSections: z
    .array(
      z.object({
        flag: z.string().min(1),
        text: z.string().min(1),
      }),
    )
    .default([]),
  specialTags: z.array(z.string()).default([]),
  reflection: z.string().min(1),
  /** 教学启示（fate review 用） */
  lessonHint: z.string().optional(),
});
export type Ending = z.infer<typeof EndingSchema>;
