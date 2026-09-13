import { z } from "zod";
import { ConditionSchema, type Condition } from "./condition.js";

export const ASSET_TYPES = [
  "document",
  "dataset",
  "prompt",
  "task_contract",
  "agents_md",
  "claude_md",
  "goal",
  "loop",
  "research_matrix",
  "literature_library",
  "interview_notes",
  "prototype",
  "code_project",
  "pitch_deck",
  "business_model",
  "user_feedback",
  "revenue_report",
  "test_report",
  "handoff",
  "custom",
  "keyword_tree",
  "evidence_matrix",
  "research_brief",
  "concept_table",
  "mechanism_map",
  "argument_map",
  "state_file",
  "compact_checkpoint",
  "agent_environment_profile",
  "session_summary",
  "hypothesis_board",
  "checklist",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];
export const AssetTypeSchema = z.enum(ASSET_TYPES);

/** 资产类型目录（≥20 种可持续使用的玩家资产） */
export const ASSET_TYPE_CATALOG: Record<AssetType, { label: string; category: string; description: string }> = {
  document: { label: "文档", category: "通用", description: "通用文本文档" },
  dataset: { label: "数据集", category: "Research", description: "结构化或原始数据" },
  prompt: { label: "Prompt", category: "Agent", description: "可复用的提示词" },
  task_contract: { label: "Task Contract", category: "Agent", description: "结构化任务书" },
  agents_md: { label: "AGENTS.md", category: "Agent", description: "Agent 项目规则文件" },
  claude_md: { label: "CLAUDE.md", category: "Agent", description: "Claude Code 项目规则文件" },
  goal: { label: "Goal", category: "Agent", description: "目标状态定义" },
  loop: { label: "Loop", category: "Agent", description: "循环工作流定义" },
  research_matrix: { label: "研究矩阵", category: "Research", description: "文献/证据结构化矩阵" },
  literature_library: { label: "文献库", category: "Research", description: "已筛选的文献集合" },
  interview_notes: { label: "访谈记录", category: "通用", description: "用户/专家访谈纪要" },
  prototype: { label: "原型", category: "Venture", description: "产品原型或 Demo" },
  code_project: { label: "代码工程", category: "通用", description: "初始化的代码项目" },
  pitch_deck: { label: "路演材料", category: "Competition", description: "PPT / 路演稿" },
  business_model: { label: "商业模型", category: "Venture", description: "商业模式画布或假设" },
  user_feedback: { label: "用户反馈", category: "Venture", description: "真实用户反馈记录" },
  revenue_report: { label: "收入报表", category: "Venture", description: "收入/成本记录" },
  test_report: { label: "测试报告", category: "通用", description: "自动或人工测试结果" },
  handoff: { label: "Handoff", category: "Agent", description: "跨会话交接文档" },
  custom: { label: "自定义", category: "通用", description: "玩家自建资产" },
  keyword_tree: { label: "关键词树", category: "Research", description: "检索关键词扩展结构" },
  evidence_matrix: { label: "证据矩阵", category: "Research", description: "claim-evidence 映射" },
  research_brief: { label: "研究简报", category: "Research", description: "研究问题初步记录" },
  concept_table: { label: "概念辨析表", category: "Research", description: "概念定义比较" },
  mechanism_map: { label: "机制链", category: "Research", description: "actor-condition-mechanism-outcome" },
  argument_map: { label: "论证图", category: "Research", description: "论文论证结构" },
  state_file: { label: "项目状态文件", category: "Agent", description: "供 Agent 恢复上下文的状态文件" },
  compact_checkpoint: { label: "Compact 检查点", category: "Agent", description: "压缩上下文后的关键状态" },
  agent_environment_profile: { label: "Agent 环境档案", category: "Agent", description: "工作目录/CLI/模型配置记录" },
  session_summary: { label: "会话总结", category: "Agent", description: "旧 session 的总结" },
  hypothesis_board: { label: "假设板", category: "Venture", description: "六类假设及其验证状态" },
  checklist: { label: "检查清单", category: "通用", description: "验收清单" },
};

