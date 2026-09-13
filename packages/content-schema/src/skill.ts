import { z } from "zod";
import { ConditionSchema } from "./condition.js";

export const SKILL_DOMAINS = [
  "environment",
  "initialization",
  "task_contract",
  "goal",
  "loop",
  "context",
  "agent_organization",
  "verification",
] as const;
export type SkillDomain = (typeof SKILL_DOMAINS)[number];

export const SKILL_DOMAIN_LABEL: Record<SkillDomain, string> = {
  environment: "环境搭建",
  initialization: "项目初始化",
  task_contract: "任务契约",
  goal: "目标工程",
  loop: "循环工程",
  context: "上下文工程",
  agent_organization: "多智能体组织",
  verification: "验证与验收",
};

export const SkillSchema = z.object({
  id: z.string().min(1),
  domain: z.enum(SKILL_DOMAINS),
  title: z.string().min(1),
  description: z.string().min(1),
  /** 何时该用 */
  whenToUse: z.string().min(1),
  /** 前置技能 */
  prerequisites: z.array(z.string()).default([]),
  maxLevel: z.number().int().min(1).max(3).default(3),
  /** 行为成就：升级由真实行为触发，不可手动加经验 */
  behaviors: z
    .array(
      z.object({
        id: z.string().min(1),
        level: z.number().int().min(1).max(3),
        description: z.string().min(1),
        /** 对应游戏内 achievement id */
        achievementId: z.string().min(1),
      }),
    )
    .default([]),
  unlockConditions: ConditionSchema.optional(),
  campaignMapping: z.array(z.string()).default([]),
  toolMappings: z
    .object({
      claudeCode: z.string().optional(),
      codex: z.string().optional(),
      deepseekHarness: z.string().optional(),
      generic: z.string().optional(),
    })
    .default({}),
  /** 未发现的技能在树中模糊显示 */
  hiddenUntilDiscovered: z.boolean().default(false),
});
export type Skill = z.infer<typeof SkillSchema>;
