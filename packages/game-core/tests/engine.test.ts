import { describe, it, expect, beforeEach } from "vitest";
import {
  createState,
  applyEffects,
  evaluateCondition,
  reducer,
  serializeSave,
  migrateSave,
  validateSave,
  SAVE_VERSION,
  shouldResolveEnding,
  resolveEnding,
  composeEnding,
  buildFateReview,
  newPlaythrough,
  mergeProfile,
  EMPTY_PROFILE,
  collectTriggeredEvents,
  nextDay,
  type GameState,
} from "../src/index.js";
import type { ContentIndex, Effect, Condition } from "@metis/content-schema";
import { relationshipTier } from "@metis/content-schema";

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
    "测试员",
    "pt_test",
  );
});

describe("Effect Engine (C001)", () => {
  it("set 覆盖数值", () => {
    applyEffects(state, [{ kind: "set", key: "money", value: 500 }], index, 1);
    expect(state.nums["money"]).toBe(500);
  });
  it("add 增加数值", () => {
    applyEffects(state, [{ kind: "add", key: "money", value: 100 }], index, 1);
    expect(state.nums["money"]).toBe(100);
  });
  it("subtract 减少数值", () => {
    state.nums["money"] = 50;
    applyEffects(state, [{ kind: "subtract", key: "money", value: 30 }], index, 1);
    expect(state.nums["money"]).toBe(20);
  });
  it("clamp 限制范围", () => {
    applyEffects(state, [{ kind: "set", key: "money", value: 999 }, { kind: "clamp", key: "money", max: 100 }], index, 1);
    expect(state.nums["money"]).toBe(100);
  });
  it("隐藏状态自动 clamp 0-100", () => {
    applyEffects(state, [{ kind: "add", key: "evidenceDiscipline", value: 999 }], index, 1);
    expect(state.nums["evidenceDiscipline"]).toBe(100);
    applyEffects(state, [{ kind: "subtract", key: "evidenceDiscipline", value: 999 }], index, 1);
    expect(state.nums["evidenceDiscipline"]).toBe(0);
  });
  it("setFlag / unsetFlag", () => {
    applyEffects(state, [{ kind: "setFlag", key: "used_fake_citation" }], index, 1);
    expect(state.flags["used_fake_citation"]).toBeDefined();
    applyEffects(state, [{ kind: "unsetFlag", key: "used_fake_citation" }], index, 1);
    expect(state.flags["used_fake_citation"]).toBeUndefined();
  });
  it("one-time flag 是永久标记", () => {
    const eff: Effect[] = [{ kind: "setFlag", key: "first_paid_user", once: true }];
    applyEffects(state, eff, index, 1);
    applyEffects(state, eff, index, 2); // 重复 set 不覆盖
    expect(state.flags["first_paid_user"]).toBeDefined();
    applyEffects(state, [{ kind: "unsetFlag", key: "first_paid_user" }], index, 3);
    expect(state.flags["first_paid_user"]).toBeDefined(); // once 不可 unset
  });
  it("flag 支持数值与字符串", () => {
    applyEffects(
      state,
      [
        { kind: "setFlag", key: "context_failure_count", value: 3 },
        { kind: "setFlag", key: "research_style", value: "quantitative" },
      ],
      index,
      1,
    );
    expect(state.flags["context_failure_count"]?.value).toBe(3);
    expect(state.flags["research_style"]?.value).toBe("quantitative");
  });
  it("addAsset 创建带版本与历史的资产", () => {
    applyEffects(state, [{ kind: "addAsset", assetType: "task_contract", name: "扫描契约", assetId: "tc1" }], index, 3);
    const asset = state.assets.find((a) => a.id === "tc1")!;
    expect(asset.type).toBe("task_contract");
    expect(asset.version).toBe(1);
    expect(asset.createdAtDay).toBe(3);
  });
  it("updateAsset bump 版本并记历史", () => {
    applyEffects(state, [{ kind: "addAsset", assetType: "goal", name: "G", assetId: "g1" }], index, 1);
    applyEffects(state, [{ kind: "updateAsset", assetId: "g1", content: "v2 内容", bumpVersion: true }], index, 5);
    const asset = state.assets.find((a) => a.id === "g1")!;
    expect(asset.version).toBe(2);
    expect(asset.history.length).toBe(2);
  });
  it("removeAsset 删除", () => {
    applyEffects(state, [{ kind: "addAsset", assetType: "prompt", name: "P", assetId: "p1" }], index, 1);
    applyEffects(state, [{ kind: "removeAsset", assetId: "p1" }], index, 1);
    expect(state.assets).toHaveLength(0);
  });
  it("unlockSkill / unlockKnowledge 去重", () => {
    applyEffects(
      state,
      [
        { kind: "unlockSkill", skillId: "context.handoff", level: 1 },
        { kind: "unlockSkill", skillId: "context.handoff", level: 1 },
        { kind: "unlockKnowledge", knowledgeId: "kc1" },
        { kind: "unlockKnowledge", knowledgeId: "kc1" },
      ],
      index,
      1,
    );
    expect(state.skills["context.handoff"]).toBe(1);
    expect(state.knowledge.filter((k) => k === "kc1")).toHaveLength(1);
  });
  it("relationship 限幅", () => {
    applyEffects(state, [{ kind: "relationship", characterId: "mentor", delta: 999 }], index, 1);
    expect(state.relationships["mentor"]).toBe(100);
  });
  it("achievement 去重", () => {
    applyEffects(
      state,
      [
        { kind: "achievement", achievementId: "first_handoff" },
        { kind: "achievement", achievementId: "first_handoff" },
      ],
      index,
      1,
    );
    expect(state.achievements).toHaveLength(1);
  });
  it("scheduleEvent 按 offsetDays 入队", () => {
    const r = applyEffects(state, [{ kind: "scheduleEvent", eventId: "crisis", offsetDays: 14 }], index, 3);
    expect(state.delayedQueue[0]!.scheduledDay).toBe(17);
    expect(r.scheduledDays).toEqual([17]);
  });
  it("scheduleEvent 支持绝对日 onDay", () => {
    applyEffects(state, [{ kind: "scheduleEvent", eventId: "crisis", onDay: 28 }], index, 3);
    expect(state.delayedQueue[0]!.scheduledDay).toBe(28);
  });
  it("拒绝非法资产类型", () => {
    applyEffects(state, [{ kind: "addAsset", assetType: "nonexistent", name: "x" } as unknown as Effect], index, 1);
    expect(state.assets).toHaveLength(0);
  });
});

