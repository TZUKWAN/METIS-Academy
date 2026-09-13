import { create } from "zustand";
import {
  reducer,
  serializeSave,
  validateSave,
  composeEnding,
  buildFateReview,
  newPlaythrough,
  mergeProfile,
  type GameState,
  type GameAction,
  type ComposedEnding,
  type FateItem,
  type PlaythroughProfile,
} from "@metis/game-core";
import { EMPTY_PROFILE } from "@metis/game-core";
import type { ContentIndex } from "@metis/content-schema";
import { loadContent } from "./content.js";
import { metis } from "./api.js";

export type Page = "home" | "story" | "workbench" | "studio" | "skills" | "library" | "settings";

interface GameStore {
  index: ContentIndex;
  contentIssues: number;
  page: Page;
  state: GameState | null;
  profile: PlaythroughProfile;
  composed: ComposedEnding | null;
  fateReview: FateItem[] | null;
  toast: string | null;
  onboardingDone: boolean;
  setProfile: (p: PlaythroughProfile) => void;
  setPage: (p: Page) => void;
  showToast: (t: string | null) => void;
  finishOnboarding: () => void;
  newGame: (campaignId: string, characterName: string, ngPlus: boolean) => void;
  dispatch: (action: GameAction) => { error?: string };
  saveTo: (slot: number, label: string) => Promise<void>;
  loadFrom: (slot: number) => Promise<{ ok: boolean; error?: string }>;
  resolveEndingNow: () => void;
  closeEnding: () => void;
}

export const useGame = create<GameStore>((set, get) => ({
  index: new Map() as unknown as ContentIndex,
  contentIssues: 0,
  page: "home",
  state: null,
  profile: EMPTY_PROFILE,
  composed: null,
  fateReview: null,
  toast: null,
  onboardingDone: false,

  setProfile: (p) => set({ profile: p }),
  setPage: (page) => set({ page }),
  showToast: (toast) => set({ toast }),
  finishOnboarding: () => set({ onboardingDone: true }),

  newGame: (campaignId, characterName, ngPlus) => {
    const { index, profile } = get();
    const state = newPlaythrough(index, campaignId, characterName || "你", profile, ngPlus);
    // 立即开始第一个任务
    const campaign = index.campaigns.get(campaignId)!;
    const r = reducer(state, { type: "startMission", missionId: campaign.startMissionId }, index);
    set({ state: r.state, page: "story", composed: null, fateReview: null });
    void autosave(get().state!, "新周目");
  },

  dispatch: (action) => {
    const { state, index } = get();
    if (!state) return { error: "没有进行中的游戏" };
    const beforeEndingId = state.endingId;
    const r = reducer(state, action, index);
    if (r.error) return { error: r.error };
    let composed = get().composed;
    let fateReview = get().fateReview;
    if (r.endingResolved && r.state.ended && !beforeEndingId) {
      const ending = index.endings.get(r.state.endingId!);
      if (ending) {
        composed = composeEnding(r.state, ending, index, index.characters);
        fateReview = buildFateReview(r.state, index);
        // 更新全局档案（C014）
        const merged = mergeProfile(get().profile, r.state);
        set({ profile: merged });
        void metis()
          .profile.put(JSON.stringify(merged))
          .catch(() => undefined);
      }
    }
    set({ state: r.state, composed, fateReview });
    if (r.autosave && !r.state.ended) void autosave(r.state);
    return {};
  },

  saveTo: async (slot, label) => {
    const { state } = get();
    if (!state) return;
    await metis().saves.put({ slot, label, savedAt: new Date().toISOString(), payload: JSON.stringify(state) });
    set({ toast: `已保存到槽位 ${slot}：${label}` });
    setTimeout(() => set({ toast: null }), 2200);
  },

  loadFrom: async (slot) => {
    const raw = await metis().saves.get(slot);
    if (!raw) return { ok: false, error: "槽位为空" };
    try {
      const parsed = JSON.parse(raw.payload);
      const v = validateSave(parsed);
      if (!v.ok || !v.envelope) return { ok: false, error: v.error ?? "存档校验失败" };
      set({ state: v.envelope.state, page: "story", composed: null, fateReview: null, toast: `已读取：${raw.label}` });
      setTimeout(() => set({ toast: null }), 2200);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: `存档损坏：${err instanceof Error ? err.message : String(err)}` };
    }
  },

  resolveEndingNow: () => {
    const { state, index } = get();
    if (!state || state.ended) return;
    get().dispatch({ type: "endDay" });
    if (!get().state?.ended) {
      // 强制结算兜底
      const s2 = structuredClone(get().state)!;
      s2.nums["day"] = 999;
      const r = reducer(s2, { type: "endDay" }, index);
      if (r.state.ended) {
        const ending = index.endings.get(r.state.endingId!);
        if (ending) {
          const composed = composeEnding(r.state, ending, index, index.characters);
          const fateReview = buildFateReview(r.state, index);
          const merged = mergeProfile(get().profile, r.state);
          set({ state: r.state, composed, fateReview, profile: merged });
        }
      }
    }
  },

  closeEnding: () => set({ page: "home" }),
}));

async function autosave(state: GameState, label = "自动存档"): Promise<void> {
  try {
    const env = serializeSave(state, { slot: 0, label, contentVersion: "1.0.0", appVersion: "1.0.0" });
    await metis().saves.put({ slot: 0, label, savedAt: env.savedAt, payload: JSON.stringify(state) });
  } catch {
    // 存储不可用时静默（游戏不中断）
  }
}

export function initStore(): void {
  const content = loadContent();
  useGame.setState({ index: content.index, contentIssues: content.issues.length });
  metis()
    .profile.get()
    .then((raw) => {
      if (raw) {
        try {
          useGame.setState({ profile: JSON.parse(raw) as PlaythroughProfile });
        } catch {
          /* 忽略损坏的档案 */
        }
      }
    })
    .catch(() => undefined);
}
