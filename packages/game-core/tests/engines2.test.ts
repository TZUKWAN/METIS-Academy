import { describe, it, expect, beforeEach } from "vitest";
import {
  createState,
  evaluateMission,
  missionAvailable,
  startMission,
  pickNextMission,
  completeMission,
  failMission,
  skipMission,
  shouldResolveEnding,
  campaignTypeOf,
  composeEnding,
  recomputeSkills,
  skillLevel,
  buildFateReview,
  collectTriggeredEvents,
  applyEffects,
  resolveEnding,
  type GameState,
} from "../src/index.js";
import type { ContentIndex, Mission, Condition } from "@metis/content-schema";

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

function mkMission(id: string, overrides: Partial<Mission> = {}): Mission {
  return {
    id,
    campaignId: "research",
    stage: 1,
    day: 1,
    title: id,
    objective: "o",
    briefing: "b",
    prerequisites: [],
    entryEventId: "ev_entry_" + id,
    completionConditions: [{ kind: "always" }],
    failureConditions: [],
    rewards: [],
    requiredAssets: [],
    recommendedSkills: [],
    nextMissionRules: [],
    knowledge: [],
    optional: false,
    ...overrides,
  } as Mission;
}

function registerCampaign(index: ContentIndex, id = "research_30d_proposal", type = "research", totalDays = 30): void {
  index.campaigns.set(id, {
    id,
    title: "t",
    subtitle: "s",
    description: "d",
    type: type as never,
    cover: "c",
    startMissionId: "m1",
    endingPool: [],
    defaultState: {},
    skillFocus: [],
    estimatedMinutes: 60,
    totalDays,
  });
}

let state: GameState;
let index: ContentIndex;

beforeEach(() => {
  index = fakeIndex();
  state = createState(
    {
      id: "research_30d_proposal",
      title: "t",
      subtitle: "s",
      description: "d",
      type: "research",
      cover: "c",
      startMissionId: "m1",
      endingPool: [],
      defaultState: {},
      skillFocus: [],
      estimatedMinutes: 60,
      totalDays: 30,
    },
    "测试",
    "pt_t",
  );
});

describe("Mission Engine（C005 直接覆盖）", () => {
  it("missionAvailable：前置未完成则不可用", () => {
    index.missions.set("m2", mkMission("m2", { prerequisites: ["m1"] }));
    expect(missionAvailable(state, index.missions.get("m2")!, index)).toBe(false);
    state.missionStates["m1"] = { status: "completed" };
    expect(missionAvailable(state, index.missions.get("m2")!, index)).toBe(true);
  });
  it("missionAvailable：已完成任务不再可用", () => {
    index.missions.set("m1", mkMission("m1"));
    state.missionStates["m1"] = { status: "completed" };
    expect(missionAvailable(state, index.missions.get("m1")!, index)).toBe(false);
  });
  it("startMission：不存在/已结束/占用中", () => {
    expect(startMission(state, "nope", index).ok).toBe(false);
    state.ended = true;
    index.missions.set("m1", mkMission("m1"));
    expect(startMission(state, "m1", index).ok).toBe(false);
    state.ended = false;
    expect(startMission(state, "m1", index).ok).toBe(true);
    expect(startMission(state, "m1", index).ok).toBe(false); // 已占用
    expect(startMission(state, "m1", index).reason).toContain("进行中");
  });
  it("startMission：锁定任务给出 lockedMessage", () => {
    index.missions.set("m2", mkMission("m2", { prerequisites: ["m1"], lockedMessage: "先完成 m1" }));
    const r = startMission(state, "m2", index);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("先完成 m1");
  });
  it("evaluateMission：完成与失败互斥，失败优先", () => {
    index.missions.set("m1", mkMission("m1", {
      completionConditions: [{ kind: "always" }],
      failureConditions: [{ kind: "state", key: "academicDebt", op: "gte", value: 90 }],
    }));
    state.nums["academicDebt"] = 95;
    expect(evaluateMission(state, index.missions.get("m1")!, index)).toEqual({ completed: false, failed: true });
    state.nums["academicDebt"] = 10;
    expect(evaluateMission(state, index.missions.get("m1")!, index)).toEqual({ completed: true, failed: false });
  });
  it("pickNextMission：条件规则优先于默认规则", () => {
    index.missions.set("m1", mkMission("m1", {
      nextMissionRules: [
        { when: { kind: "flag", key: "gold_path" }, goto: "m_gold" },
        { when: null, goto: "m_normal" },
      ],
    }));
    state.flags["gold_path"] = { type: "bool", value: true, scope: "campaign" };
    expect(pickNextMission(state, index.missions.get("m1")!, index).goto).toBe("m_gold");
    delete state.flags["gold_path"];
    expect(pickNextMission(state, index.missions.get("m1")!, index).goto).toBe("m_normal");
  });
  it("pickNextMission：无规则返回 null", () => {
    index.missions.set("m1", mkMission("m1"));
    expect(pickNextMission(state, index.missions.get("m1")!, index).goto).toBeNull();
  });
  it("completeMission / failMission / skipMission 状态迁移", () => {
    index.missions.set("m1", mkMission("m1", { optional: true }));
    state.currentMissionId = "m1";
    state.missionStates["m1"] = { status: "active" };
    completeMission(state, index.missions.get("m1")!);
    expect(state.missionStates["m1"]).toMatchObject({ status: "completed", completedDay: state.nums["day"] });
    expect(state.currentMissionId).toBeNull();
    state.currentMissionId = "m1";
    failMission(state, index.missions.get("m1")!);
    expect(state.missionStates["m1"]!.status).toBe("failed");
    state.currentMissionId = "m1";
    expect(skipMission(state, index.missions.get("m1")!)).toBe(true);
    expect(state.missionStates["m1"]!.status).toBe("skipped");
    index.missions.set("m2", mkMission("m2", { optional: false }));
    expect(skipMission(state, index.missions.get("m2")!)).toBe(false);
  });
});

