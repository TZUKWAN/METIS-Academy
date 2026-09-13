import type { ContentIndex } from "@metis/content-schema";
import { createState, type GameState } from "./state.js";

/** 周目系统（C014）：first run / NG+ / unlock flags / 已发现 endings / 高级提示 */

export interface PlaythroughProfile {
  discoveredEndings: string[];
  unlockedHints: string[];
  completedCampaigns: string[];
  ngPlusCount: number;
  totalEndingsSeen: number;
}

export const EMPTY_PROFILE: PlaythroughProfile = {
  discoveredEndings: [],
  unlockedHints: [],
  completedCampaigns: [],
  ngPlusCount: 0,
  totalEndingsSeen: 0,
};

export function mergeProfile(profile: PlaythroughProfile, state: GameState): PlaythroughProfile {
  const endings = new Set(profile.discoveredEndings);
  if (state.endingId) endings.add(state.endingId);
  const hints = new Set([...profile.unlockedHints, ...state.unlockedHints]);
  const completed = new Set(profile.completedCampaigns);
  if (state.ended) completed.add(state.campaignId);
  return {
    discoveredEndings: [...endings],
    unlockedHints: [...hints],
    completedCampaigns: [...completed],
    ngPlusCount: profile.ngPlusCount + (state.ended ? 1 : 0),
    totalEndingsSeen: endings.size,
  };
}

export function eligibleForNgPlus(profile: PlaythroughProfile, campaignId: string): boolean {
  return profile.completedCampaigns.includes(campaignId);
}

export function newPlaythrough(
  index: ContentIndex,
  campaignId: string,
  characterName: string,
  profile: PlaythroughProfile,
  ngPlus: boolean,
): GameState {
  const campaign = index.campaigns.get(campaignId);
  if (!campaign) throw new Error(`campaign ${campaignId} 不存在`);
  const useNg = ngPlus && eligibleForNgPlus(profile, campaignId);
  const state = createState(campaign, characterName, `pt_${Date.now().toString(36)}`, useNg ? 1 : 0);
  // NG+ 继承：已发现结局对应的高级提示
  if (useNg) {
    state.unlockedHints = [...new Set(profile.unlockedHints)];
    state.skills = {}; // 技能不跨周目继承（行为成就重新证明）
  }
  return state;
}
