import type { ContentIndex, Mission } from "@metis/content-schema";
import type { GameState } from "./state.js";
import { evaluateCondition } from "./conditions.js";

/**
 * 任务引擎（C005）：
 * 进入 / 完成 / 失败 / 多路径分支 / 锁定（前置）/ 跳过（optional）
 */
export function missionAvailable(state: GameState, mission: Mission, _index: ContentIndex): boolean {
  if (state.missionStates[mission.id]?.status === "completed") return false;
  return mission.prerequisites.every((p) => state.missionStates[p]?.status === "completed");
}

export function startMission(state: GameState, missionId: string, index: ContentIndex): { ok: boolean; reason?: string } {
  const mission = index.missions.get(missionId);
  if (!mission) return { ok: false, reason: `任务 ${missionId} 不存在` };
  if (state.ended) return { ok: false, reason: "本周目已结束" };
  if (state.currentMissionId) return { ok: false, reason: "已有进行中的任务" };
  if (state.missionStates[missionId]?.status === "failed" && !mission.optional) {
    // 失败的任务允许重试一次的规则由内容层决定，引擎默认允许重试
  }
  if (!missionAvailable(state, mission, index)) {
    return { ok: false, reason: mission.lockedMessage ?? "前置任务未完成" };
  }
  state.currentMissionId = missionId;
  state.missionStates[missionId] = { status: "active" };
  return { ok: true };
}

export interface MissionEval {
  completed: boolean;
  failed: boolean;
}

export function evaluateMission(state: GameState, mission: Mission, index: ContentIndex): MissionEval {
  const failed = mission.failureConditions.some((c) => evaluateCondition(state, c, index));
  const completed = mission.completionConditions.every((c) => evaluateCondition(state, c, index));
  return { completed: !failed && completed, failed };
}

/** 完成后根据 nextMissionRules 选择下一个任务；null 表示进入结算 */
export function pickNextMission(
  state: GameState,
  mission: Mission,
  index: ContentIndex,
): { goto: string | null } {
  const defaults = mission.nextMissionRules.filter((r) => r.when === null || r.when === undefined);
  const conditional = mission.nextMissionRules.filter((r) => r.when !== null && r.when !== undefined);
  for (const rule of conditional) {
    if (rule.when && evaluateCondition(state, rule.when, index)) {
      return { goto: rule.goto };
    }
  }
  if (defaults.length > 0) return { goto: defaults[0]!.goto };
  return { goto: null };
}

export function completeMission(state: GameState, mission: Mission): void {
  state.missionStates[mission.id] = { status: "completed", completedDay: state.nums["day"] };
  if (state.currentMissionId === mission.id) state.currentMissionId = null;
}

export function failMission(state: GameState, mission: Mission): void {
  state.missionStates[mission.id] = { status: "failed" };
  if (state.currentMissionId === mission.id) state.currentMissionId = null;
}

export function skipMission(state: GameState, mission: Mission): boolean {
  if (!mission.optional) return false;
  state.missionStates[mission.id] = { status: "skipped" };
  if (state.currentMissionId === mission.id) state.currentMissionId = null;
  return true;
}