describe("Condition Engine (C002)", () => {
  it("state 比较 gte/lt", () => {
    state.nums["money"] = 100;
    expect(evaluateCondition(state, { kind: "state", key: "money", op: "gte", value: 100 }, index)).toBe(true);
    expect(evaluateCondition(state, { kind: "state", key: "money", op: "lt", value: 100 }, index)).toBe(false);
  });
  it("flag 存在与期望值", () => {
    applyEffects(state, [{ kind: "setFlag", key: "validated_problem" }], index, 1);
    expect(evaluateCondition(state, { kind: "flag", key: "validated_problem" }, index)).toBe(true);
    expect(evaluateCondition(state, { kind: "flag", key: "validated_problem", expected: true }, index)).toBe(true);
    expect(evaluateCondition(state, { kind: "flag", key: "validated_problem", expected: false }, index)).toBe(false);
  });
  it("flagValue 数值比较", () => {
    applyEffects(state, [{ kind: "setFlag", key: "context_failure_count", value: 2 }], index, 1);
    expect(
      evaluateCondition(state, { kind: "flagValue", key: "context_failure_count", op: "gte", value: 2 }, index),
    ).toBe(true);
  });
  it("assetType 计数", () => {
    applyEffects(state, [{ kind: "addAsset", assetType: "dataset", name: "d1" }], index, 1);
    expect(evaluateCondition(state, { kind: "assetType", type: "dataset" }, index)).toBe(true);
    expect(evaluateCondition(state, { kind: "assetType", type: "dataset", minCount: 2 }, index)).toBe(false);
  });
  it("assetExists", () => {
    applyEffects(state, [{ kind: "addAsset", assetType: "goal", name: "g", assetId: "g9" }], index, 1);
    expect(evaluateCondition(state, { kind: "assetExists", assetId: "g9" }, index)).toBe(true);
  });
  it("skill 等级", () => {
    state.skills["loop.build_test_fix"] = 2;
    expect(evaluateCondition(state, { kind: "skill", id: "loop.build_test_fix", minLevel: 2 }, index)).toBe(true);
    expect(evaluateCondition(state, { kind: "skill", id: "loop.build_test_fix", minLevel: 3 }, index)).toBe(false);
  });
  it("relationship", () => {
    state.relationships["mentor"] = 80;
    expect(
      evaluateCondition(state, { kind: "relationship", characterId: "mentor", op: "gte", value: 80 }, index),
    ).toBe(true);
  });
  it("knowledge", () => {
    state.knowledge.push("kc9");
    expect(evaluateCondition(state, { kind: "knowledge", id: "kc9" }, index)).toBe(true);
  });
  it("and / or / not 组合", () => {
    state.nums["money"] = 100;
    const and: Condition = {
      kind: "and",
      conditions: [
        { kind: "state", key: "money", op: "gte", value: 50 },
        { kind: "not", condition: { kind: "flag", key: "bad" } },
      ],
    };
    expect(evaluateCondition(state, and, index)).toBe(true);
    const or: Condition = {
      kind: "or",
      conditions: [
        { kind: "state", key: "money", op: "lt", value: 50 },
        { kind: "flag", key: "nope" },
      ],
    };
    expect(evaluateCondition(state, or, index)).toBe(false);
  });
  it("undefined 条件视为真", () => {
    expect(evaluateCondition(state, undefined, index)).toBe(true);
  });
});

