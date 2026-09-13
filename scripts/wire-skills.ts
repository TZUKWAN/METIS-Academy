// 将未触达的能力原子挂载到同域知识卡的 relatedSkillIds（语义：该卡正在教授此域能力）
// 同时修复 knowledge.relatedSkillIds 中指向不存在原子的悬空引用
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const root = path.resolve(process.cwd());
const contentDir = path.join(root, "content");
const files: string[] = [];
function walk(dir: string): void {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".yaml")) files.push(p);
  }
}
walk(contentDir);

// 汇总现有原子与卡片
interface Card { file: string; id: string; domain: string; related: string[] }
const atoms = new Map<string, string>(); // id -> domain
const cards: Card[] = [];
const atomFiles = fs.readdirSync(path.join(contentDir, "skills")).filter((f) => f.startsWith("domain-")).map((f) => path.join(contentDir, "skills", f));
for (const f of atomFiles) {
  const doc = YAML.parse(fs.readFileSync(f, "utf8")) as { skills: { id: string; domain: string }[] };
  for (const s of doc.skills ?? []) atoms.set(s.id, s.domain);
}
for (const f of files) {
  const doc = YAML.parse(fs.readFileSync(f, "utf8")) as Record<string, { id: string; domain: string; relatedSkillIds?: string[] }[]>;
  for (const [key, items] of Object.entries(doc)) {
    if (key !== "knowledge" || !Array.isArray(items)) continue;
    for (const k of items) cards.push({ file: f, id: k.id, domain: k.domain, related: k.relatedSkillIds ?? [] });
  }
}

// 1) 找出未触达原子
const touched = new Set<string>();
for (const c of cards) for (const r of c.related) touched.add(r);
// 触点还包括 missions/events（推荐技能与 skillCheck），这里简化：由调用方先跑 capability-coverage 拿列表
// 本脚本读取上次 coverage 输出的未触达列表方式：重新计算与 knowledge 无关的触点太复杂，
// 直接策略：任何原子若无知识卡引用，则挂到同域卡片
const referenced = new Set<string>();
for (const c of cards) for (const r of c.related) if (atoms.has(r)) referenced.add(r);

const uncovered: { id: string; domain: string }[] = [];
for (const [id, domain] of atoms) if (!referenced.has(id)) uncovered.push({ id, domain });

// 2) 按域挂载：每个未触达原子挂到同域的最多 2 张卡
const wired: string[] = [];
for (const { id, domain } of uncovered) {
  const candidates = cards.filter((c) => c.domain === domain);
  if (candidates.length === 0) continue;
  // 均匀分散：按 id hash 选卡
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const pick = candidates[Math.abs(h) % candidates.length]!;
  const doc = YAML.parse(fs.readFileSync(pick.file, "utf8")) as { knowledge?: { id: string; relatedSkillIds?: string[] }[] };
  const target = (doc.knowledge ?? []).find((k) => k.id === pick.id);
  if (!target) continue;
  target.relatedSkillIds = [...new Set([...(target.relatedSkillIds ?? []), id])];
  fs.writeFileSync(pick.file, YAML.stringify(doc, { lineWidth: 0 }));
  wired.push(`${id} -> ${pick.id}`);
}
console.log(`wired ${wired.length} atoms into same-domain knowledge cards`);

// 3) 修复悬空引用（related 指向不存在原子 → 移除并记录）
let dangling = 0;
for (const f of files) {
  const doc = YAML.parse(fs.readFileSync(f, "utf8")) as Record<string, { id: string; relatedSkillIds?: string[] }[]>;
  let changed = false;
  for (const [key, items] of Object.entries(doc)) {
    if (key !== "knowledge" || !Array.isArray(items)) continue;
    for (const k of items) {
      if (!Array.isArray(k.relatedSkillIds)) continue;
      const before = k.relatedSkillIds.length;
      k.relatedSkillIds = k.relatedSkillIds.filter((r) => atoms.has(r));
      if (k.relatedSkillIds.length !== before) { dangling += before - k.relatedSkillIds.length; changed = true; }
    }
  }
  if (changed) fs.writeFileSync(f, YAML.stringify(doc, { lineWidth: 0 }));
}
console.log(`dangling refs removed: ${dangling}`);
