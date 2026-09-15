// METIS Academy Quality Controller
// 持续执行循环的中枢。
//
// 用法:
//   npx tsx scripts/quality-controller.ts status     — 当前状态全景
//   npx tsx scripts/quality-controller.ts next       — 自动选择最高优先工作包
//   npx tsx scripts/quality-controller.ts audit      — 独立审计，生成新的 backlog 条目
//   npx tsx scripts/quality-controller.ts sync       — 用源码指标刷新 state.yaml + backlog 差距条目
//   npx tsx scripts/quality-controller.ts clean      — 标记一个 Clean Audit Round
//
// 规则：backlog 为空但 Release Lock FAIL 时，next 必须触发新审计，禁止宣布完成。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { collectMetrics } from "./collect-quality-metrics.js";
import { loadContentDir } from "../packages/content-schema/src/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const statePath = path.join(root, "quality/state.yaml");
const backlogPath = path.join(root, "quality/backlog.yaml");
const reqPath = path.join(root, "quality/requirements/latest.yaml");

interface Requirements {
  research: Record<string, number>;
  competition: Record<string, number>;
  venture: Record<string, number>;
  total: Record<string, number>;
  gates: { cleanAuditRoundsRequired: number };
}
interface StateFile {
  version: number;
  releaseStatus: string;
  git: { branch: string; sha: string };
  round: { current: number; cleanConsecutive: number };
  metrics: Record<string, Record<string, number>>;
  gates: Record<string, string>;
  issues: Record<string, number>;
  nextWorkItem: string;
  lastUpdated: string;
}
interface BacklogItem {
  id: string;
  requirementId: string;
  priority: string;
  severity: string;
  category: string;
  description: string;
  evidence: string;
  acceptance: string;
  status: string;
  dependencies: string[];
  gitShaFound: string;
  gitShaFixed: string;
}

