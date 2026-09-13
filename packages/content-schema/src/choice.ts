import { z } from "zod";
import { ConditionSchema } from "./condition.js";
import { EffectSchema } from "./effect.js";

/** 玩家选择项：只显示行为文本（text），隐藏所有数值效果 */
export const ChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(120),
  /** 显示前置条件（不满足则置灰并给出原因文案） */
  requirements: ConditionSchema.optional(),
  requirementHint: z.string().optional(),
  /** 资源/时间成本 */
  cost: z
    .object({
      actionPoints: z.number().int().min(0).optional(),
      money: z.number().min(0).optional(),
      energy: z.number().min(0).optional(),
    })
    .optional(),
  /** 资产要求 */
  assetRequirements: z
    .array(z.object({ type: z.string().min(1), minCount: z.number().int().min(1).optional() }))
    .optional(),
  /** 选择后的可见反馈（叙事文本） */
  visibleResponse: z.string().optional(),
  /** 隐藏效果（玩家不可见） */
  hiddenEffects: z.array(EffectSchema).optional(),
  /** 延迟后果：第 N 天后触发某事件 */
  delayed: z
    .array(
      z.object({
        eventId: z.string().min(1),
        offsetDays: z.number().int().min(0).optional(),
        onDay: z.number().int().min(1).optional(),
        condition: ConditionSchema.optional(),
      }),
    )
    .optional(),
  /** 技能检定分支 */
  skillCheck: z
    .object({
      skillId: z.string().min(1),
      difficulty: z.number().min(0).max(100),
      onSuccess: z.object({
        response: z.string().optional(),
        effects: z.array(EffectSchema).optional(),
        next: z.string().optional(),
      }),
      onFailure: z.object({
        response: z.string().optional(),
        effects: z.array(EffectSchema).optional(),
        next: z.string().optional(),
      }),
    })
    .optional(),
  /** AI 评估分支（有 AI 时用 AI 评估，无 AI 时走规则回退） */
  aiBranch: z
    .object({
      key: z.string().min(1),
      promptContext: z.string().optional(),
      onPass: z.object({
        response: z.string().optional(),
        effects: z.array(EffectSchema).optional(),
        next: z.string().optional(),
      }),
      onFail: z.object({
        response: z.string().optional(),
        effects: z.array(EffectSchema).optional(),
        next: z.string().optional(),
      }),
      /** 无 AI 时的规则回退条件（满足视为 pass） */
      fallbackCondition: ConditionSchema.optional(),
    })
    .optional(),
  /** 直接解锁知识卡 */
  unlockKnowledge: z.array(z.string()).optional(),
  /** 下一事件 */
  next: z.string().optional(),
  /** 结束当天剧情流 */
  endFlow: z.boolean().optional(),
});
export type Choice = z.infer<typeof ChoiceSchema>;