describe("Delayed Consequence Queue (C004)", () => {
  it("第 3 天的延迟在第 17 天触发（存档往返后仍在）", () => {
    applyEffects(state, [{ kind: "scheduleEvent", eventId: "d28_crisis", onDay: 17 }], index, 3);
    const saved = JSON.parse(JSON.stringify(state));
    const restored = saved as GameState;
    const { dueDelayed } = nextDay(restored, index);
    // 从 day3 推进不到 17
    expect(dueDelayed).toHaveLength(0);
    restored.nums["day"] = 16;
    const r2 = nextDay(restored, index);
    expect(r2.dayStarted).toBe(17);
    expect(r2.dueDelayed).toContain("d28_crisis");
  });
  it("带条件的延迟事件在条件不满足时不触发", () => {
    applyEffects(
      state,
      [{ kind: "scheduleEvent", eventId: "x", onDay: 2, condition: { kind: "flag", key: "nope" } }],
      index,
      1,
    );
    const { dueDelayed } = nextDay(state, index);
    expect(dueDelayed).toHaveLength(0);
    expect(state.delayedQueue).toHaveLength(1); // 保留在队列中
  });
});

describe("Trigger Engine (C003)", () => {
  it("day 触发按 phase 区分", () => {
    index.events.set("e1", {
      id: "e1",
      campaign: "research",
      day: 2,
      type: "story",
      trigger: { kind: "day", day: 2, phase: "start" },
      scene: { location: "lab", characters: [] },
      dialogue: [],
    });
    state.nums["day"] = 2;
    expect(collectTriggeredEvents(state, index, "dayStart")).toContain("e1");
    expect(collectTriggeredEvents(state, index, "dayEnd")).not.toContain("e1");
  });
  it("已访问事件不重复触发", () => {
    index.events.set("e1", {
      id: "e1",
      campaign: "research",
      day: 2,
      type: "story",
      trigger: { kind: "day", day: 2, phase: "start" },
      scene: { location: "lab", characters: [] },
      dialogue: [],
    });
    state.nums["day"] = 2;
    state.visitedEvents.push("e1");
    expect(collectTriggeredEvents(state, index, "dayStart")).not.toContain("e1");
  });
  it("state threshold 触发", () => {
    index.events.set("danger", {
      id: "danger",
      campaign: "research",
      day: 5,
      type: "system",
      trigger: { kind: "state", condition: { kind: "state", key: "academicDebt", op: "gte", value: 80 } },
      scene: { location: "lab", characters: [] },
      dialogue: [],
    });
    state.nums["academicDebt"] = 85;
    expect(collectTriggeredEvents(state, index, "dayStart")).toContain("danger");
  });
  it("asset 触发", () => {
    index.events.set("gotLib", {
      id: "gotLib",
      campaign: "research",
      day: 5,
      type: "story",
      trigger: { kind: "asset", assetType: "literature_library" },
      scene: { location: "lab", characters: [] },
      dialogue: [],
    });
    applyEffects(state, [{ kind: "addAsset", assetType: "literature_library", name: "L" }], index, 1);
    expect(collectTriggeredEvents(state, index, "dayStart")).toContain("gotLib");
  });
});

