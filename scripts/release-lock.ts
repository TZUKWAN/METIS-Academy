// METIS Academy — 唯一 Release Lock
// 只有全部条件通过才 exit 0。这是唯一决定 RELEASE READY 的系统。
//
// Gate 来源：
// 1. 内容指标：本进程内直接从源码重新计算（不信缓存）
// 2. 机器证据：quality/evidence/*.json（带 gitSha，SHA != HEAD 即 STALE=FAIL）
// 3. 主观 Gate：quality/state.yaml 的 gates 段（GUI/visual/gameFeel/education/package）
// 4. Issue 账本：quality/state.yaml 的 issues 段
// 5. Clean Rounds：quality/state.yaml 的 round.cleanConsecutive

import { loadContentDir } from "../packages/content-schema/src/index.js";
import { collectMetrics } from "./collect-quality-metrics.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

interface Requirements {
  version: number;
  research: LineReq;
  competition: LineReq;
  venture: LineReq;
  total: { baseEndings: number; events: number; meaningfulDecisions: number; delayedConsequences: number };
  platform: { skills: number; knowledge: number };
  quality: {
    e2eTotal: number;
    e2ePassRequired: number;
    witnessCoverage: number;
    unknownAssetLicenses: number;
    forbiddenAssetLicenses: number;
    missingAssetManifests: number;
  };
  gates: { cleanAuditRoundsRequired: number; issueSeveritiesBlocking: string[] };
}
interface LineReq {
  baseEndings: number; events: number; meaningfulDecisions: number; delayedConsequences: number;
  npcInteractions: number; hiddenEvents: number; ngPlusEvents: number;
  hiddenBaseEndings: number; ngPlusBaseEndings: number; ultraRareBaseEndings: number;
}

const reqPath = path.join(root, "quality/requirements/latest.yaml");
const REQ = parseYaml(fs.readFileSync(reqPath, "utf8")) as Requirements;

