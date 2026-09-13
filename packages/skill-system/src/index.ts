// 技能系统辅助（C009 的高层工具）：行为成就 → 技能等级 的推导与查询
// 核心推导已由 game-core/skills.ts 实现；此处提供面向 UI 的聚合视图
import type { ContentIndex, Skill } from "@metis/content-schema";

export interface SkillDomainView {
  domain: string;
  skills: Skill[];
  unlocked: number;
  total: number;
}

export function domainViews(index: ContentIndex, unlockedSkillIds: Set<string>): SkillDomainView[] {
  const domains = new Map<string, Skill[]>();
  for (const skill of index.skills.values()) {
    const list = domains.get(skill.domain) ?? [];
    list.push(skill);
    domains.set(skill.domain, list);
  }
  return [...domains.entries()].map(([domain, skills]) => ({
    domain,
    skills,
    unlocked: skills.filter((s) => unlockedSkillIds.has(s.id)).length,
    total: skills.length,
  }));
}

export function achievementProgress(index: ContentIndex, achievements: Set<string>): { done: number; total: number } {
  let total = 0;
  let done = 0;
  for (const skill of index.skills.values()) {
    for (const b of skill.behaviors) {
      total += 1;
      if (achievements.has(b.achievementId)) done += 1;
    }
  }
  return { done, total };
}