/** 效果引擎 DSL：所有状态修改只能经过此处 */
export type Effect =
  | { kind: "set"; key: string; value: number }
  | { kind: "add"; key: string; value: number }
  | { kind: "subtract"; key: string; value: number }
  | { kind: "clamp"; key: string; min?: number; max?: number }
  | {
      kind: "setFlag";
      key: string;
      value?: boolean | number | string;
      once?: boolean;
      scope?: "campaign" | "global";
    }
  | { kind: "unsetFlag"; key: string }
  | {
      kind: "addAsset";
      assetType: AssetType;
      name: string;
      description?: string;
      content?: string;
      assetId?: string;
      tool?: string;
      missionId?: string;
    }
  | { kind: "removeAsset"; assetId: string }
  | { kind: "updateAsset"; assetId: string; content?: string; description?: string; bumpVersion?: boolean }
  | { kind: "unlockSkill"; skillId: string; level?: number }
  | { kind: "unlockKnowledge"; knowledgeId: string }
  | { kind: "relationship"; characterId: string; delta: number }
  | { kind: "achievement"; achievementId: string; description?: string }
  | {
      kind: "scheduleEvent";
      eventId: string;
      offsetDays?: number;
      onDay?: number;
      condition?: Condition;
      payload?: Record<string, unknown>;
    };

const EffectSchemaBase = z.object({}).passthrough();

export const EffectSchema: z.ZodType<Effect> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    EffectSchemaBase.extend({ kind: z.literal("set"), key: z.string().min(1), value: z.number() }),
    EffectSchemaBase.extend({ kind: z.literal("add"), key: z.string().min(1), value: z.number() }),
    EffectSchemaBase.extend({ kind: z.literal("subtract"), key: z.string().min(1), value: z.number() }),
    EffectSchemaBase.extend({
      kind: z.literal("clamp"),
      key: z.string().min(1),
      min: z.number().optional(),
      max: z.number().optional(),
    }),
    EffectSchemaBase.extend({
      kind: z.literal("setFlag"),
      key: z.string().min(1),
      value: z.union([z.boolean(), z.number(), z.string()]).optional(),
      once: z.boolean().optional(),
      scope: z.enum(["campaign", "global"]).optional(),
    }),
    EffectSchemaBase.extend({ kind: z.literal("unsetFlag"), key: z.string().min(1) }),
    EffectSchemaBase.extend({
      kind: z.literal("addAsset"),
      assetType: AssetTypeSchema,
      name: z.string().min(1),
      description: z.string().optional(),
      content: z.string().optional(),
      assetId: z.string().min(1).optional(),
      tool: z.string().optional(),
      missionId: z.string().optional(),
    }),
    EffectSchemaBase.extend({ kind: z.literal("removeAsset"), assetId: z.string().min(1) }),
    EffectSchemaBase.extend({
      kind: z.literal("updateAsset"),
      assetId: z.string().min(1),
      content: z.string().optional(),
      description: z.string().optional(),
      bumpVersion: z.boolean().optional(),
    }),
    EffectSchemaBase.extend({
      kind: z.literal("unlockSkill"),
      skillId: z.string().min(1),
      level: z.number().int().min(1).max(3).optional(),
    }),
    EffectSchemaBase.extend({ kind: z.literal("unlockKnowledge"), knowledgeId: z.string().min(1) }),
    EffectSchemaBase.extend({
      kind: z.literal("relationship"),
      characterId: z.string().min(1),
      delta: z.number(),
    }),
    EffectSchemaBase.extend({
      kind: z.literal("achievement"),
      achievementId: z.string().min(1),
      description: z.string().optional(),
    }),
    EffectSchemaBase.extend({
      kind: z.literal("scheduleEvent"),
      eventId: z.string().min(1),
      offsetDays: z.number().int().min(0).optional(),
      onDay: z.number().int().min(1).optional(),
      condition: ConditionSchema.optional(),
      payload: z.record(z.string(), z.unknown()).optional(),
    }),
  ]),
);
