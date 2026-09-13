import { describe, it, expect } from "vitest";
import {
  ConditionSchema,
  EffectSchema,
  ChoiceSchema,
  EventSchema,
  MissionSchema,
  CampaignSchema,
  EndingSchema,
  SkillSchema,
  KnowledgeAtomSchema,
  CharacterSchema,
  parseContentDoc,
  validateCrossRefs,
  buildIndex,
} from "../src/index.js";

const condition = { kind: "state", key: "money", op: "gte", value: 100 };

describe("ConditionSchema", () => {
  it("接受合法 state 条件", () => {
    expect(ConditionSchema.safeParse(condition).success).toBe(true);
  });
  it("接受 and/or/not 嵌套", () => {
    const c = {
      kind: "and",
      conditions: [
        { kind: "flag", key: "x" },
        { kind: "not", condition: { kind: "or", conditions: [{ kind: "always" }] } },
      ],
    };
    expect(ConditionSchema.safeParse(c).success).toBe(true);
  });
  it("拒绝非法 op", () => {
    expect(ConditionSchema.safeParse({ kind: "state", key: "money", op: "between", value: 1 }).success).toBe(false);
  });
  it("拒绝 eval 形式（字符串条件）", () => {
    expect(ConditionSchema.safeParse("money > 100").success).toBe(false);
  });
});

describe("EffectSchema (C001 数据层)", () => {
  const cases = [
    { kind: "set", key: "money", value: 10 },
    { kind: "add", key: "progress", value: 5 },
    { kind: "subtract", key: "money", value: 3 },
    { kind: "clamp", key: "credibility", min: 0, max: 100 },
    { kind: "setFlag", key: "used_fake_citation", value: true, once: true, scope: "campaign" },
    { kind: "unsetFlag", key: "validated_problem" },
    { kind: "addAsset", assetType: "task_contract", name: "扫描契约" },
    { kind: "removeAsset", assetId: "a1" },
    { kind: "updateAsset", assetId: "a1", content: "v2", bumpVersion: true },
    { kind: "unlockSkill", skillId: "verification.check" },
    { kind: "unlockKnowledge", knowledgeId: "kc1" },
    { kind: "relationship", characterId: "mentor", delta: 5 },
    { kind: "achievement", achievementId: "first_handoff" },
    {
      kind: "scheduleEvent",
      eventId: "research_d28_citation_crisis",
      offsetDays: 18,
      condition,
    },
  ];
  it.each(cases.map((c) => [c.kind, c]))("支持 %s", (_k, effect) => {
    expect(EffectSchema.safeParse(effect).success).toBe(true);
  });
  it("拒绝未知资产类型", () => {
    expect(EffectSchema.safeParse({ kind: "addAsset", assetType: "magic", name: "x" }).success).toBe(false);
  });
});

describe("ChoiceSchema (B004)", () => {
  it("支持 requirements/cost/hiddenEffects/delayed/skillCheck/aiBranch/assetRequirements", () => {
    const choice = {
      id: "verify",
      text: "去原始数据库核查",
      requirements: condition,
      cost: { actionPoints: 1, money: 0 },
      assetRequirements: [{ type: "literature_library", minCount: 1 }],
      visibleResponse: "你查到了原始论文。",
      hiddenEffects: [{ kind: "add", key: "evidenceDiscipline", value: 10 }],
      delayed: [{ eventId: "e2", offsetDays: 18 }],
      skillCheck: {
        skillId: "verification.check",
        difficulty: 40,
        onSuccess: { effects: [] },
        onFailure: { effects: [] },
      },
      aiBranch: {
        key: "contract_quality",
        onPass: { effects: [] },
        onFail: { effects: [] },
        fallbackCondition: { kind: "always" },
      },
      unlockKnowledge: ["kc_verification"],
      next: "e2",
    };
    expect(ChoiceSchema.safeParse(choice).success).toBe(true);
  });
  it("拒绝过长文本", () => {
    expect(ChoiceSchema.safeParse({ id: "x", text: "a".repeat(200) }).success).toBe(false);
  });
});

describe("MissionSchema (B002)", () => {
  const base = {
    id: "m1",
    campaignId: "research",
    stage: 1,
    day: 1,
    title: "模糊问题",
    objective: "把模糊需求变成可研究问题",
    briefing: "导师给了一句话需求。",
    entryEventId: "ev1",
  };
  it("正常 mission", () => {
    const m = {
      ...base,
      completionConditions: [{ kind: "assetType", type: "research_brief", minCount: 1 }],
      nextMissionRules: [{ when: null, goto: "m2" }],
    };
    expect(MissionSchema.safeParse(m).success).toBe(true);
  });
  it("缺 id → 失败", () => {
    const { id: _id, ...noId } = base;
    expect(MissionSchema.safeParse({ ...noId, completionConditions: [{ kind: "always" }] }).success).toBe(false);
  });
  it("非法 day（负数/小数）→ 失败", () => {
    expect(
      MissionSchema.safeParse({ ...base, day: -1, completionConditions: [{ kind: "always" }] }).success,
    ).toBe(false);
    expect(
      MissionSchema.safeParse({ ...base, day: 1.5, completionConditions: [{ kind: "always" }] }).success,
    ).toBe(false);
  });
  it("空 completion → 失败", () => {
    expect(MissionSchema.safeParse({ ...base, completionConditions: [] }).success).toBe(false);
  });
  it("非法 rule（goto 缺失）→ 失败", () => {
    expect(
      MissionSchema.safeParse({ ...base, completionConditions: [{ kind: "always" }], nextMissionRules: [{ when: null }] })
        .success,
    ).toBe(false);
  });
});

