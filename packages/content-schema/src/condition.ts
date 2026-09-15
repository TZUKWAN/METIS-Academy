import { z } from "zod";

/** 比较操作符 */
export const CmpOp = z.enum(["gte", "gt", "lte", "lt", "eq", "neq"]);
export type CmpOp = z.infer<typeof CmpOp>;

/**
 * 条件引擎 DSL（禁止 eval，纯数据描述）
 * 支持：state 比较 / flag / asset / skill / relationship / knowledge / AND / OR / NOT
 */
export type Condition =
  | { kind: "always"; value?: boolean }
  | { kind: "state"; key: string; op: CmpOp; value: number }
  | { kind: "flag"; key: string; expected?: boolean }
  | { kind: "flagValue"; key: string; op: CmpOp; value: number | string }
  | { kind: "assetType"; type: string; minCount?: number }
  | { kind: "assetExists"; assetId: string }
  | { kind: "skill"; id: string; minLevel: number }
  | { kind: "relationship"; characterId: string; op: CmpOp; value: number }
  | { kind: "knowledge"; id: string }
  | { kind: "ngPlus" }
  | { kind: "and"; conditions: Condition[] }
  | { kind: "or"; conditions: Condition[] }
  | { kind: "not"; condition: Condition };

const base = z.object({}).passthrough();

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    base.extend({ kind: z.literal("always"), value: z.boolean().optional() }),
    base.extend({
      kind: z.literal("state"),
      key: z.string().min(1),
      op: CmpOp,
      value: z.number(),
    }),
    base.extend({ kind: z.literal("flag"), key: z.string().min(1), expected: z.boolean().optional() }),
    base.extend({
      kind: z.literal("flagValue"),
      key: z.string().min(1),
      op: CmpOp,
      value: z.union([z.number(), z.string()]),
    }),
    base.extend({ kind: z.literal("assetType"), type: z.string().min(1), minCount: z.number().int().min(1).optional() }),
    base.extend({ kind: z.literal("assetExists"), assetId: z.string().min(1) }),
    base.extend({ kind: z.literal("skill"), id: z.string().min(1), minLevel: z.number().int().min(1) }),
    base.extend({
      kind: z.literal("relationship"),
      characterId: z.string().min(1),
      op: CmpOp,
      value: z.number(),
    }),
    base.extend({ kind: z.literal("knowledge"), id: z.string().min(1) }),
    base.extend({ kind: z.literal("ngPlus") }),
    base.extend({ kind: z.literal("and"), conditions: z.array(ConditionSchema).min(1) }),
    base.extend({ kind: z.literal("or"), conditions: z.array(ConditionSchema).min(1) }),
    base.extend({ kind: z.literal("not"), condition: ConditionSchema }),
  ]),
);

export const ALWAYS = true;
export const always: Condition = { kind: "always", value: true };
