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
 * Ending Resolver（C011）：
 * 1. 收集满足 requirements 的候选主结局（本 campaign 类型 + global）
 * 2. 按 priority 降序取第一个
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
  matched.sort((a, b) => b.priority - a.priority);
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
