import { z } from "zod";

/** 可见状态键（玩家可看到） */
export const VISIBLE_STATE_KEYS = [
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
] as const;

/** 隐藏状态键（玩家不可直接看到数字） */
export const HIDDEN_STATE_KEYS = [
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
] as const;

export type VisibleStateKey = (typeof VISIBLE_STATE_KEYS)[number];
export type HiddenStateKey = (typeof HIDDEN_STATE_KEYS)[number];

/** 所有隐藏状态统一 0–100 */
export const DEFAULT_STATE: Record<VisibleStateKey | HiddenStateKey, number> = {
  day: 1,
  timeBudget: 4,
  actionPoints: 4,
  money: 0,
  progress: 0,
  users: 0,
  revenue: 0,
  literatureCount: 0,
  productVersion: 0,
  competitionRank: 0,
  reputation: 50,
  energy: 100,
  evidenceDiscipline: 50,
  aiDependence: 20,
  independence: 40,
  execution: 40,
  userUnderstanding: 20,
  technicalDebt: 10,
  academicDebt: 10,
  perfectionism: 50,
  riskTolerance: 50,
  mentorTrust: 50,
  teamTrust: 50,
  credibility: 50,
};

export type StateKey = VisibleStateKey | HiddenStateKey;

export const StatePatchSchema = z.record(z.string(), z.number());
export type StatePatch = z.infer<typeof StatePatchSchema>;
