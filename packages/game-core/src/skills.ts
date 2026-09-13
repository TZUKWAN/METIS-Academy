import type { ContentIndex, Skill } from "@metis/content-schema";
import type { GameState } from "./state.js";

/**
 * 技能系统（C009）：等级只能由"行为成就"解锁，不可手动加经验。
 * state.achievements 记录成就；state.skills 由成就推导。
 */
export function skillLevel(state: GameState, skillId: string): number {
  return state.skills[skillId] ?? 0;
}

/** 根据成就重算技能等级（每次效果应用后调用）。两遍法：先按成就定目标，再统一做前置门控 */
export function recomputeSkills(state: GameState, index: ContentIndex): string[] {
  const changed: string[] = [];
  // Pass 1：按行为成就推导原始目标等级
  const targets = new Map<string, number>();
  for (const skill of index.skills.values()) {
    const current = state.skills[skill.id] ?? 0;
    let target = current;
    for (const behavior of skill.behaviors) {
      if (state.achievements.some((a) => a.id === behavior.achievementId)) {
        target = Math.max(target, behavior.level);
      }
    }
    targets.set(skill.id, target);
  }
  // Pass 2：前置未达标则压制为 0（以前置的推导后等级为准）
  for (const skill of index.skills.values()) {
    const current = state.skills[skill.id] ?? 0;
    let target = targets.get(skill.id) ?? current;
    for (const pre of skill.prerequisites) {
      if ((targets.get(pre) ?? 0) < 1) target = 0;
    }
    if (target !== current) {
      state.skills[skill.id] = target;
      changed.push(skill.id);
    }
  }
  return changed;
}

export function discoveredSkills(state: GameState, index: ContentIndex): Skill[] {
  return [...index.skills.values()].filter((s) => (state.skills[s.id] ?? 0) > 0);
}
