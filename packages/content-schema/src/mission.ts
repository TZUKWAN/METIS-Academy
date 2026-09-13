import { z } from "zod";
import { ConditionSchema } from "./condition.js";
import { EffectSchema } from "./effect.js";

export const MissionSchema = z.object({
  id: z.string().min(1),
  campaignId: z.enum(["research", "competition", "venture"]),
  stage: z.number().int().min(1),
  day: z.number().int().min(1),
  title: z.string().min(1),
  objective: z.string().min(1),
  briefing: z.string().min(1),
  /** 前置任务 id 列表 */
  prerequisites: z.array(z.string()).default([]),
  entryEventId: z.string().min(1),
  /** 完成条件（不可为空） */
  completionConditions: z.array(ConditionSchema).min(1),
  failureConditions: z.array(ConditionSchema).default([]),
  rewards: z.array(EffectSchema).default([]),
  requiredAssets: z
    .array(z.object({ type: z.string().min(1), minCount: z.number().int().min(1).optional() }))
    .default([]),
  recommendedSkills: z.array(z.string()).default([]),
  nextMissionRules: z
    .array(
      z.object({
        when: ConditionSchema.nullable(), // null = 默认规则
        goto: z.string().min(1),
      }),
    )
    .default([]),
  /** 教学目标：完成任务后玩家真实多会的一件事 */
  skillTraining: z.string().optional(),
  knowledge: z.array(z.string()).default([]),
  optional: z.boolean().default(false),
  lockedMessage: z.string().optional(),
});
export type Mission = z.infer<typeof MissionSchema>;