function headSha(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

interface Evidence { gate: string; gitSha: string; pass: boolean; detail: string; at: string; extra?: Record<string, unknown> }

function loadEvidence(gate: string, sha: string): { ok: boolean; reason: string; ev?: Evidence } {
  const p = path.join(root, `quality/evidence/${gate}.json`);
  if (!fs.existsSync(p)) return { ok: false, reason: "NO_EVIDENCE (run: pnpm quality:gate " + gate + ")" };
  try {
    const ev = JSON.parse(fs.readFileSync(p, "utf8")) as Evidence;
    if (ev.gitSha !== sha) return { ok: false, reason: `STALE (evidence sha ${ev.gitSha.slice(0, 8)} != HEAD ${sha.slice(0, 8)})` };
    if (!ev.pass) return { ok: false, reason: `FAILED: ${ev.detail}` };
    return { ok: true, reason: "PASS", ev };
  } catch (e) {
    return { ok: false, reason: `CORRUPT: ${String(e)}` };
  }
}

interface StateFile {
  releaseStatus: string;
  round: { current: number; cleanConsecutive: number };
  gates: Record<string, string>;
  issues: { S0: number; S1: number; S2: number; S3: number; S4: number };
}

function loadState(): StateFile {
  const p = path.join(root, "quality/state.yaml");
  const fallback: StateFile = {
    releaseStatus: "NOT_RELEASE_READY",
    round: { current: 0, cleanConsecutive: 0 },
    gates: {},
    issues: { S0: -1, S1: -1, S2: -1, S3: -1, S4: -1 },
  };
  if (!fs.existsSync(p)) return fallback;
  try {
    return parseYaml(fs.readFileSync(p, "utf8")) as StateFile;
  } catch {
    return fallback;
  }
}

// ===== Main =====
const sha = headSha();
const state = loadState();

console.log("\n===== METIS Academy RELEASE LOCK =====");
console.log(`HEAD: ${sha}`);
console.log(`Status: ${state.releaseStatus}\n`);

const failures: string[] = [];
const rows: string[] = [];

function pass(name: string, detail = ""): void {
  rows.push(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name: string, detail = ""): void {
  rows.push(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  failures.push(`${name}${detail ? `: ${detail}` : ""}`);
}

// ===== 1. 内容指标（进程内实时计算）=====
const metrics = await collectMetrics();
const lineMap: Array<[string, LineReq, typeof metrics.research]> = [
  ["Research", REQ.research, metrics.research],
  ["Competition", REQ.competition, metrics.competition],
  ["Venture", REQ.venture, metrics.venture],
];

console.log("[1] Content metrics (recomputed from source):");
for (const [name, r, m] of lineMap) {
  const checks: Array<[string, number, number]> = [
    ["events", m.events, r.events],
    ["baseEndings", m.baseEndings, r.baseEndings],
    ["meaningfulDecisions", m.meaningfulDecisions, r.meaningfulDecisions],
    ["delayedConsequences", m.delayedConsequences, r.delayedConsequences],
    ["npcInteractions", m.npcInteractions, r.npcInteractions],
    ["hiddenEvents", m.hiddenEvents, r.hiddenEvents],
    ["ngPlusEvents", m.ngPlusEvents, r.ngPlusEvents],
    ["hiddenBaseEndings", m.hiddenBaseEndings, r.hiddenBaseEndings],
    ["ngPlusBaseEndings", m.ngPlusBaseEndings, r.ngPlusBaseEndings],
    ["ultraRareBaseEndings", m.ultraRareBaseEndings, r.ultraRareBaseEndings],
  ];
  for (const [k, cur, need] of checks) {
    if (cur >= need) pass(`${name} ${k}`, `${cur}/${need}`);
    else fail(`${name} ${k}`, `${cur}/${need}`);
  }
}
// Total
{
  const t = REQ.total;
  const m = metrics.totals;
  const checks: Array<[string, number, number]> = [
    ["Total events", m.events, t.events],
    ["Total baseEndings", m.baseEndings, t.baseEndings],
    ["Total meaningfulDecisions", m.meaningfulDecisions, t.meaningfulDecisions],
    ["Total delayedConsequences", m.delayedConsequences, t.delayedConsequences],
  ];
  for (const [k, cur, need] of checks) {
    if (cur >= need) pass(k, `${cur}/${need}`);
    else fail(k, `${cur}/${need}`);
  }
}

// ===== 2. 平台指标（skills/knowledge 直接从内容索引）=====
console.log("\n[2] Platform content:");
{
  const { index } = await loadContentDir(path.join(root, "content"));
  if (index.skills.size >= REQ.platform.skills) pass(`Skills >= ${REQ.platform.skills}`, String(index.skills.size));
  else fail(`Skills >= ${REQ.platform.skills}`, String(index.skills.size));
  if (index.knowledge.size >= REQ.platform.knowledge) pass(`Knowledge >= ${REQ.platform.knowledge}`, String(index.knowledge.size));
  else fail(`Knowledge >= ${REQ.platform.knowledge}`, String(index.knowledge.size));
}

// ===== 3. 机器证据 Gate =====
console.log("\n[3] Machine evidence gates (SHA-keyed):");
const machineGates = ["content", "reachability", "witness", "similarity", "lint", "typecheck", "unit", "e2e", "build", "assets"];
for (const g of machineGates) {
  const r = loadEvidence(g, sha);
  if (r.ok) {
    const extra = r.ev?.extra ? ` (${Object.entries(r.ev.extra).map(([k, v]) => `${k}=${v}`).join(", ")})` : "";
    pass(g, extra);
  } else {
    fail(g, r.reason);
  }
}
// E2E 特判：必须满足比例要求
{
  const r = loadEvidence("e2e", sha);
  if (r.ok && r.ev?.extra) {
    const passed = Number(r.ev.extra.passed ?? 0);
    const total = Number(r.ev.extra.total ?? 0);
    if (passed < REQ.quality.e2ePassRequired || total < REQ.quality.e2eTotal) {
      fail("e2e ratio", `${passed}/${total} < ${REQ.quality.e2ePassRequired}/${REQ.quality.e2eTotal}`);
    }
  }
}

// ===== 4. 主观 Gate（来自 state.yaml）=====
console.log("\n[4] Subjective gates (state.yaml):");
const subjectiveGates = ["gui", "visual", "gameFeel", "education", "package", "security"];
for (const g of subjectiveGates) {
  const v = state.gates?.[g];
  if (v === "PASS") pass(g);
  else if (v === "BLOCKED") fail(g, "BLOCKED (must be resolved or explicitly waived with reason)");
  else fail(g, String(v ?? "NOT_SET"));
}

// ===== 5. Issues =====
console.log("\n[5] Issue ledger:");
const iss = state.issues ?? { S0: -1, S1: -1, S2: -1, S3: -1, S4: -1 };
if (iss.S0 === 0) pass("S0 = 0"); else fail("S0 = 0", String(iss.S0));
if (iss.S1 === 0) pass("S1 = 0"); else fail("S1 = 0", String(iss.S1));
if (iss.S2 === 0) pass("S2 = 0"); else fail("S2 = 0", String(iss.S2));
if (iss.S3 === 0) pass("S3 = 0"); else fail("S3 = 0", String(iss.S3));
if (iss.S4 === 0) pass("visible S4 = 0"); else fail("visible S4 = 0", String(iss.S4));

// ===== 6. Clean rounds =====
console.log("\n[6] Clean audit rounds:");
const cc = state.round?.cleanConsecutive ?? 0;
const need = REQ.gates.cleanAuditRoundsRequired;
if (cc >= need) pass(`cleanConsecutive >= ${need}`, String(cc));
else fail(`cleanConsecutive >= ${need}`, String(cc));

// ===== 输出 =====
console.log("\n" + "─".repeat(66));
for (const r of rows) console.log(r);
console.log("─".repeat(66));

const totalChecks = rows.length;
const passedChecks = rows.filter((r) => r.startsWith("  ✅")).length;
console.log(`\nRESULT: ${passedChecks}/${totalChecks} checks passed`);

if (failures.length === 0) {
  console.log("\nRELEASE LOCK: PASS");
  console.log("RELEASE READY（仅当本输出为 exit 0 时才允许写这四个字）");
  process.exit(0);
} else {
  console.log(`\nRELEASE LOCK: FAIL (${failures.length} failures)`);
  console.log("STATUS: NOT_RELEASE_READY");
  console.log("\nTop failures:");
  for (const f of failures.slice(0, 15)) console.log(`  - ${f}`);
  if (failures.length > 15) console.log(`  ... and ${failures.length - 15} more`);
  process.exit(1);
}