describe("Ending Resolver + Composer (C011/C012)", () => {
  function addEnding(id: string, priority: number, req: Condition, baseText: string, growth: unknown[] = []): void {
    index.endings.set(id, {
      id,
      campaign: "research",
      title: id,
      mainResult: id,
      requirements: req,
      priority,
      tier: "main",
      baseText,
      growthVariantRules: growth as never,
      characterEpilogueRules: [],
      projectFutureRules: [],
      specialFlagSections: [],
      specialTags: [],
      reflection: "r",
    });
  }
  it("高优先级优先", () => {
    addEnding("bad", 10, { kind: "always" }, "一般结局");
    addEnding("great", 50, { kind: "state", key: "progress", op: "gte", value: 80 }, "优秀结局");
    state.nums["progress"] = 90;
    expect(resolveEnding(state, index).id).toBe("great");
  });
  it("相同主结果不同状态 → 产出不同文本", () => {
    addEnding("pass", 10, { kind: "always" }, "你通过了。", [
      {
        dimension: "independence",
        variants: [
          { gte: 70, text: "评委看到了独立判断。" },
          { lte: 30, text: "评委看到了工具的影子。" },
        ],
      },
    ]);
    state.nums["independence"] = 90;
    const a = composeEnding(state, resolveEnding(state, index), index, new Map());
    state.nums["independence"] = 10;
    const b = composeEnding(state, resolveEnding(state, index), index, new Map());
    expect(a.fingerprint).not.toBe(b.fingerprint);
    expect(a.sections.some((s) => s.text.includes("独立判断"))).toBe(true);
    expect(b.sections.some((s) => s.text.includes("工具的影子"))).toBe(true);
  });
  it("NPC 后日谈按关系分档", () => {
    index.endings.set("e", {
      id: "e",
      campaign: "research",
      title: "t",
      mainResult: "m",
      requirements: { kind: "always" },
      priority: 1,
      tier: "main",
      baseText: "b",
      growthVariantRules: [],
      characterEpilogueRules: [
        { characterId: "mentor", positive: "导师赞许", neutral: "导师点头", negative: "导师失望" },
      ],
      projectFutureRules: [],
      specialFlagSections: [],
      specialTags: [],
      reflection: "r",
    });
    state.relationships["mentor"] = 90;
    const a = composeEnding(state, index.endings.get("e")!, index, new Map());
    state.relationships["mentor"] = 10;
    const b = composeEnding(state, index.endings.get("e")!, index, new Map());
    expect(a.sections.some((s) => s.text.includes("赞许"))).toBe(true);
    expect(b.sections.some((s) => s.text.includes("失望"))).toBe(true);
    expect(relationshipTier(90)).toBe("deep_trust");
  });
  it("时间耗尽触发结算判断", () => {
    index.campaigns.set("research_30d_proposal", {
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
    });
    state.nums["day"] = 31;
    expect(shouldResolveEnding(state, index).ended).toBe(true);
    state.nums["day"] = 15;
    expect(shouldResolveEnding(state, index).ended).toBe(false);
  });
});

describe("Save (C015-C017)", () => {
  it("序列化包含三个版本号", () => {
    const env = serializeSave(state, { slot: 1, label: "手动", contentVersion: "1.0.0", appVersion: "1.0.0" });
    expect(env.saveVersion).toBe(SAVE_VERSION);
    expect(env.contentVersion).toBe("1.0.0");
    expect(env.appVersion).toBe("1.0.0");
  });
  it("save → load 往返保持状态一致", () => {
    applyEffects(state, [{ kind: "setFlag", key: "f1" }, { kind: "addAsset", assetType: "goal", name: "g" }], index, 1);
    const env = serializeSave(state, { slot: 2, label: "x", contentVersion: "1", appVersion: "1" });
    const json = JSON.parse(JSON.stringify(env));
    const r = validateSave(json);
    expect(r.ok).toBe(true);
    expect(r.envelope!.state.flags["f1"]).toBeDefined();
    expect(r.envelope!.state.assets).toHaveLength(1);
  });
  it("旧版本存档可迁移", () => {
    const env = { saveVersion: 0, contentVersion: "0", appVersion: "0", slot: 1, label: "", savedAt: "", state };
    const migrated = migrateSave(env);
    expect(migrated.saveVersion).toBe(SAVE_VERSION);
  });
  it("损坏存档被拒绝", () => {
    expect(validateSave(null).ok).toBe(false);
    expect(validateSave({}).ok).toBe(false);
    expect(validateSave({ saveVersion: 99, state: {} }).ok).toBe(false);
  });
});

