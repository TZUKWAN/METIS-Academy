// METIS Academy — Content Similarity 审计
// 检查 event title/setup/dialogue/choice/response 与 ending outcome/reflection 的高相似对。
// 高相似 → blocker（必须合并或重写）。
//
// 算法：对每条文本提取 character 3-gram 集合，Jaccard 相似度。
// 阈值：text >= 0.55 为 blocker 候选；0.40-0.55 为 warning。
// 同一事件内比较会被跳过（比较跨事件）。
//
// 用法: npx tsx scripts/similarity-audit.ts
// Exit 0: blockers = 0
// Exit 1: blockers > 0

import { loadContentDir } from "../packages/content-schema/src/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOCK_THRESHOLD = 0.55;
const WARN_THRESHOLD = 0.4;

const { index } = await loadContentDir(path.join(root, "content"));

interface TextItem {
  id: string;      // 所属 event/ending id
  field: string;   // setup/dialogue/choice/ending 等
  text: string;
  campaign: string;
}

function trigrams(s: string): Set<string> {
  const t = s.replace(/\s+/g, "");
  const set = new Set<string>();
  for (let i = 0; i < t.length - 2; i++) set.add(t.slice(i, i + 3));
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// ===== 收集文本 =====
const items: TextItem[] = [];
for (const ev of index.events.values()) {
  for (const s of ev.setup ?? []) {
    if (s.length >= 20) items.push({ id: ev.id, field: "setup", text: s, campaign: ev.campaign });
  }
  for (const d of ev.dialogue ?? []) {
    if (d.text.length >= 20) items.push({ id: ev.id, field: "dialogue", text: d.text, campaign: ev.campaign });
  }
  for (const c of ev.choices ?? []) {
    if ((c.visibleResponse ?? "").length >= 20) {
      items.push({ id: ev.id, field: "response", text: c.visibleResponse!, campaign: ev.campaign });
    }
  }
}
for (const e of index.endings.values()) {
  if (e.baseText.length >= 20) items.push({ id: e.id, field: "endingText", text: e.baseText, campaign: e.campaign });
  if (e.reflection.length >= 10) items.push({ id: e.id, field: "reflection", text: e.reflection, campaign: e.campaign });
}

console.log(`Analyzing ${items.length} text fragments for similarity...`);

// ===== 两两比较（同 campaign 内，跨事件）=====
const trigramsCache = items.map((it) => trigrams(it.text));
const blockers: Array<{ a: TextItem; b: TextItem; sim: number }> = [];
const warnings: Array<{ a: TextItem; b: TextItem; sim: number }> = [];

for (let i = 0; i < items.length; i++) {
  for (let j = i + 1; j < items.length; j++) {
    if (items[i]!.id === items[j]!.id) continue; // 同一事件内跳过
    if (items[i]!.campaign !== items[j]!.campaign) continue;
    const sim = jaccard(trigramsCache[i]!, trigramsCache[j]!);
    if (sim >= BLOCK_THRESHOLD) blockers.push({ a: items[i]!, b: items[j]!, sim });
    else if (sim >= WARN_THRESHOLD) warnings.push({ a: items[i]!, b: items[j]!, sim });
  }
}

blockers.sort((x, y) => y.sim - x.sim);
warnings.sort((x, y) => y.sim - x.sim);

console.log(`\nBlockers (>= ${BLOCK_THRESHOLD}): ${blockers.length}`);
for (const b of blockers.slice(0, 40)) {
  console.log(`  [${b.sim.toFixed(2)}] ${b.a.id}.${b.a.field} <-> ${b.b.id}.${b.b.field}`);
  console.log(`      A: ${b.a.text.slice(0, 50)}`);
  console.log(`      B: ${b.b.text.slice(0, 50)}`);
}
console.log(`\nWarnings (${WARN_THRESHOLD}-${BLOCK_THRESHOLD}): ${warnings.length}`);
for (const w of warnings.slice(0, 15)) {
  console.log(`  [${w.sim.toFixed(2)}] ${w.a.id}.${w.a.field} <-> ${w.b.id}.${w.b.field}`);
}

if (blockers.length === 0) {
  console.log("\nSIMILARITY GATE: PASS (0 blockers)");
  process.exit(0);
} else {
  console.log(`\nSIMILARITY GATE: FAIL (${blockers.length} blockers)`);
  process.exit(1);
}
