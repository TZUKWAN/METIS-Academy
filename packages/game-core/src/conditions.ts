import type { Condition, ContentIndex } from "@metis/content-schema";
import { CmpOp } from "@metis/content-schema";
import type { GameState } from "./state.js";
import { num } from "./state.js";

function cmp(a: number, b: number, op: CmpOp): boolean {
  switch (op) {
    case "gte":
      return a >= b;
    case "gt":
      return a > b;
    case "lte":
      return a <= b;
    case "lt":
      return a < b;
    case "eq":
      return a === b;
    case "neq":
      return a !== b;
  }
}

/**
 * 条件引擎（C002）。纯数据 DSL，禁止 eval。
 * 所有条件都基于 GameState 求值，与 UI 完全解耦。
 */
export function evaluateCondition(
  state: GameState,
  cond: Condition | undefined | null,
  index: ContentIndex,
): boolean {
  if (!cond) return true;
  switch (cond.kind) {
    case "always":
      return cond.value ?? true;
    case "state":
      return cmp(num(state, cond.key), cond.value, cond.op);
    case "flag": {
      const f = state.flags[cond.key];
      if (cond.expected === undefined) return f !== undefined;
      return f?.value === cond.expected;
    }
    case "flagValue": {
      const f = state.flags[cond.key];
      if (f === undefined) return false;
      if (typeof cond.value === "number" && typeof f.value === "number") {
        return cmp(f.value, cond.value, cond.op);
      }
      return cond.op === "eq" ? f.value === cond.value : f.value !== cond.value;
    }
    case "assetType": {
      const count = state.assets.filter((a) => a.type === cond.type).length;
      return count >= (cond.minCount ?? 1);
    }
    case "assetExists":
      return state.assets.some((a) => a.id === cond.assetId);
    case "skill":
      return (state.skills[cond.id] ?? 0) >= cond.minLevel;
    case "relationship":
      return cmp(state.relationships[cond.characterId] ?? 50, cond.value, cond.op);
    case "knowledge":
      return state.knowledge.includes(cond.id);
    case "ngPlus":
      return state.ngPlus >= 1;
    case "and":
      return cond.conditions.every((c) => evaluateCondition(state, c, index));
    case "or":
      return cond.conditions.some((c) => evaluateCondition(state, c, index));
    case "not":
      return !evaluateCondition(state, cond.condition, index);
  }
}
