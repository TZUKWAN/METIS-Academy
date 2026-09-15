// METIS Academy — Witness 审计
// 每个 Base Ending 必须有 content/endings-witness/<ending-id>.yaml 证据文件。
// Witness 从合法 Campaign 初始状态开始，通过真实 reducer replay：
//   event → choice → effects → event → choice → ... → ending
// 禁止直接修改 state 伪造可达性。
//
// 用法: npx tsx scripts/witness-audit.ts [--ending <id>]
// Exit 0: 全部 witness 存在且 replay 到目标结局
// Exit 1: 有缺失或 replay 失败

import { loadContentDir } from "../packages/content-schema/src/index.js";
import { newPlaythrough, reducer, EMPTY_PROFILE } from "../packages/game-core/src/index.js";
import type { GameState } from "../packages/game-core/src/index.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const witnessDir = path.join(root, "content/endings-witness");

interface WitnessStep {
  do: "startMission" | "choose" | "advance" | "endDay";
  missionId?: string;
  choiceId?: string;
  // 可选断言：执行该步时应在哪个事件上
  expectEvent?: string;
  expectDay?: number;
}
interface WitnessFile {
  endingId: string;
  campaign: "research" | "competition" | "venture";
  description?: string;
  steps: WitnessStep[];
}

const { index } = await loadContentDir(path.join(root, "content"));

const filterEnding = (() => {
  const i = process.argv.indexOf("--ending");
  return i >= 0 ? process.argv[i + 1] : null;
})();

// ===== 收集所有 base endings =====
const allEndings = [...index.endings.values()].filter(
  (e) => e.campaign !== "global" && (!filterEnding || e.id === filterEnding),
);

// ===== 逐个检查 witness =====
let witnessed = 0;
const missing: string[] = [];
const failed: Array<{ id: string; reason: string }> = [];
const passedList: string[] = [];

for (const ending of allEndings) {
  const wPath = path.join(witnessDir, `${ending.id}.yaml`);
  if (!fs.existsSync(wPath)) {
    missing.push(ending.id);
    continue;
  }

  let wf: WitnessFile;
  try {
    wf = parseYaml(fs.readFileSync(wPath, "utf8")) as WitnessFile;
  } catch (e) {
    failed.push({ id: ending.id, reason: `YAML parse error: ${String(e)}` });
    continue;
  }
  if (wf.endingId !== ending.id) {
    failed.push({ id: ending.id, reason: `witness.endingId=${wf.endingId} mismatch` });
    continue;
  }
  if (!Array.isArray(wf.steps) || wf.steps.length === 0) {
    failed.push({ id: ending.id, reason: "empty steps" });
    continue;
  }

  // ===== 真实 replay =====
  const campaign = index.campaigns.get(wf.campaign);
  if (!campaign) {
    failed.push({ id: ending.id, reason: `unknown campaign ${wf.campaign}` });
    continue;
  }
  let state: GameState = newPlaythrough(index, campaign.id, "Witness", EMPTY_PROFILE, false);
  let error: string | null = null;
  let resolved = false;

  const MAX_STEPS = 5000;
  let stepIdx = 0;
  for (stepIdx = 0; stepIdx < MAX_STEPS; stepIdx++) {
    if (state.ended) {
      resolved = state.endingId === ending.id;
      if (!resolved) error = `replayed to different ending: ${state.endingId}`;
      break;
    }
    if (stepIdx >= wf.steps.length) {
      // 步骤耗尽还没结束 —— 允许用 advance 自动推进到结束（无选择事件流）
      const r = state.currentEventId
        ? reducer(state, { type: "advance" }, index)
        : reducer(state, { type: "endDay" }, index);
      if (r.error) {
        error = `steps exhausted at day ${state.nums["day"]}, event=${state.currentEventId}: ${r.error}`;
        break;
      }
      state = r.state;
      continue;
    }
    const step = wf.steps[stepIdx]!;
    if (step.expectEvent && state.currentEventId !== step.expectEvent) {
      error = `expectEvent ${step.expectEvent} but at ${state.currentEventId} (step ${stepIdx})`;
      break;
    }
    if (step.expectDay && state.nums["day"] !== step.expectDay) {
      error = `expectDay ${step.expectDay} but at day ${state.nums["day"]} (step ${stepIdx})`;
      break;
    }
    let r;
    if (step.do === "choose") {
      if (!step.choiceId) {
        error = `step ${stepIdx}: choose without choiceId`;
        break;
      }
      r = reducer(state, { type: "choose", choiceId: step.choiceId }, index);
      if (r.error) {
        error = `step ${stepIdx} choose ${step.choiceId}: ${r.error}`;
        break;
      }
    } else if (step.do === "startMission") {
      if (!step.missionId) {
        error = `step ${stepIdx}: startMission without missionId`;
        break;
      }
      r = reducer(state, { type: "startMission", missionId: step.missionId }, index);
      if (r.error) {
        error = `step ${stepIdx} startMission ${step.missionId}: ${r.error}`;
        break;
      }
    } else if (step.do === "advance") {
      r = reducer(state, { type: "advance" }, index);
      if (r.error) {
        error = `step ${stepIdx} advance: ${r.error}`;
        break;
      }
    } else {
      r = reducer(state, { type: "endDay" }, index);
      if (r.error) {
        error = `step ${stepIdx} endDay: ${r.error}`;
        break;
      }
    }
    state = r.state;
  }
  if (stepIdx >= MAX_STEPS && !state.ended) {
    error = error ?? `MAX_STEPS exceeded without ending (day ${state.nums["day"]})`;
  }
  if (!state.ended && !error) {
    error = `steps exhausted without ending (day ${state.nums["day"]}, event=${state.currentEventId})`;
  }

  if (error) {
    failed.push({ id: ending.id, reason: error });
  } else if (resolved) {
    witnessed += 1;
    passedList.push(ending.id);
  } else {
    failed.push({ id: ending.id, reason: "replay finished but ending not confirmed" });
  }
}

// ===== 输出 =====
const coverage = allEndings.length === 0 ? 0 : Math.round((witnessed / allEndings.length) * 100);
console.log("\n===== METIS Academy Witness Audit =====\n");
console.log(`Base endings:   ${allEndings.length}`);
console.log(`Witnessed:      ${witnessed}`);
console.log(`Missing witness: ${missing.length}`);
console.log(`Replay failed:  ${failed.length}`);
console.log(`Coverage: ${coverage}%`);

if (missing.length > 0) {
  console.log(`\nMissing witness files (${missing.length}):`);
  for (const id of missing.slice(0, 30)) console.log(`  - ${id}`);
  if (missing.length > 30) console.log(`  ... and ${missing.length - 30} more`);
}
if (failed.length > 0) {
  console.log(`\nReplay failures (${failed.length}):`);
  for (const f of failed.slice(0, 20)) console.log(`  - ${f.id}: ${f.reason}`);
  if (failed.length > 20) console.log(`  ... and ${failed.length - 20} more`);
}

if (witnessed === allEndings.length && failed.length === 0 && missing.length === 0) {
  console.log("\nWITNESS GATE: PASS");
  process.exit(0);
} else {
  console.log("\nWITNESS GATE: FAIL");
  process.exit(1);
}
