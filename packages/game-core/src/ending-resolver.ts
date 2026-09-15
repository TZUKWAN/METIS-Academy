import type { CampaignType, ContentIndex, Ending } from "@metis/content-schema";
import type { GameState } from "./state.js";
import { evaluateCondition } from "./conditions.js";
import { num } from "./state.js";

/** 由 state.campaignId 推导 campaign 类型（内容统一按 type 引用） */
export function campaignTypeOf(state: GameState, index: ContentIndex): CampaignType {
  const campaign = index.campaigns.get(state.campaignId);
  if (campaign) return campaign.type;
  if (state.campaignId.startsWith("research")) return "research";
  if (state.campaignId.startsWith("competition")) return "competition";
  return "venture";
}

/**
 * 结局特异性分数：唯一旗标守卫（旗标仅被 1 个事件设置）= 2 分，
 * NG+/超稀有 = 1 分，纯数值/里程碑旗标 = 0 分。
 * 匹配多条结局时先按特异性降序、再按 priority 降序——
 * 保证"由具体选择链解锁的结局"不会被"通用统计结局"抢走结算。
 */
export function endingSpecificity(e: Ending, index: ContentIndex): number {
  const setters = new Map<string, Set<string>>();
  for (const ev of index.events.values()) {
    const keys = new Set<string>();
    for (const f of ev.flags ?? []) keys.add(f.key);
    for (const ch of ev.choices ?? []) {
      for (const eff of ch.hiddenEffects ?? []) if (eff.kind === "setFlag") keys.add(eff.key);
    }
    for (const eff of ev.automaticEffects ?? []) if (eff.kind === "setFlag") keys.add(eff.key);
    for (const k of keys) {
      if (!setters.has(k)) setters.set(k, new Set());
      setters.get(k)!.add(ev.id);
    }
  }
  const score = (c: import("@metis/content-schema").Condition): number => {
    switch (c.kind) {
      case "flag":
      case "flagValue":
        return (setters.get(c.key)?.size ?? 0) === 1 ? 2 : 0;
      case "assetType":
      case "assetExists":
      case "skill":
      case "knowledge":
        return 1;
      case "and":
      case "or":
        return Math.max(0, ...c.conditions.map(score));
      case "not":
        return score(c.condition);
      default:
        return 0;
    }
  };
  let s = score(e.requirements);
  if (e.ngPlus === true || e.ultraRare === true) s = Math.max(s, 1);
  return s;
}

/**
 * Ending Resolver（C011）：
 * 1. 收集满足 requirements 的候选主结局（本 campaign 类型 + global）
 * 2. 按（特异性降序, priority 降序）取第一个
 * 3. 相同主结果因状态不同 → 由 Composer 生成明显不同变体
 */
export function resolveEnding(state: GameState, index: ContentIndex): Ending {
  const type = campaignTypeOf(state, index);
  const pool = [...index.endings.values()].filter((e) => e.campaign === type || e.campaign === "global");
  const matched = pool.filter((e) => evaluateCondition(state, e.requirements, index));
  if (matched.length === 0) {
    const fallback = pool.sort((a, b) => a.priority - b.priority)[0];
    if (!fallback) throw new Error(`campaign ${state.campaignId} 没有任何可用 ending`);
    return fallback;
  }
  matched.sort((a, b) => {
    const sa = endingSpecificity(a, index);
    const sb = endingSpecificity(b, index);
    if (sa !== sb) return sb - sa;
    return b.priority - a.priority;
  });
  return matched[0]!;
}

/** 结算触发判断：日数耗尽 / 最终任务完成 / 任务失败且无后续 */
export function shouldResolveEnding(state: GameState, index: ContentIndex): { ended: boolean; reason?: string } {
  if (state.ended) return { ended: true, reason: "already" };
  const campaign = index.campaigns.get(state.campaignId);
  if (!campaign) return { ended: false };
  const day = num(state, "day");
  if (day > campaign.totalDays) return { ended: true, reason: "time_up" };
  if (state.currentMissionId === null) {
    const type = campaignTypeOf(state, index);
    const anyActive = [...index.missions.values()].some(
      (m) => m.campaignId === type && state.missionStates[m.id]?.status === "active",
    );
    if (!anyActive) {
      const finalDone = [...index.missions.values()].filter(
        (m) => m.campaignId === type && state.missionStates[m.id]?.status === "completed",
      );
      if (finalDone.length > 0) {
        const lastStage = Math.max(...finalDone.map((m) => m.stage));
        const settled = new Set(["completed", "failed", "skipped"]);
        const higher = [...index.missions.values()].some((m) => {
          const st = state.missionStates[m.id]?.status; // undefined = 尚未解锁
          return m.campaignId === type && m.stage > lastStage && !settled.has(st ?? "pending");
        });
        if (!higher) return { ended: true, reason: "campaign_complete" };
      }
    }
  }
  return { ended: false };
}
