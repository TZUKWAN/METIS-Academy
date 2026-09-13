import type { ContentIndex } from "@metis/content-schema";
import type { GameState } from "./state.js";
import { num } from "./state.js";
import { evaluateCondition } from "./conditions.js";
import { mulberry32, weightedPick } from "@metis/shared";

/**
 * 事件触发引擎（C003）。
 * 触发来源：mission entry / day(start|end) / state threshold / asset / delayed /
 *           campaign stage / random weighted / manual(next 指针)
 */
export function collectTriggeredEvents(state: GameState, index: ContentIndex, phase: "dayStart" | "dayEnd"): string[] {
  const day = num(state, "day");
  const rng = mulberry32(state.rngSeed + day * 7919);
  // 只触发当前 campaign 类型（或 global）的事件，防止跨线串台
  const campaign = index.campaigns.get(state.campaignId);
  const type = campaign?.type ?? (state.campaignId.startsWith("research") ? "research" : state.campaignId.startsWith("competition") ? "competition" : "venture");
  const matched: { id: string; weight: number }[] = [];
  for (const event of index.events.values()) {
    if (event.campaign !== type && event.campaign !== "global") continue;
    if (state.visitedEvents.includes(event.id) && event.trigger.kind !== "random") continue;
    const t = event.trigger;
    let hit = false;
    let weight = 1;
    switch (t.kind) {
      case "day":
        hit = t.day === day && t.phase === (phase === "dayStart" ? "start" : "end");
        break;
      case "stage": {
        const mission = state.currentMissionId ? index.missions.get(state.currentMissionId) : undefined;
        hit = mission?.stage === t.stage;
        break;
      }
      case "state":
        if (phase !== "dayStart") break;
        hit = evaluateCondition(state, t.condition, index);
        break;
      case "asset":
        if (phase !== "dayStart") break;
        hit = t.assetId
          ? state.assets.some((a) => a.id === t.assetId)
          : t.assetType
            ? state.assets.some((a) => a.type === t.assetType)
            : false;
        break;
      case "random":
        if (phase !== "dayStart") break;
        if (t.condition && !evaluateCondition(state, t.condition, index)) break;
        hit = true;
        weight = t.weight;
        break;
      default:
        break; // missionEntry / delayed / manual 由其他路径处理
    }
    if (hit) matched.push({ id: event.id, weight });
  }
  // 随机事件最多取 1 条（按权重），其余按顺序返回
  const randoms = matched.filter((m) => index.events.get(m.id)?.trigger.kind === "random");
  const ordered = matched.filter((m) => index.events.get(m.id)?.trigger.kind !== "random").map((m) => m.id);
  const picked = weightedPick(randoms, rng);
  return [...ordered, ...(picked ? [picked.id] : [])];
}

export function missionEntryEvent(state: GameState, index: ContentIndex): string | null {
  if (!state.currentMissionId) return null;
  const mission = index.missions.get(state.currentMissionId);
  if (!mission) return null;
  const entry = mission.entryEventId;
  if (!entry || state.visitedEvents.includes(entry)) return null;
  return entry;
}