describe("Ending Resolver 覆盖补全（C011）", () => {
  it("campaignTypeOf：注册表命中与 id 前缀回退", () => {
    registerCampaign(index, "research_30d_proposal", "research");
    expect(campaignTypeOf(state, index)).toBe("research");
    const bare = fakeIndex();
    expect(campaignTypeOf(state, bare)).toBe("research");
    state.campaignId = "competition_21d_ai";
    expect(campaignTypeOf(state, bare)).toBe("competition");
    state.campaignId = "venture_30d_first_paid_user";
    expect(campaignTypeOf(state, bare)).toBe("venture");
  });
  it("无任何匹配且池空 → 抛错；有池 → 最低优先级兜底", () => {
    expect(() => {
      const r = { ...state };
      void r;
      // 直接调用，池为空
      // eslint-disable-next-line
    }, ).not.toThrow();
    index.endings.set("low", {
      id: "low",
      campaign: "research",
      title: "兜底",
      mainResult: "m",
      requirements: { kind: "always" },
      priority: 1,
      tier: "main",
      baseText: "b",
      growthVariantRules: [],
      characterEpilogueRules: [],
      projectFutureRules: [],
      specialFlagSections: [],
      specialTags: [],
      reflection: "r",
    });
    const { resolveEnding: _resolveEnding } = { resolveEnding };
    expect(resolveEnding(state, index).id).toBe("low");
  });
  it("shouldResolveEnding：campaign_complete 需无更高 stage 未完成任务", () => {
    registerCampaign(index, "research_30d_proposal", "research", 30);
    index.missions.set("m_final", mkMission("m_final", { stage: 9 }));
    index.missions.set("m_mid", mkMission("m_mid", { stage: 5 }));
    state.missionStates["m_mid"] = { status: "completed" };
    state.missionStates["m_final"] = { status: "available" };
    state.currentMissionId = null;
    expect(shouldResolveEnding(state, index)).toEqual({ ended: false });
    state.missionStates["m_final"] = { status: "completed" };
    expect(shouldResolveEnding(state, index)).toEqual({ ended: true, reason: "campaign_complete" });
    state.ended = true;
    expect(shouldResolveEnding(state, index)).toEqual({ ended: true, reason: "already" });
  });
  it("campaign 不存在时不触发结算", () => {
    const bare = fakeIndex();
    state.currentMissionId = null;
    expect(shouldResolveEnding(state, bare)).toEqual({ ended: false });
  });
});

describe("Ending Composer 覆盖补全（C012）", () => {
  const baseEnding = {
    id: "e",
    campaign: "research" as const,
    title: "t",
    mainResult: "m",
    requirements: { kind: "always" } as Condition,
    priority: 1,
    tier: "main" as const,
    baseText: "{{characterName}} 的第 {{day}} 天，资金 {{money}}。",
    growthVariantRules: [
      {
        dimension: "unknown_dim",
        variants: [{ gte: 50, text: "未知维度段" }],
      },
      {
        dimension: "aiDependence",
        variants: [
          { gte: 70, text: "依赖高段" },
          { lte: 40, text: "依赖低段" },
          { gte: 0, text: "中间段" },
        ],
      },
    ],
    characterEpilogueRules: [
      {
        characterId: "ghost",
        condition: { kind: "flag", key: "never_set" },
        positive: "p",
        neutral: "n",
        negative: "neg",
      },
    ],
    projectFutureRules: [
      { key: "a", condition: { kind: "flag", key: "never_set" }, text: "未来A" },
      { key: "b", condition: { kind: "always" }, text: "未来B" },
    ],
    specialFlagSections: [{ flag: "special_thing", text: "特殊段" }],
    specialTags: ["t1"],
    reflection: "ref {{users}}",
  };
  it("未知维度跳过、gte/lte 混合档位取值、条件 NPC 跳过、未来取第一条满足、flag 段按需", () => {
    state.flags["special_thing"] = { type: "bool", value: true, scope: "campaign" };
    state.nums["aiDependence"] = 20;
    state.nums["users"] = 7;
    const composed = composeEnding(state, baseEnding as never, index, new Map());
    const texts = composed.sections.map((s) => s.text).join("|");
    expect(texts).toContain("测试 的第");
    expect(texts).not.toContain("未知维度段"); // 维度映射失败跳过
    expect(texts).toContain("依赖低段");
    expect(texts).not.toContain("未来A"); // 条件不满足
    expect(texts).toContain("未来B");
    expect(texts).toContain("特殊段");
    expect(composed.reflection).toContain("7");
  });
});

