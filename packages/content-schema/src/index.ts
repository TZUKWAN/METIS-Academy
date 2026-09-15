import { z } from "zod";
import { CampaignSchema, Campaign } from "./campaign.js";
import { MissionSchema, Mission } from "./mission.js";
import { EventSchema, Event } from "./event.js";
import { EndingSchema, Ending } from "./ending.js";
import { SkillSchema, Skill } from "./skill.js";
import { KnowledgeAtomSchema, KnowledgeAtom } from "./knowledge.js";
import { CharacterSchema, Character } from "./character.js";
import { ASSET_TYPES } from "./effect.js";

export * from "./state.js";
export * from "./condition.js";
export * from "./effect.js";
export * from "./choice.js";
export * from "./event.js";
export * from "./mission.js";
export * from "./campaign.js";
export * from "./character.js";
export * from "./ending.js";
export * from "./skill.js";
export * from "./knowledge.js";

export interface ContentIndex {
  campaigns: Map<string, Campaign>;
  missions: Map<string, Mission>;
  events: Map<string, Event>;
  endings: Map<string, Ending>;
  skills: Map<string, Skill>;
  knowledge: Map<string, KnowledgeAtom>;
  characters: Map<string, Character>;
}

export interface ContentDoc {
  campaigns?: unknown[];
  missions?: unknown[];
  events?: unknown[];
  endings?: unknown[];
  skills?: unknown[];
  knowledge?: unknown[];
  characters?: unknown[];
}

/** 允许出现的元信息键（不参与集合解析） */
const META_KEYS = ["skill_tree", "meta", "version"] as const;

export const CONTENT_COLLECTION_KEYS = [
  "campaigns",
  "missions",
  "events",
  "endings",
  "skills",
  "knowledge",
  "characters",
] as const;

const validators: Record<string, z.ZodTypeAny> = {
  campaigns: CampaignSchema,
  missions: MissionSchema,
  events: EventSchema,
  endings: EndingSchema,
  skills: SkillSchema,
  knowledge: KnowledgeAtomSchema,
  characters: CharacterSchema,
};

export interface ContentIssue {
  file: string;
  collection: string;
  index: number;
  id?: string;
  message: string;
}

/** 解析单个 YAML/JSON 内容文件（对象，键为集合名） */
export function parseContentDoc(filePath: string, raw: unknown): {
  issues: ContentIssue[];
  parsed: {
    campaigns: Campaign[];
    missions: Mission[];
    events: Event[];
    endings: Ending[];
    skills: Skill[];
    knowledge: KnowledgeAtom[];
    characters: Character[];
  };
} {
  const issues: ContentIssue[] = [];
  const parsed = {
    campaigns: [] as Campaign[],
    missions: [] as Mission[],
    events: [] as Event[],
    endings: [] as Ending[],
    skills: [] as Skill[],
    knowledge: [] as KnowledgeAtom[],
    characters: [] as Character[],
  };
  if (typeof raw !== "object" || raw === null) {
    issues.push({ file: filePath, collection: "file", index: 0, message: "文件顶层必须是对象" });
    return { issues, parsed };
  }
  const obj = raw as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if ((META_KEYS as readonly string[]).includes(key)) continue;
    if (!CONTENT_COLLECTION_KEYS.includes(key as (typeof CONTENT_COLLECTION_KEYS)[number])) {
      issues.push({
        file: filePath,
        collection: "file",
        index: 0,
        message: `未知集合键 "${key}"，允许: ${CONTENT_COLLECTION_KEYS.join(", ")}`,
      });
      continue;
    }
    if (!Array.isArray(value)) {
      issues.push({ file: filePath, collection: key, index: 0, message: `集合 "${key}" 必须是数组` });
      continue;
    }
    const validator = validators[key]!;
    value.forEach((item, i) => {
      const result = validator.safeParse(item);
      if (!result.success) {
        const id = typeof item === "object" && item !== null ? String((item as Record<string, unknown>).id ?? "") : "";
        issues.push({
          file: filePath,
          collection: key,
          index: i,
          id,
          message: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
        });
      } else {
        (parsed as Record<string, unknown[]>)[key]!.push(result.data);
      }
    });
  }
  return { issues, parsed };
}

export function buildIndex(docs: { file: string; parsed: ReturnType<typeof parseContentDoc>["parsed"] }[]): {
  index: ContentIndex;
  issues: ContentIssue[];
} {
  const issues: ContentIssue[] = [];
  const index: ContentIndex = {
    campaigns: new Map(),
    missions: new Map(),
    events: new Map(),
    endings: new Map(),
    skills: new Map(),
    knowledge: new Map(),
    characters: new Map(),
  };
  for (const doc of docs) {
    for (const key of CONTENT_COLLECTION_KEYS) {
      for (const item of doc.parsed[key] as Array<{ id: string }>) {
        const map = index[key] as Map<string, { id: string }>;
        if (map.has(item.id)) {
          issues.push({
            file: doc.file,
            collection: key,
            index: -1,
            id: item.id,
            message: `重复 ID: ${item.id}`,
          });
        } else {
          map.set(item.id, item as never);
        }
      }
    }
  }
  return { index, issues };
}

