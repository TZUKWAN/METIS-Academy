import type { ContentIndex } from "@metis/content-schema";
import type { GameState } from "./state.js";
import { num } from "./state.js";
import { evaluateCondition } from "./conditions.js";
import { clamp } from "@metis/shared";

/** 时间系统（C006）+ 资源系统（C007）：游戏日 + 行动点 + money/reputation/energy */

export const AP_PER_DAY_DEFAULT = 4;
export const ENERGY_COST_PER_AP = 15;
export const ENERGY_RESTORE_PER_DAY = 40;

export function canSpend(state: GameState, cost: { actionPoints?: number; money?: number; energy?: number }): boolean {
  return (
    num(state, "actionPoints") >= (cost.actionPoints ?? 0) &&
    num(state, "money") >= (cost.money ?? 0) &&
    num(state, "energy") >= (cost.energy ?? 0)
  );
}

export function spendCost(state: GameState, cost: { actionPoints?: number; money?: number; energy?: number }): void {
  if (cost.actionPoints) {
    state.nums["actionPoints"] = Math.max(0, num(state, "actionPoints") - cost.actionPoints);
    state.nums["energy"] = clamp(num(state, "energy") - cost.actionPoints * ENERGY_COST_PER_AP, 0, 100);
  }
  if (cost.money) state.nums["money"] = num(state, "money") - cost.money;
  if (cost.energy) state.nums["energy"] = clamp(num(state, "energy") - cost.energy, 0, 100);
}

/** 结算到下一天：返回当日到期应触发的延迟事件 id 列表（由 reducer 入队） */
export function nextDay(state: GameState, index: ContentIndex): { dueDelayed: string[]; dayStarted: number } {
  const day = num(state, "day");
  // 1) 到期延迟事件（scheduledDay <= 明天 即在明早触发）
  const due = state.delayedQueue
    .filter((d) => d.scheduledDay <= day + 1)
    .filter((d) => (d.condition ? evaluateCondition(state, d.condition as never, index) : true))
    .map((d) => d.eventId);
  state.delayedQueue = state.delayedQueue.filter((d) => !due.includes(d.eventId) || d.scheduledDay > day + 1);
  // 2) 日期推进 + 行动点恢复
  state.nums["day"] = day + 1;
  const energy = num(state, "energy");
  state.nums["energy"] = clamp(energy + ENERGY_RESTORE_PER_DAY, 0, 100);
  let budget = num(state, "timeBudget") || AP_PER_DAY_DEFAULT;
  if (energy < 30) budget = Math.max(1, budget - 1); // 疲劳惩罚
  state.nums["actionPoints"] = budget;
  // 3) 全局日推进效果：轻微利息/开销由 campaign 内容事件处理，引擎只保证资源不越界
  state.nums["money"] = Math.max(state.nums["money"] ?? 0, state.nums["money"] ?? 0);
  return { dueDelayed: [...new Set(due)], dayStarted: day + 1 };
}
