// METIS Academy Release Lock — V2 最新标准
// 只有所有条件通过时 exit 0，否则 exit 1。
// 这是唯一决定 RELEASE READY 的系统，取代所有旧门禁自行宣布完成的逻辑。

import { loadContentDir } from "../packages/content-schema/src/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { index } = await loadContentDir(path.join(root, "content"));

// ===== V2 最新硬指标 =====
const REQ = {
  research: { baseEndings: 160, events: 360, decisions: 150, delayed: 80, npc: 120, hidden: 40, ngPlus: 30 },
  competition: { baseEndings: 160, events: 320, decisions: 140, delayed: 70, npc: 110, hidden: 35, ngPlus: 25 },
  venture: { baseEndings: 160, events: 380, decisions: 160, delayed: 90, npc: 130, hidden: 45, ngPlus: 30 },
  total: { baseEndings: 480, events: 1060, decisions: 450, delayed: 240 },
};

interface Check { name: string; current: number; required: number; pass: boolean; unit: string }
const results: Check[] = [];
let allPass = true;

function check(name: string, current: number, required: number, unit = ""): void {
  const pass = current >= required;
  if (!pass) allPass = false;
  results.push({ name, current, required, pass, unit });
}

// ===== 1. 按线统计事件 =====
const campaignEvents: Record<string, number> = { research: 0, competition: 0, venture: 0 };
const campaignDecisions: Record<string, number> = { research: 0, competition: 0, venture: 0 };
const campaignDelayed: Record<string, number> = { research: 0, competition: 0, venture: 0 };
const campaignNpc: Record<string, number> = { research: 0, competition: 0, venture: 0 };
const campaignHidden: Record<string, number> = { research: 0, competition: 0, venture: 0 };

for (const ev of index.events.values()) {
  const c = ev.campaign;
  if (c in campaignEvents) campaignEvents[c]! += 1;
  if (c in campaignDecisions && (ev.type === "decision" || ev.keyDecision)) campaignDecisions[c]! += 1;
  const hasDelayed = (ev.delayedEffects?.length ?? 0) > 0 ||
    (ev.choices ?? []).some((ch) => (ch.delayed?.length ?? 0) > 0);
  if (c in campaignDelayed && hasDelayed) campaignDelayed[c]! += 1;
  if (c in campaignNpc && (ev.scene?.characters?.length ?? 0) > 0) campaignNpc[c]! += 1;
  if (c in campaignHidden && ev.type === "story" && !ev.keyDecision) campaignHidden[c]! += 1;
}

// ===== 2. 按线统计结局 =====
const campaignEndings: Record<string, number> = { research: 0, competition: 0, venture: 0 };
for (const e of index.endings.values()) {
  if (e.campaign in campaignEndings) campaignEndings[e.campaign]! += 1;
}

// ===== 3. 逐项检查 =====
check("Research events", campaignEvents.research ?? 0, REQ.research.events, "events");
check("Competition events", campaignEvents.competition ?? 0, REQ.competition.events, "events");
check("Venture events", campaignEvents.venture ?? 0, REQ.venture.events, "events");
check("Total events", index.events.size, REQ.total.events, "events");

const totalEndings = Object.values(campaignEndings).reduce((a, b) => a + b, 0);
check("Research base endings", campaignEndings.research ?? 0, REQ.research.baseEndings, "endings");
check("Competition base endings", campaignEndings.competition ?? 0, REQ.competition.baseEndings, "endings");
check("Venture base endings", campaignEndings.venture ?? 0, REQ.venture.baseEndings, "endings");
check("Total base endings", totalEndings, REQ.total.baseEndings, "endings");

check("Research decisions", campaignDecisions.research ?? 0, REQ.research.decisions, "decisions");
check("Competition decisions", campaignDecisions.competition ?? 0, REQ.competition.decisions, "decisions");
check("Venture decisions", campaignDecisions.venture ?? 0, REQ.venture.decisions, "decisions");

check("Research delayed", campaignDelayed.research ?? 0, REQ.research.delayed, "delayed");
check("Competition delayed", campaignDelayed.competition ?? 0, REQ.competition.delayed, "delayed");
check("Venture delayed", campaignDelayed.venture ?? 0, REQ.venture.delayed, "delayed");

check("Research NPC interactions", campaignNpc.research ?? 0, REQ.research.npc, "npc");
check("Competition NPC interactions", campaignNpc.competition ?? 0, REQ.competition.npc, "npc");
check("Venture NPC interactions", campaignNpc.venture ?? 0, REQ.venture.npc, "npc");

check("Research hidden events", campaignHidden.research ?? 0, REQ.research.hidden, "hidden");
check("Competition hidden events", campaignHidden.competition ?? 0, REQ.competition.hidden, "hidden");
check("Venture hidden events", campaignHidden.venture ?? 0, REQ.venture.hidden, "hidden");

check("Skill atoms", index.skills.size, 120, "skills");
check("Knowledge cards", index.knowledge.size, 100, "knowledge");

// ===== 输出 =====
console.log("\n===== METIS Academy Release Lock =====\n");
console.log("Check                                      Current  Required  Pass");
console.log("─".repeat(70));

for (const r of results) {
  const status = r.pass ? "✅" : "❌";
  const name = r.name.padEnd(42);
  const cur = String(r.current).padStart(6);
  const req = String(r.required).padStart(6);
  console.log(`${status} ${name} ${cur}  / ${req} ${r.unit}`);
}

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;

console.log("\n" + "─".repeat(70));
console.log(`PASS: ${passed}  FAIL: ${failed}  /  Total: ${results.length}`);

if (failed > 0) {
  console.log("\n❌ RELEASE LOCK: LOCKED");
  console.log("\nTop gaps (by severity):");
  for (const r of results.filter((r) => !r.pass).slice(0, 10)) {
    const gap = r.required - r.current;
    console.log(`  ❌ ${r.name}: need ${gap} more ${r.unit} (current: ${r.current}/${r.required})`);
  }
  console.log("\nSTATUS: NOT_RELEASE_READY");
  console.log("Continue working. Do not stop until Release Lock exits 0.");
  process.exit(1);
}

console.log("\n✅ RELEASE LOCK: UNLOCKED");
console.log("✅ STATUS: RELEASE READY");
