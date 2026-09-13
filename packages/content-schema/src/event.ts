import { z } from "zod";
import { ConditionSchema, type Condition } from "./condition.js";
import { EffectSchema } from "./effect.js";
import { ChoiceSchema } from "./choice.js";

export const EVENT_TYPES = ["story", "decision", "system", "npc", "evaluation", "delayed"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** 事件触发来源 */
export type Trigger =
  | { kind: "missionEntry"; mission: string }
  | { kind: "day"; day: number; phase: "start" | "end" }
  | { kind: "state"; condition: Condition }
  | { kind: "asset"; assetType?: string; assetId?: string }
  | { kind: "delayed" }
  | { kind: "stage"; stage: number }
  | { kind: "random"; weight: number; condition?: Condition }
  | { kind: "manual" }; // 仅通过 next 指针进入

export const TriggerSchema: z.ZodType<Trigger, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("missionEntry"), mission: z.string().min(1) }),
    z.object({
      kind: z.literal("day"),
      day: z.number().int().min(1),
      phase: z.enum(["start", "end"]).default("start"),
    }),
    z.object({ kind: z.literal("state"), condition: ConditionSchema }),
    z.object({
      kind: z.literal("asset"),
      assetType: z.string().optional(),
      assetId: z.string().optional(),
    }),
    z.object({ kind: z.literal("delayed") }),
    z.object({ kind: z.literal("stage"), stage: z.number().int().min(1) }),
    z.object({
      kind: z.literal("random"),
      weight: z.number().min(0),
      condition: ConditionSchema.optional(),
    }),
    z.object({ kind: z.literal("manual") }),
  ]),
);

export const DialogueLineSchema = z.object({
  speaker: z.string().min(1),
  text: z.string().min(1).max(600),
  /** 表情/情绪标签，用于头像渲染 */
  mood: z.enum(["neutral", "happy", "serious", "angry", "worried", "pleased", "surprised"]).optional(),
});

export const EventSchema = z.object({
  id: z.string().min(1),
  campaign: z.enum(["research", "competition", "venture", "global"]),
  day: z.number().int().min(1),
  type: z.enum(EVENT_TYPES),
  trigger: TriggerSchema,
  /** 制作目的（内容审计用） */
  purpose: z
    .object({ narrative: z.string().optional(), learning: z.string().optional() })
    .optional(),
  scene: z.object({
    location: z.string().min(1),
    characters: z.array(z.string()).default([]),
  }),
  setup: z.array(z.string()).optional(),
  dialogue: z.array(DialogueLineSchema).default([]),
  choices: z.array(ChoiceSchema).optional(),
  automaticEffects: z.array(EffectSchema).optional(),
  delayedEffects: z
    .array(
      z.object({
        eventId: z.string().min(1),
        offsetDays: z.number().int().min(0).optional(),
        onDay: z.number().int().min(1).optional(),
        condition: ConditionSchema.optional(),
      }),
    )
    .optional(),
  knowledgeUnlocks: z.array(z.string()).optional(),
  flags: z
    .array(z.object({ key: z.string().min(1), value: z.union([z.boolean(), z.number(), z.string()]).optional() }))
    .optional(),
  next: z.string().optional(),
  /** 决策事件必须满足验收之一：后续校验脚本检查 */
  terminal: z.boolean().optional(),
  /** 随机事件权重 */
  weight: z.number().optional(),
  /** 关键决策标记（用于 fate review 与统计） */
  keyDecision: z.boolean().optional(),
  /** 学习点（fate review 显示） */
  learningPoint: z.string().optional(),
});
export type Event = z.infer<typeof EventSchema>;
export type DialogueLine = z.infer<typeof DialogueLineSchema>;