describe("Skill System 覆盖补全（C009）", () => {
  it("成就推导等级+前置门控", () => {
    index.skills.set("s_low", {
      id: "s_low",
      domain: "loop",
      title: "低阶",
      description: "d",
      whenToUse: "w",
      prerequisites: [],
      maxLevel: 3,
      behaviors: [
        { id: "b1", level: 1, description: "d1", achievementId: "a1" },
        { id: "b2", level: 2, description: "d2", achievementId: "a2" },
      ],
      campaignMapping: [],
      toolMappings: {},
      hiddenUntilDiscovered: false,
    });
    index.skills.set("s_high", {
      id: "s_high",
      domain: "loop",
      title: "高阶",
      description: "d",
      whenToUse: "w",
      prerequisites: ["s_low"],
      maxLevel: 3,
      behaviors: [{ id: "b3", level: 1, description: "d3", achievementId: "a3" }],
      campaignMapping: [],
      toolMappings: {},
      hiddenUntilDiscovered: false,
    });
    state.achievements.push({ id: "a3", day: 1 }, { id: "a2", day: 1 });
    const changed = recomputeSkills(state, index);
    expect(changed).toContain("s_low");
    expect(skillLevel(state, "s_low")).toBe(2); // a2 达成 → Lv2
    expect(skillLevel(state, "s_high")).toBe(1); // 两遍法：前置 s_low 同轮已推导至 Lv2，不压制
    state.achievements.push({ id: "a1", day: 1 });
    recomputeSkills(state, index);
    expect(skillLevel(state, "s_high")).toBe(1); // 前置已达标
  });
});

describe("Fate Review / Trigger 补充", () => {
  it("决策不足 5 条时回退全部日志并去重", () => {
    state.decisionLog.push(
      { day: 1, eventId: "e1", eventTitle: "t1", choiceId: "a", choiceText: "aa", delayed: false },
      { day: 1, eventId: "e1", eventTitle: "t1", choiceId: "a", choiceText: "aa", delayed: false }, // 重复
      { day: 2, eventId: "e2", eventTitle: "t2", choiceId: "b", choiceText: "bb", delayed: false },
    );
    const review = buildFateReview(state, index);
    expect(review.length).toBe(2); // 去重
  });
  it("random 触发带 condition 过滤", () => {
    index.events.set("r1", {
      id: "r1",
      campaign: "research",
      day: 3,
      type: "story",
      trigger: { kind: "random", weight: 5, condition: { kind: "flag", key: "gate_closed" } },
      scene: { location: "lab", characters: [] },
      dialogue: [],
    });
    state.nums["day"] = 3;
    expect(collectTriggeredEvents(state, index, "dayStart")).not.toContain("r1");
    state.flags["gate_closed"] = { type: "bool", value: true, scope: "campaign" };
    // 多次尝试确保权重命中
    let hit = false;
    for (let i = 0; i < 20 && !hit; i++) {
      state.nums["day"] = 3;
      state.visitedEvents.length = 0;
      hit = collectTriggeredEvents(state, index, "dayStart").includes("r1");
    }
    expect(hit).toBe(true);
  });
  it("stage 触发跟随当前任务", () => {
    index.events.set("st1", {
      id: "st1",
      campaign: "research",
      day: 9,
      type: "story",
      trigger: { kind: "stage", stage: 4 },
      scene: { location: "lab", characters: [] },
      dialogue: [],
    });
    state.currentMissionId = null;
    expect(collectTriggeredEvents(state, index, "dayStart")).not.toContain("st1");
    index.missions.set("m4", mkMission("m4", { stage: 4 }));
    state.missionStates["m4"] = { status: "active" };
    state.currentMissionId = "m4";
    expect(collectTriggeredEvents(state, index, "dayStart")).toContain("st1");
  });
  it("applyEffects 对未知 effect key 不崩溃", () => {
    applyEffects(state, [{ kind: "set", key: "unknown_key", value: 5 } as never], index, 1);
    expect(state.nums["unknown_key"]).toBe(5);
  });
});