describe("Fate Review (C013)", () => {
  it("返回关键决定并带学习点", () => {
    state.decisionLog.push(
      {
        day: 8,
        eventId: "ev_fake_citation",
        eventTitle: "假引用事件",
        choiceId: "accept",
        choiceText: "先放进文献表",
        delayed: true,
        learningPoint: "独立验证来源",
      },
      {
        day: 12,
        eventId: "ev_gap",
        eventTitle: "gap 生成",
        choiceId: "verify",
        choiceText: "建立验证表",
        delayed: false,
        learningPoint: "失败验证也是进展",
      },
    );
    const review = buildFateReview(state, index);
    expect(review.length).toBeGreaterThanOrEqual(2);
    expect(review[0]!.learningPoint).toBe("独立验证来源");
    expect(review[0]!.day).toBe(8);
  });
});

describe("Playthrough / NG+ (C014)", () => {
  it("mergeProfile 收集已发现结局", () => {
    state.ended = true;
    state.endingId = "pass_good";
    const p = mergeProfile(EMPTY_PROFILE, state);
    expect(p.discoveredEndings).toContain("pass_good");
    expect(p.completedCampaigns).toContain("research_30d_proposal");
  });
  it("NG+ 资格与加成", () => {
    const p = mergeProfile(EMPTY_PROFILE, state);
    const idx = index;
    idx.campaigns.set("research_30d_proposal", {
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
    });
    const s1 = newPlaythrough(idx, "research_30d_proposal", "a", p, true);
    expect(s1.ngPlus).toBe(0); // 未完成过 → 不给 NG+
    p.completedCampaigns.push("research_30d_proposal");
    const s2 = newPlaythrough(idx, "research_30d_proposal", "a", p, true);
    expect(s2.ngPlus).toBe(1);
    expect(s2.nums["timeBudget"]).toBeGreaterThan(4);
  });
});

describe("Reducer 集成", () => {
  it("choose 后 autosave 标记", () => {
    index.events.set("e1", {
      id: "e1",
      campaign: "research",
      day: 1,
      type: "decision",
      keyDecision: true,
      trigger: { kind: "manual" },
      scene: { location: "lab", characters: [] },
      dialogue: [],
      choices: [{ id: "a", text: "选项A" }, { id: "b", text: "选项B" }],
    });
    state.currentEventId = "e1";
    const r = reducer(state, { type: "choose", choiceId: "a" }, index);
    expect(r.error).toBeUndefined();
    expect(r.autosave).toBe(true);
    expect(r.state.decisionLog.some((d) => d.choiceId === "a")).toBe(true);
  });
  it("cost 不足被拒绝且状态不变", () => {
    index.events.set("e1", {
      id: "e1",
      campaign: "research",
      day: 1,
      type: "decision",
      trigger: { kind: "manual" },
      scene: { location: "lab", characters: [] },
      dialogue: [],
      choices: [{ id: "costly", text: "花钱", cost: { actionPoints: 99 } }],
    });
    state.currentEventId = "e1";
    const before = structuredClone(state);
    const r = reducer(state, { type: "choose", choiceId: "costly" }, index);
    expect(r.error).toBeDefined();
    expect(r.state).toEqual(before);
  });
  it("endDay 推进日期并恢复行动点", () => {
    state.nums["actionPoints"] = 0;
    const r = reducer(state, { type: "endDay" }, index);
    expect(r.error).toBeUndefined();
    expect(r.state.nums["day"]).toBe(2);
    expect(r.state.nums["actionPoints"]).toBeGreaterThan(0);
  });
});