describe("EventSchema (B003)", () => {
  const base = {
    id: "ev1",
    campaign: "research",
    day: 8,
    type: "decision",
    trigger: { kind: "missionEntry", mission: "m1" },
    scene: { location: "workspace", characters: ["ai_agent"] },
    dialogue: [{ speaker: "AI Agent", text: "已找到一篇高度相关的论文。" }],
  };
  it("正常 decision 事件含 choices", () => {
    const e = {
      ...base,
      choices: [{ id: "accept", text: "先放进文献表" }, { id: "verify", text: "查 DOI" }],
    };
    expect(EventSchema.safeParse(e).success).toBe(true);
  });
  it("拒绝未知 trigger", () => {
    expect(EventSchema.safeParse({ ...base, trigger: { kind: "magic" } }).success).toBe(false);
  });
});

describe("CampaignSchema (B001)", () => {
  it("完整 campaign", () => {
    const c = {
      id: "research_30d_proposal",
      title: "30天：从一句话到开题答辩",
      subtitle: "科研主线",
      description: "...",
      type: "research",
      cover: "research",
      startMissionId: "rm01",
      endingPool: ["re1"],
      skillFocus: ["task_contract"],
      estimatedMinutes: 120,
      totalDays: 30,
    };
    expect(CampaignSchema.safeParse(c).success).toBe(true);
  });
});

describe("EndingSchema (B009)", () => {
  it("含变体规则的结构化 ending", () => {
    const e = {
      id: "re_pass_good",
      campaign: "research",
      title: "顺利通过",
      mainResult: "开题顺利通过",
      requirements: { kind: "state", key: "progress", op: "gte", value: 70 },
      priority: 50,
      baseText: "答辩室里，{{evaluatorA}} 点了点头。",
      growthVariantRules: [
        {
          dimension: "independence",
          variants: [
            { gte: 70, text: "你展现出真正独立的研究判断。" },
            { lte: 30, text: "评委注意到你过度依赖工具。" },
          ],
        },
      ],
      characterEpilogueRules: [
        { characterId: "mentor", positive: "导师把你纳入课题。", neutral: "导师保持了礼貌。", negative: "导师沉默了。" },
      ],
      projectFutureRules: [{ key: "stable", condition: { kind: "always" }, text: "课题稳步推进。" }],
      specialFlagSections: [{ flag: "used_fake_citation", text: "那份引用最终被查出。" }],
      specialTags: ["citation_risk"],
      reflection: "研究不是让AI给出答案。",
    };
    expect(EndingSchema.safeParse(e).success).toBe(true);
  });
});

describe("SkillSchema / KnowledgeAtomSchema / CharacterSchema", () => {
  it("skill 含 behaviors/toolMappings/campaignMapping", () => {
    expect(
      SkillSchema.safeParse({
        id: "context.handoff",
        domain: "context",
        title: "Handoff",
        description: "跨会话交接",
        whenToUse: "长期任务切换会话时",
        behaviors: [{ id: "b1", level: 1, description: "完成一次 handoff", achievementId: "first_handoff" }],
        campaignMapping: ["research"],
        toolMappings: { claudeCode: "生成 /handoff 指令", codex: "导出摘要" },
      }).success,
    ).toBe(true);
  });
  it("knowledge atom 三层深度", () => {
    expect(
      KnowledgeAtomSchema.safeParse({
        id: "kc1",
        title: "AI产生候选，不产生事实",
        domain: "verification",
        trigger: "first_failure",
        problem: "AI给出的文献查不到",
        wrongPattern: "直接引用AI给的文献",
        correctBehavior: "检索原始来源核实",
        why: "语言模型会编造看似合理的引用",
        steps: ["复制标题", "在学术库检索", "比对DOI"],
        toolMappings: { claudeCode: "要求AI只使用本地文件中的文献" },
        successSignals: ["所有引用可检索"],
        failureSignals: ["引用查不到"],
        depth30s: "AI会编文献，先查再用。",
        depth3m: "候选生成与事实确认是两件事……",
        depth10m: "完整流程……",
      }).success,
    ).toBe(true);
  });
  it("character 含目标/性格/提供/冲突", () => {
    expect(
      CharacterSchema.safeParse({
        id: "mentor",
        displayName: "陈教授",
        role: "导师",
        portrait: "mentor",
        baseRelationship: 50,
        goals: "希望你形成独立研究能力",
        personality: "严格、话少",
        offers: "方向把关、资源",
        conflicts: "反感不核实的数据",
        dialogueStyle: "短句、反问",
      }).success,
    ).toBe(true);
  });
});

describe("parseContentDoc / cross-refs", () => {
  it("报告未知集合键与 schema 错误", () => {
    const r = parseContentDoc("t.yaml", { events: [{ id: "e1" }], foo: [] });
    expect(r.issues.length).toBeGreaterThanOrEqual(2);
  });
  it("next 指向不存在事件 → 报错", () => {
    const r = parseContentDoc("t.yaml", {
      events: [
        {
          id: "e1",
          campaign: "research",
          day: 1,
          type: "story",
          trigger: { kind: "manual" },
          scene: { location: "lab", characters: [] },
          next: "missing",
        },
      ],
    });
    const { index } = buildIndex([{ file: "t.yaml", parsed: r.parsed }]);
    const refs = validateCrossRefs(index);
    expect(refs.some((i) => i.message.includes("missing"))).toBe(true);
  });
});