/** 跨引用校验：缺失引用 / next 指向不存在事件 / mission entry event / skill 循环 / ending pool */
export function validateCrossRefs(index: ContentIndex): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const mk = (collection: string, id: string, message: string): ContentIssue => ({
    file: "(cross-ref)",
    collection,
    index: -1,
    id,
    message,
  });

  for (const mission of index.missions.values()) {
    // mission.campaignId 是 campaign type（schema 已枚举校验）
    if (!index.events.has(mission.entryEventId)) {
      issues.push(mk("missions", mission.id, `entryEventId "${mission.entryEventId}" 指向不存在的事件`));
    }
    for (const p of mission.prerequisites) {
      if (!index.missions.has(p)) issues.push(mk("missions", mission.id, `前置任务 "${p}" 不存在`));
    }
    for (const rule of mission.nextMissionRules) {
      if (!index.missions.has(rule.goto)) {
        issues.push(mk("missions", mission.id, `nextMissionRules.goto "${rule.goto}" 不存在`));
      }
    }
  }
  for (const c of index.campaigns.values()) {
    if (!index.missions.has(c.startMissionId)) {
      issues.push(mk("campaigns", c.id, `startMissionId "${c.startMissionId}" 不存在`));
    }
    for (const e of c.endingPool) {
      if (!index.endings.has(e)) issues.push(mk("campaigns", c.id, `endingPool "${e}" 不存在`));
    }
  }
  for (const ev of index.events.values()) {
    // ev.campaign 是 campaign type（schema 已枚举校验）
    if (ev.trigger.kind === "missionEntry" && !index.missions.has(ev.trigger.mission)) {
      issues.push(mk("events", ev.id, `trigger.mission "${ev.trigger.mission}" 不存在`));
    }
    for (const ch of ev.choices ?? []) {
      if (ch.next && !index.events.has(ch.next)) {
        issues.push(mk("events", ev.id, `choice.next "${ch.next}" 指向不存在的事件`));
      }
    }
    if (ev.next && !index.events.has(ev.next)) {
      issues.push(mk("events", ev.id, `next "${ev.next}" 指向不存在的事件`));
    }
    for (const d of [...(ev.delayedEffects ?? []), ...(ev.choices ?? []).flatMap((c) => c.delayed ?? [])]) {
      if (!index.events.has(d.eventId)) {
        issues.push(mk("events", ev.id, `延迟事件 "${d.eventId}" 不存在`));
      }
    }
    for (const k of ev.knowledgeUnlocks ?? []) {
      if (!index.knowledge.has(k)) issues.push(mk("events", ev.id, `知识卡 "${k}" 不存在`));
    }
  }
  // skill 依赖循环（DFS）
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string, chain: string[]): void => {
    if (visiting.has(id)) {
      issues.push(mk("skills", id, `技能依赖循环: ${[...chain, id].join(" -> ")}`));
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const skill = index.skills.get(id);
    for (const p of skill?.prerequisites ?? []) {
      if (!index.skills.has(p)) {
        issues.push(mk("skills", id, `前置技能 "${p}" 不存在`));
      } else {
        visit(p, [...chain, id]);
      }
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of index.skills.keys()) visit(id, []);
  return issues;
}

/** 加载整个 content/ 目录（供 Node 脚本与测试使用；renderer 由构建内联） */
export async function loadContentDir(contentDir: string): Promise<{
  index: ContentIndex;
  issues: ContentIssue[];
}> {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const YAML = await import("yaml");
  const docs: { file: string; parsed: ReturnType<typeof parseContentDoc>["parsed"] }[] = [];
  const issues: ContentIssue[] = [];
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "endings-witness") continue; // witness 证据文件，不是内容集合
        walk(full);
      }
      else if (/\.ya?ml$/.test(entry.name)) {
        const raw = YAML.parse(fs.readFileSync(full, "utf-8"));
        const r = parseContentDoc(path.relative(contentDir, full), raw);
        issues.push(...r.issues);
        docs.push({ file: path.relative(contentDir, full), parsed: r.parsed });
      }
    }
  };
  walk(contentDir);
  const { index, issues: indexIssues } = buildIndex(docs);
  issues.push(...indexIssues);
  issues.push(...validateCrossRefs(index));
  return { index, issues };
}

export { ASSET_TYPES };
