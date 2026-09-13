import { describe, it, expect, beforeEach } from "vitest";
import {
  createState,
  reducer,
  composeEnding,
  resolveEnding,
  type GameState,
} from "../src/index.js";
import type { ContentIndex } from "@metis/content-schema";

function fakeIndex(): ContentIndex {
  return {
    campaigns: new Map(),
    missions: new Map(),
    events: new Map(),
    endings: new Map(),
    skills: new Map(),
    knowledge: new Map(),
    characters: new Map(),
  };
}

function setupGame(): { state: GameState; index: ContentIndex } {
  const index = fakeIndex();
  index.campaigns.set("research_30d_proposal", {
    id: "research_30d_proposal", title: "t", subtitle: "s", description: "d",
    type: "research", cover: "c", startMissionId: "m1", endingPool: [],
    defaultState: {}, skillFocus: [], estimatedMinutes: 60, totalDays: 30,
  });
  index.missions.set("m1", {
    id: "m1", campaignId: "research", stage: 1, day: 1,
    title: "M1", objective: "o", briefing: "b", prerequisites: [],
    entryEventId: "ev1", completionConditions: [{ kind: "always" }],
    failureConditions: [], rewards: [], requiredAssets: [], recommendedSkills: [],
    nextMissionRules: [{ when: null, goto: "m2" }], knowledge: [], optional: false,
  });
  index.missions.set("m2", {
    id: "m2", campaignId: "research", stage: 2, day: 2,
    title: "M2", objective: "o2", briefing: "b2", prerequisites: ["m1"],
    entryEventId: "ev2", completionConditions: [{ kind: "always" }],
    failureConditions: [], rewards: [], requiredAssets: [], recommendedSkills: [],
    nextMissionRules: [], knowledge: [], optional: false,
  });
  index.events.set("ev1", {
    id: "ev1", campaign: "research", day: 1, type: "story",
    trigger: { kind: "missionEntry", mission: "m1" },
    scene: { location: "lab", characters: [] },
    dialogue: [{ speaker: "S", text: "start" }],
    next: "ev1_decision",
  });
  index.events.set("ev1_decision", {
    id: "ev1_decision", campaign: "research", day: 1, type: "decision",
    keyDecision: true, trigger: { kind: "manual" },
    scene: { location: "lab", characters: [] },
    choices: [
      { id: "opt_a", text: "A", hiddenEffects: [{ kind: "add", key: "execution", value: 5 }], visibleResponse: "did A" },
      { id: "opt_b", text: "B", visibleResponse: "did B" },
    ],
  });
  index.events.set("ev2", {
    id: "ev2", campaign: "research", day: 2, type: "decision",
    trigger: { kind: "missionEntry", mission: "m2" },
    scene: { location: "lab", characters: [] },
    choices: [{ id: "go", text: "Go" }],
  });

  const state = createState(index.campaigns.get("research_30d_proposal")!, "Test", "pt_r");
  return { state, index };
}

