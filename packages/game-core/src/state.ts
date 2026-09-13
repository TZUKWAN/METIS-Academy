import type { Campaign, ContentIndex, Mission } from "@metis/content-schema";
import { DEFAULT_STATE } from "@metis/content-schema";

export interface AssetInstance {
  id: string;
  type: string;
  name: string;
  description: string;
  content: string;
  version: number;
  createdAtDay: number;
  missionId?: string;
  tool?: string;
  history: { day: number; action: string; note?: string }[];
}

export interface FlagValue {
  type: "bool" | "num" | "str";
  value: boolean | number | string;
  once?: boolean;
  scope: "campaign" | "global";
}

export interface DelayedEntry {
  id: string;
  sourceEventId: string;
  eventId: string;
  scheduledDay: number;
  condition?: unknown;
  payload?: Record<string, unknown>;
}

export interface EventLogEntry {
  day: number;
  eventId: string;
  choiceId?: string;
  choiceText?: string;
  response?: string;
}

export interface DecisionLogEntry {
  day: number;
  eventId: string;
  eventTitle: string;
  choiceId: string;
  choiceText: string;
  delayed: boolean;
  learningPoint?: string;
}

export type MissionStatus = "locked" | "available" | "active" | "completed" | "failed" | "skipped";

export interface MissionState {
  status: MissionStatus;
  completedDay?: number;
}

export interface AchievementEntry {
  id: string;
  day: number;
  description?: string;
}

export interface GameState {
  version: number;
  campaignId: string;
  characterName: string;
  playthroughId: string;
  rngSeed: number;
  /** 全部数值状态（可见 + 隐藏，统一 0–100 / 资源类除外） */
  nums: Record<string, number>;
  relationships: Record<string, number>;
  flags: Record<string, FlagValue>;
  assets: AssetInstance[];
  skills: Record<string, number>;
  achievements: AchievementEntry[];
  knowledge: string[];
  pendingEvents: string[];
  currentEventId: string | null;
  delayedQueue: DelayedEntry[];
  missionStates: Record<string, MissionState>;
  currentMissionId: string | null;
  eventLog: EventLogEntry[];
  decisionLog: DecisionLogEntry[];
  visitedEvents: string[];
  ngPlus: number;
  unlockedHints: string[];
  ended: boolean;
  endingId: string | null;
  lastFeedback: string | null;
  lastChoiceSkillCheck: { skillId: string; passed: boolean } | null;
}

export const STATE_VERSION = 1;

export function createState(
  campaign: Campaign,
  characterName: string,
  playthroughId: string,
  ngPlus = 0,
): GameState {
  const seedBase = Date.now() ^ Math.floor(Math.random() * 0xffffffff);
  const nums: Record<string, number> = { ...DEFAULT_STATE, ...campaign.defaultState };
  if (ngPlus > 0) {
    nums["timeBudget"] = Math.min(6, (nums["timeBudget"] ?? 4) + 1);
    nums["actionPoints"] = nums["timeBudget"] ?? 5;
  }
  return {
    version: STATE_VERSION,
    campaignId: campaign.id,
    characterName,
    playthroughId,
    rngSeed: seedBase >>> 0,
    nums,
    relationships: {},
    flags: {},
    assets: [],
    skills: {},
    achievements: [],
    knowledge: [],
    pendingEvents: [],
    currentEventId: null,
    delayedQueue: [],
    missionStates: {},
    currentMissionId: null,
    eventLog: [],
    decisionLog: [],
    visitedEvents: [],
    ngPlus,
    unlockedHints: [],
    ended: false,
    endingId: null,
    lastFeedback: null,
    lastChoiceSkillCheck: null,
  };
}

export function num(state: GameState, key: string): number {
  return state.nums[key] ?? 0;
}

export function visibleNums(state: GameState): Record<string, number> {
  const keys = [
    "day",
    "timeBudget",
    "actionPoints",
    "money",
    "progress",
    "users",
    "revenue",
    "literatureCount",
    "productVersion",
    "competitionRank",
    "reputation",
    "energy",
  ];
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = num(state, k);
  return out;
}

export function missionOf(index: ContentIndex, id: string): Mission | undefined {
  return index.missions.get(id);
}