function readYaml<T>(p: string, fallback: T): T {
  if (!fs.existsSync(p)) return fallback;
  try {
    return parseYaml(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function headSha(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}
function currentBranch(): string {
  try {
    return execSync("git branch --show-current", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const REQ = readYaml<Requirements>(reqPath, { research: {}, competition: {}, venture: {}, total: {}, gates: { cleanAuditRoundsRequired: 3 } });

// 指标键名映射：metrics collector → requirements 键
const METRIC_TO_REQ: Record<string, string> = {
  baseEndings: "baseEndings",
  events: "events",
  meaningfulDecisions: "meaningfulDecisions",
  delayedConsequences: "delayedConsequences",
  npcInteractions: "npcInteractions",
  hiddenEvents: "hiddenEvents",
  ngPlusEvents: "ngPlusEvents",
  hiddenBaseEndings: "hiddenBaseEndings",
  ngPlusBaseEndings: "ngPlusBaseEndings",
  ultraRareBaseEndings: "ultraRareBaseEndings",
};

const LINE_NAMES: Record<string, string> = { research: "Research", competition: "Competition", venture: "Venture" };

// ===== sync: 刷新 state + backlog 差距条目 =====
async function sync(): Promise<void> {
  const metrics = await collectMetrics();
  const state = readYaml<StateFile>(statePath, {} as StateFile);
  const backlog = readYaml<{ backlog?: BacklogItem[] } | BacklogItem[]>(backlogPath, [] as unknown as BacklogItem[]);
  const items: BacklogItem[] = Array.isArray(backlog) ? (backlog as BacklogItem[]) : ((backlog as { backlog?: BacklogItem[] }).backlog ?? []);

  // 刷新 metrics 到 state
  state.metrics = {
    research: { ...metrics.research },
    competition: { ...metrics.competition },
    venture: { ...metrics.venture },
  };
  state.git = { branch: currentBranch(), sha: headSha() };
  state.lastUpdated = new Date().toISOString();

  // 刷新差距 backlog 条目（按 requirementId upsert）
  const gapIds: Array<[string, string, Record<string, number>]> = [
    ["research", "RES", REQ.research],
    ["competition", "COM", REQ.competition],
    ["venture", "VEN", REQ.venture],
  ];
  const metricDesc: Record<string, string> = {
    baseEndings: "base endings",
    events: "events",
    meaningfulDecisions: "meaningful decisions",
    delayedConsequences: "delayed consequences",
    npcInteractions: "NPC interactions",
    hiddenEvents: "hidden events",
    ngPlusEvents: "NG+ events",
    hiddenBaseEndings: "hidden base endings",
    ngPlusBaseEndings: "NG+ base endings",
    ultraRareBaseEndings: "ultra rare base endings",
  };

  let added = 0;
  let closed = 0;
  for (const [line, short, req] of gapIds) {
    const m = metrics[line as keyof typeof metrics] as Record<string, number>;
    for (const [metric, reqKey] of Object.entries(METRIC_TO_REQ)) {
      const need = req[reqKey];
      if (need === undefined) continue;
      const cur = m[metric] ?? 0;
      const ABBR = { baseEndings: "BE", events: "EV", meaningfulDecisions: "DEC", delayedConsequences: "DLY", npcInteractions: "NPC", hiddenEvents: "HID", ngPlusEvents: "NGP", hiddenBaseEndings: "HBE", ngPlusBaseEndings: "NGE", ultraRareBaseEndings: "URE" };
      const gapId = `GAP-${ABBR[reqKey] ?? reqKey.slice(0, 3).toUpperCase()}-${short}`;
      const existing = items.find((it) => it.id === gapId);
      if (cur < need) {
        if (!existing) {
          items.push({
            id: gapId,
            requirementId: `${line}.${reqKey}`,
            priority: "P0",
            severity: reqKey === "events" ? "S2" : "S1",
            category: "content",
            description: `${LINE_NAMES[line]} ${metricDesc[metric]} ${cur}/${need}`,
            evidence: `quality/metrics/latest.json @ ${headSha().slice(0, 8)}`,
            acceptance: `${line}.${reqKey} >= ${need}`,
            status: "open",
            dependencies: [],
            gitShaFound: headSha(),
            gitShaFixed: "",
          });
          added += 1;
        } else if (existing.status === "fixed" || existing.status === "verified") {
          // 又回退了（内容被删？）重新打开
          existing.status = "open";
          existing.gitShaFixed = "";
        } else {
          existing.description = `${LINE_NAMES[line]} ${metricDesc[metric]} ${cur}/${need}`;
        }
      } else if (existing && existing.status === "open") {
        existing.status = "fixed";
        existing.gitShaFixed = headSha();
        closed += 1;
      }
    }
  }

  fs.writeFileSync(backlogPath, stringifyYaml({ backlog: items }));
  fs.writeFileSync(statePath, stringifyYaml(state));
  console.log(`Synced. Added ${added} gap items, closed ${closed}.`);
}

// ===== status =====
async function status(): Promise<void> {
  const metrics = await collectMetrics();
  const state = readYaml<StateFile>(statePath, {} as StateFile);

  console.log("\n===== METIS Academy Quality Status =====\n");
  console.log(`HEAD:        ${headSha()}`);
  console.log(`Branch:      ${currentBranch()}`);
  console.log(`Round:       ${state.round?.current ?? 0}   CleanConsecutive: ${state.round?.cleanConsecutive ?? 0}`);
  console.log(`Status:      ${state.releaseStatus ?? "NOT_RELEASE_READY"}\n`);

  console.log("Line          Endings   Events   Decisions   Delayed   NPC   Hidden   NG+");
  for (const [line, m] of Object.entries(metrics)) {
    if (line === "totals" || line === "gitSha" || line === "appVersion" || line === "contentVersion" || line === "calculatedAt") continue;
    const mm = m as Record<string, number>;
    const name = LINE_NAMES[line] ?? line;
    console.log(
      `${name.padEnd(12)} ${String(mm.baseEndings).padStart(5)}   ${String(mm.events).padStart(6)}   ${String(mm.meaningfulDecisions).padStart(7)}   ${String(mm.delayedConsequences).padStart(7)}   ${String(mm.npcInteractions).padStart(5)}   ${String(mm.hiddenEvents).padStart(4)}   ${String(mm.ngPlusEvents).padStart(4)}`,
    );
  }
  console.log(
    `TOTAL        ${String(metrics.totals.baseEndings).padStart(5)}   ${String(metrics.totals.events).padStart(6)}   ${String(metrics.totals.meaningfulDecisions).padStart(7)}   ${String(metrics.totals.delayedConsequences).padStart(7)}`,
  );

  console.log("\nGates:");
  for (const [g, v] of Object.entries(state.gates ?? {})) {
    console.log(`  ${g.padEnd(12)} ${v}`);
  }
  console.log("\nOpen issues:");
  for (const [s, n] of Object.entries(state.issues ?? {})) {
    console.log(`  ${s}: ${n}`);
  }
  console.log(`\nNext work item: ${state.nextWorkItem ?? "(none)"}`);
}

// ===== next: 自动选择最高优先工作包 =====
async function next(): Promise<void> {
  const backlog = readYaml<{ backlog?: BacklogItem[] }>(backlogPath, {});
  const items = (backlog.backlog ?? []).filter((it) => it.status === "open" || it.status === "in_progress");

  if (items.length === 0) {
    console.log("Backlog 为空。Release Lock 仍 FAIL 时禁止宣布完成 —— 触发新审计。");
    console.log("运行: npx tsx scripts/quality-controller.ts audit");
    process.exit(2);
  }

  // 排序：P0 > P1 > P2；S1 > S2 > S3 > S4
  const priOrd: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
  const sevOrd: Record<string, number> = { S0: 0, S1: 1, S2: 2, S3: 3, S4: 4 };
  items.sort((a, b) => {
    const pd = (priOrd[a.priority] ?? 9) - (priOrd[b.priority] ?? 9);
    if (pd !== 0) return pd;
    return (sevOrd[a.severity] ?? 9) - (sevOrd[b.severity] ?? 9);
  });

  const top = items[0]!;
  console.log("\n===== NEXT WORK PACKET =====\n");
  console.log(`ID:          ${top.id}`);
  console.log(`Priority:    ${top.priority}  Severity: ${top.severity}`);
  console.log(`Category:    ${top.category}`);
  console.log(`Requirement: ${top.requirementId}`);
  console.log(`Description: ${top.description}`);
  console.log(`Acceptance:  ${top.acceptance}`);
  console.log(`Dependencies: ${top.dependencies.length ? top.dependencies.join(", ") : "none"}`);
  console.log(`\n(共 ${items.length} 个开放工作项)`);
}

// ===== audit: 独立审计（角色轮换）=====
const AUDIT_ROLES = [
  "Product Director",
  "Game Designer",
  "Narrative Editor",
  "UX Researcher",
  "QA Engineer",
  "Open-source Release Auditor",
];

async function audit(): Promise<void> {
  const state = readYaml<StateFile>(statePath, {} as StateFile);
  const round = (state.round?.current ?? 0) + 1;
  const role = AUDIT_ROLES[(round - 1) % AUDIT_ROLES.length]!;
  console.log(`\n===== INDEPENDENT AUDIT — Round ${round} — 视角: ${role} =====\n`);

  // 从源码重新统计 + 与需求比对，生成差距清单
  const metrics = await collectMetrics();
  const gaps: string[] = [];
  const lineMap: Array<[string, Record<string, number>]> = [
    ["research", REQ.research],
    ["competition", REQ.competition],
    ["venture", REQ.venture],
  ];
  for (const [line, req] of lineMap) {
    const m = metrics[line as keyof typeof metrics] as Record<string, number>;
    for (const [k, need] of Object.entries(req)) {
      const cur = m[k] ?? 0;
      if (cur < need) gaps.push(`${line}.${k}: ${cur}/${need} (缺 ${need - cur})`);
    }
  }
  console.log(`发现 ${gaps.length} 个需求差距:`);
  for (const g of gaps) console.log(`  - ${g}`);

  // 机器 Gate 证据新鲜度
  const evDir = path.join(root, "quality/evidence");
  const sha = headSha();
  const stale: string[] = [];
  for (const g of ["content", "reachability", "witness", "similarity", "lint", "typecheck", "unit", "e2e", "build", "assets"]) {
    const p = path.join(evDir, `${g}.json`);
    if (!fs.existsSync(p)) {
      stale.push(`${g}: NO_EVIDENCE`);
      continue;
    }
    try {
      const ev = JSON.parse(fs.readFileSync(p, "utf8")) as { gitSha: string; pass: boolean };
      if (ev.gitSha !== sha) stale.push(`${g}: STALE`);
      else if (!ev.pass) stale.push(`${g}: FAILED`);
    } catch {
      stale.push(`${g}: CORRUPT`);
    }
  }
  console.log(`\n机器 Gate 证据问题: ${stale.length}`);
  for (const s of stale) console.log(`  - ${s}`);

  // 更新 round
  state.round = { current: round, cleanConsecutive: state.round?.cleanConsecutive ?? 0 };
  state.nextWorkItem = stale.length > 0 ? `刷新 Gate 证据: ${stale[0]!.split(":")[0]}` : gaps.length > 0 ? gaps[0]! : "Adversarial pass — 主动寻找新问题";
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(statePath, stringifyYaml(state));
  console.log(`\nNext: ${state.nextWorkItem}`);
}

// ===== clean: 标记 Clean Round =====
function clean(): void {
  const state = readYaml<StateFile>(statePath, {} as StateFile);
  state.round.cleanConsecutive = (state.round.cleanConsecutive ?? 0) + 1;
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(statePath, stringifyYaml(state));
  console.log(`Clean round recorded. cleanConsecutive = ${state.round.cleanConsecutive}`);
}

// ===== Main =====
const cmd = process.argv[2] ?? "status";
switch (cmd) {
  case "status":
    await status();
    break;
  case "next":
    await next();
    break;
  case "audit":
    await audit();
    break;
  case "sync":
    await sync();
    break;
  case "clean":
    clean();
    break;
  default:
    console.error("Usage: quality-controller [status|next|audit|sync|clean]");
    process.exit(2);
}
