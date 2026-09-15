// METIS Academy Quality Controller
// Usage: npx tsx scripts/quality-controller.ts [status|next|audit]
import { loadContentDir } from "../packages/content-schema/src/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { index } = await loadContentDir(path.join(root, "content"));

const REQ = {
  research: { baseEndings: 160, events: 360, decisions: 150, delayed: 80, npc: 120, hidden: 40 },
  competition: { baseEndings: 160, events: 320, decisions: 140, delayed: 70, npc: 110, hidden: 35 },
  venture: { baseEndings: 160, events: 380, decisions: 160, delayed: 90, npc: 130, hidden: 45 },
  total: { baseEndings: 480, events: 1060, decisions: 450, delayed: 240 },
};

// Gather current counts
const campaignEvents: Record<string, number> = { research: 0, competition: 0, venture: 0 };
const campaignDecisions: Record<string, number> = { research: 0, competition: 0, venture: 0 };
const campaignDelayed: Record<string, number> = { research: 0, competition: 0, venture: 0 };
const campaignEndings: Record<string, number> = { research: 0, competition: 0, venture: 0 };

for (const ev of index.events.values()) {
  const c = ev.campaign;
  if (c in campaignEvents) campaignEvents[c]! += 1;
  if (c in campaignDecisions && (ev.type === "decision" || ev.keyDecision)) campaignDecisions[c]! += 1;
  const hasDelayed = (ev.delayedEffects?.length ?? 0) > 0 || (ev.choices ?? []).some((ch) => (ch.delayed?.length ?? 0) > 0);
  if (c in campaignDelayed && hasDelayed) campaignDelayed[c]! += 1;
}
for (const e of index.endings.values()) {
  if (e.campaign in campaignEndings) campaignEndings[e.campaign]! += 1;
}

// Check what's met
interface Gap { area: string; metric: string; current: number; required: number; gap: number }
const gaps: Gap[] = [];

for (const [line, req] of Object.entries(REQ)) {
  if (line === "total") continue;
  const events = campaignEvents[line] ?? 0;
  const decisions = campaignDecisions[line] ?? 0;
  const delayed = campaignDelayed[line] ?? 0;
  const endings = campaignEndings[line] ?? 0;
  if (events < req.events) gaps.push({ area: line, metric: "events", current: events, required: req.events, gap: req.events - events });
  if (decisions < req.decisions) gaps.push({ area: line, metric: "decisions", current: decisions, required: req.decisions, gap: req.decisions - decisions });
  if (delayed < req.delayed) gaps.push({ area: line, metric: "delayed", current: delayed, required: req.delayed, gap: req.delayed - delayed });
  if (endings < req.baseEndings) gaps.push({ area: line, metric: "endings", current: endings, required: req.baseEndings, gap: req.baseEndings - endings });
}

// Total checks
const totalEvents = Object.values(campaignEvents).reduce((a, b) => a + b, 0);
const totalDecisions = Object.values(campaignDecisions).reduce((a, b) => a + b, 0);
const totalDelayed = Object.values(campaignDelayed).reduce((a, b) => a + b, 0);
const totalEndings = Object.values(campaignEndings).reduce((a, b) => a + b, 0);

if (totalEvents < REQ.total.events) gaps.push({ area: "total", metric: "events", current: totalEvents, required: REQ.total.events, gap: REQ.total.events - totalEvents });
if (index.skills.size < 120) gaps.push({ area: "total", metric: "skills", current: index.skills.size, required: 120, gap: 120 - index.skills.size });
if (index.knowledge.size < 100) gaps.push({ area: "total", metric: "knowledge", current: index.knowledge.size, required: 100, gap: 100 - index.knowledge.size });

const mode = process.argv[2] ?? "status";

if (mode === "status") {
  console.log("\n===== Quality Status =====\n");
  console.log(`Events:       ${totalEvents} / ${REQ.total.events} ${totalEvents >= REQ.total.events ? "✅" : "❌ gap: " + (REQ.total.events - totalEvents)}`);
  console.log(`Decisions:    ${totalDecisions} / ${REQ.total.decisions} ${totalDecisions >= REQ.total.decisions ? "✅" : "❌"}`);
  console.log(`Skills:       ${index.skills.size} / 120 ${index.skills.size >= 120 ? "✅" : "❌"}`);
  console.log(`Knowledge:    ${index.knowledge.size} / 100 ${index.knowledge.size >= 100 ? "✅" : "❌"}`);
  console.log(`Endings:      ${totalEndings} / ${REQ.total.baseEndings} ${totalEndings >= REQ.total.baseEndings ? "✅" : "❌ gap: " + (REQ.total.baseEndings - totalEndings)}`);

  if (gaps.length > 0) {
    console.log("\n⚠️  Open Gaps:");
    for (const g of gaps.sort((a, b) => b.gap - a.gap).slice(0, 15)) {
      console.log(`  [${g.area}] ${g.metric}: ${g.current}/${g.required} (need ${g.gap} more)`);
    }
  }
  const met = gaps.length === 0;
  console.log(`\n${met ? "✅ ALL MET" : `❌ ${gaps.length} gaps remaining`}`);
  if (!met) {
    console.log("\nTop priority:");
    const sorted = [...gaps].sort((a, b) => b.gap - a.gap).slice(0, 5);
    for (const g of sorted) console.log(`  1. [${g.area}] Add ~${Math.ceil(g.gap / 5)} more ${g.metric} events`);
  }
}

if (mode === "next") {
  console.log("\n===== Next Work Packet =====\n");
  const sorted = [...gaps].sort((a, b) => b.gap - a.gap);
  for (const g of sorted.slice(0, 5)) {
    console.log(`  [${g.area}] ${g.metric}: add ~${Math.ceil(g.gap / 5)} events (current: ${g.current}/${g.required})`);
  }
}
