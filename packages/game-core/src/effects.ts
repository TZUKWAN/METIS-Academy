import type { ContentIndex, Effect } from "@metis/content-schema";
import { ASSET_TYPES } from "@metis/content-schema";
import type { AssetInstance, GameState } from "./state.js";
import { num } from "./state.js";
import { clamp, uid } from "@metis/shared";

const HIDDEN_KEYS = [
  "evidenceDiscipline",
  "aiDependence",
  "independence",
  "execution",
  "userUnderstanding",
  "technicalDebt",
  "academicDebt",
  "perfectionism",
  "riskTolerance",
  "mentorTrust",
  "teamTrust",
  "credibility",
];

/** 应用后的回执（UI 可显示发生了什么类别的事，但不显示隐藏数值） */
export interface EffectReceipt {
  visibleKeys: string[];
  achievementIds: string[];
  scheduledDays: number[];
}

function mutate(key: string, fn: (v: number) => number): (s: GameState) => void {
  return (s) => {
    s.nums[key] = fn(num(s, key));
  };
}

function clampHidden(s: GameState, key: string): void {
  if (HIDDEN_KEYS.includes(key) || key === "progress") {
    s.nums[key] = clamp(num(s, key), 0, 100);
  }
}

/**
 * 效果引擎（C001）。GameState 的唯一合法修改入口（配合 reducer）。
 * 支持 set/add/subtract/clamp/setFlag/unsetFlag/addAsset/removeAsset/updateAsset/
 *      unlockSkill/unlockKnowledge/relationship/achievement/scheduleEvent
 */
export function applyEffects(
  state: GameState,
  effects: Effect[] | undefined,
  index: ContentIndex,
  currentDay: number,
): EffectReceipt {
  const receipt: EffectReceipt = { visibleKeys: [], achievementIds: [], scheduledDays: [] };
  if (!effects) return receipt;
  for (const effect of effects) {
    switch (effect.kind) {
      case "set":
        state.nums[effect.key] = effect.value;
        receipt.visibleKeys.push(effect.key);
        break;
      case "add":
        mutate(effect.key, (v) => v + effect.value)(state);
        clampHidden(state, effect.key);
        receipt.visibleKeys.push(effect.key);
        break;
      case "subtract":
        mutate(effect.key, (v) => v - effect.value)(state);
        clampHidden(state, effect.key);
        receipt.visibleKeys.push(effect.key);
        break;
      case "clamp":
        mutate(effect.key, (v) => clamp(v, effect.min ?? 0, effect.max ?? 100))(state);
        break;
      case "setFlag": {
        const existing = state.flags[effect.key];
        if (existing?.once) break; // one-time flag 已定格，不可覆盖
        state.flags[effect.key] = {
          type: typeof effect.value === "number" ? "num" : typeof effect.value === "string" ? "str" : "bool",
          value: effect.value ?? true,
          once: effect.once,
          scope: effect.scope ?? "campaign",
        };
        break;
      }
      case "unsetFlag": {
        const existing = state.flags[effect.key];
        if (existing?.once) break; // one-time flag 是永久标记
        delete state.flags[effect.key];
        break;
      }
      case "addAsset": {
        if (!ASSET_TYPES.includes(effect.assetType as never)) break;
        const asset: AssetInstance = {
          id: effect.assetId ?? uid("asset"),
          type: effect.assetType,
          name: effect.name,
          description: effect.description ?? "",
          content: effect.content ?? "",
          version: 1,
          createdAtDay: currentDay,
          missionId: effect.missionId ?? state.currentMissionId ?? undefined,
          tool: effect.tool,
          history: [{ day: currentDay, action: "创建" }],
        };
        state.assets.push(asset);
        break;
      }
      case "removeAsset": {
        const i = state.assets.findIndex((a) => a.id === effect.assetId);
        if (i >= 0) state.assets.splice(i, 1);
        break;
      }
      case "updateAsset": {
        const asset = state.assets.find((a) => a.id === effect.assetId);
        if (asset) {
          if (effect.content !== undefined) asset.content = effect.content;
          if (effect.description !== undefined) asset.description = effect.description;
          if (effect.bumpVersion) {
            asset.version += 1;
            asset.history.push({ day: currentDay, action: `更新至 v${asset.version}` });
          }
        }
        break;
      }
      case "unlockSkill": {
        const target = effect.level ?? 1;
        state.skills[effect.skillId] = Math.max(state.skills[effect.skillId] ?? 0, target);
        break;
      }
      case "unlockKnowledge":
        if (!state.knowledge.includes(effect.knowledgeId)) {
          state.knowledge.push(effect.knowledgeId);
        }
        break;
      case "relationship":
        state.relationships[effect.characterId] = clamp(
          (state.relationships[effect.characterId] ?? 50) + effect.delta,
          0,
          100,
        );
        break;
      case "achievement":
        if (!state.achievements.some((a) => a.id === effect.achievementId)) {
          state.achievements.push({ id: effect.achievementId, day: currentDay, description: effect.description });
          receipt.achievementIds.push(effect.achievementId);
        }
        break;
      case "scheduleEvent": {
        const scheduledDay = effect.onDay ?? currentDay + (effect.offsetDays ?? 0);
        state.delayedQueue.push({
          id: uid("delayed"),
          sourceEventId: state.currentEventId ?? "(effect)",
          eventId: effect.eventId,
          scheduledDay,
          condition: effect.condition,
          payload: effect.payload,
        });
        receipt.scheduledDays.push(scheduledDay);
        break;
      }
    }
  }
  return receipt;
}
