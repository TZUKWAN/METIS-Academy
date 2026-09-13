import { z } from "zod";
import { SKILL_DOMAINS } from "./skill.js";

export const KnowledgeAtomSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  domain: z.enum(SKILL_DOMAINS),
  /** 触发来源：first_failure | skill_unlock | npc_advice | player_search */
  trigger: z.enum(["first_failure", "skill_unlock", "npc_advice", "player_search", "event"]),
  triggerEventId: z.string().optional(),
  problem: z.string().min(1),
  wrongPattern: z.string().min(1),
  correctBehavior: z.string().min(1),
  why: z.string().min(1),
  steps: z.array(z.string()).min(1),
  toolMappings: z
    .object({
      claudeCode: z.string().optional(),
      codex: z.string().optional(),
      deepseekHarness: z.string().optional(),
    })
    .default({}),
  successSignals: z.array(z.string()).min(1),
  failureSignals: z.array(z.string()).min(1),
  transferScenarios: z.array(z.string()).default([]),
  depth30s: z.string().min(1),
  depth3m: z.string().min(1),
  depth10m: z.string().min(1),
  relatedSkillIds: z.array(z.string()).default([]),
});
export type KnowledgeAtom = z.infer<typeof KnowledgeAtomSchema>;