describe("Reducer 深度覆盖", () => {
  let { state, index } = setupGame();

  beforeEach(() => {
    ({ state, index } = setupGame());
  });

  it("startMission → advance → choose → complete → nextMission 链", () => {
    let r = reducer(state, { type: "startMission", missionId: "m1" }, index);
    expect(r.error).toBeUndefined();
    expect(r.state.currentMissionId).toBe("m1");
    // advance through story
    r = reducer(r.state, { type: "advance" }, index);
    // choose option
    r = reducer(r.state, { type: "choose", choiceId: "opt_a" }, index);
    expect(r.state.nums["execution"]).toBe(45); // 40 + 5
    // m1 completes (always true) → goto m2
    expect(r.state.missionStates["m1"]?.status).toBe("completed");
    expect(r.state.missionStates["m2"]?.status).toBe("available");
  });

  it("choose with skillCheck 使用 success/failure 分支", () => {
    index.events.set("ev_sk", {
      id: "ev_sk", campaign: "research", day: 3, type: "decision",
      trigger: { kind: "manual" }, scene: { location: "lab", characters: [] },
      choices: [{
        id: "risky", text: "Risky",
        skillCheck: {
          skillId: "sk1", difficulty: 0,
          onSuccess: { response: "成功！", effects: [{ kind: "add", key: "credibility", value: 10 }] },
          onFailure: { response: "失败！", effects: [{ kind: "subtract", key: "credibility", value: 5 }] },
        },
      }],
    });
    state.currentEventId = "ev_sk";
    const r = reducer(state, { type: "choose", choiceId: "risky" }, index);
    // difficulty 0 → always pass
    expect(r.state.lastChoiceSkillCheck?.passed).toBe(true);
    expect(r.state.lastFeedback).toBe("成功！");
  });

  it("aiBranch 走 fallback 路径", () => {
    index.events.set("ev_ai", {
      id: "ev_ai", campaign: "research", day: 4, type: "decision",
      trigger: { kind: "manual" }, scene: { location: "lab", characters: [] },
      choices: [{
        id: "ai_check", text: "AI",
        aiBranch: {
          key: "test",
          onPass: { response: "AI PASS" },
          onFail: { response: "AI FAIL" },
          fallbackCondition: { kind: "state", key: "credibility", op: "gte", value: 50 },
        },
      }],
    });
    state.currentEventId = "ev_ai";
    const r = reducer(state, { type: "choose", choiceId: "ai_check" }, index);
    // credibility starts at 50 → gte 50 → pass
    expect(r.state.lastFeedback).toBe("AI PASS");
  });

  it("cost 不足时选择被拒绝", () => {
    index.events.set("ev_cost", {
      id: "ev_cost", campaign: "research", day: 5, type: "decision",
      trigger: { kind: "manual" }, scene: { location: "lab", characters: [] },
      choices: [{ id: "expensive", text: "花钱", cost: { money: 99999 } }],
    });
    state.currentEventId = "ev_cost";
    const r = reducer(state, { type: "choose", choiceId: "expensive" }, index);
    expect(r.error).toContain("不足");
  });

  it("requirements 不满足时选择被拒绝", () => {
    index.events.set("ev_req", {
      id: "ev_req", campaign: "research", day: 6, type: "decision",
      trigger: { kind: "manual" }, scene: { location: "lab", characters: [] },
      choices: [{
        id: "locked", text: "需资产",
        requirements: { kind: "assetType", type: "nonexistent", minCount: 1 },
        requirementHint: "需要特定资产",
      }],
    });
    state.currentEventId = "ev_req";
    const r = reducer(state, { type: "choose", choiceId: "locked" }, index);
    expect(r.error).toBe("需要特定资产");
  });

  it("relationship + achievement 通过 effects 正常工作", () => {
    index.events.set("ev_rel", {
      id: "ev_rel", campaign: "research", day: 7, type: "decision",
      trigger: { kind: "manual" }, scene: { location: "lab", characters: [] },
      choices: [{
        id: "help", text: "帮助",
        hiddenEffects: [
          { kind: "relationship", characterId: "npc1", delta: 10 },
          { kind: "achievement", achievementId: "ach_help" },
          { kind: "unlockKnowledge", knowledgeId: "kc_test" },
        ],
      }],
    });
    state.currentEventId = "ev_rel";
    const r = reducer(state, { type: "choose", choiceId: "help" }, index);
    expect(r.state.relationships["npc1"]).toBe(60); // 50 + 10
    expect(r.state.knowledge).toContain("kc_test");
    expect(r.state.achievements.some((a) => a.id === "ach_help")).toBe(true);
  });

  it("endDay 恢复行动点 + 推进日期", () => {
    state.nums["actionPoints"] = 0;
    state.nums["day"] = 5;
    state.nums["energy"] = 80;
    const r = reducer(state, { type: "endDay" }, index);
    expect(r.state.nums["day"]).toBe(6);
    expect(r.state.nums["actionPoints"]).toBeGreaterThan(0);
  });

  it("skipMission 标记为 skipped", () => {
    index.missions.set("m_opt", {
      id: "m_opt", campaignId: "research", stage: 2, day: 3,
      title: "Optional", objective: "o", briefing: "b", prerequisites: [],
      entryEventId: "ev_opt", completionConditions: [{ kind: "always" }],
      failureConditions: [], rewards: [], requiredAssets: [], recommendedSkills: [],
      nextMissionRules: [], knowledge: [], optional: true,
    });
    const r = reducer(state, { type: "skipMission", missionId: "m_opt" }, index);
    expect(r.state.missionStates["m_opt"]?.status).toBe("skipped");
  });

  it("dismissFeedback 清除反馈", () => {
    state.lastFeedback = "some text";
    const r = reducer(state, { type: "dismissFeedback" }, index);
    expect(r.state.lastFeedback).toBeNull();
  });

  it("已结束后 reducer 拒绝操作", () => {
    state.ended = true;
    const r = reducer(state, { type: "advance" }, index);
    expect(r.state.ended).toBe(true);
  });

  it("delayed consequence 从队列触发", () => {
    index.events.set("ev_delayed", {
      id: "ev_delayed", campaign: "research", day: 10, type: "story",
      trigger: { kind: "delayed" },
      scene: { location: "lab", characters: [] },
      dialogue: [{ speaker: "S", text: "delayed fired" }],
    });
    applyToQueue(state, "ev_delayed", 3);
    state.nums["day"] = 2;
    const r = reducer(state, { type: "endDay" }, index);
    // day advances to 3, delayed should fire
    const found = r.state.eventLog.some((l) => l.eventId === "ev_delayed") ||
                 r.state.pendingEvents.includes("ev_delayed") ||
                 r.state.currentEventId === "ev_delayed";
    expect(found).toBe(true);
  });

  function applyToQueue(s: GameState, eventId: string, day: number): void {
    s.delayedQueue.push({ id: "dq1", sourceEventId: "src", eventId, scheduledDay: day });
  }
});
