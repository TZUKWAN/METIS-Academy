// METIS Academy — Witness 生成器（目标导向求解器）
// 为指定结局自动寻找一条从合法初始状态到该结局的真实 playthrough，
// 并把每一步动作记录为 content/endings-witness/<ending-id>.yaml。
//
// 求解方式：贪心 + 随机扰动多轮尝试。每一步在真实 reducer 的克隆 state 上
// 试探每个可用选择，用目标结局 requirement 的"满足进度"打分，选最优。
// 禁止直接修改 state —— 全部走 reducer。
//
// 用法:
//   npx tsx scripts/witness-generate.ts                       # 全部缺失 witness 的结局
//   npx tsx scripts/witness-generate.ts --campaign research   # 指定线
//   npx tsx scripts/witness-generate.ts --ending <id>         # 指定结局
//   npx tsx scripts/witness-generate.ts --attempts 30         # 每结局尝试次数（默认 24）

import { loadContentDir } from "../packages/content-schema/src/index.js";
import type { Condition, Ending, Event } from "../packages/content-schema/src/index.js";
import { newPlaythrough, reducer, EMPTY_PROFILE, evaluateCondition } from "../packages/game-core/src/index.js";
import type { GameState } from "../packages/game-core/src/index.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify as stringifyYaml } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const witnessDir = path.join(root, "content/endings-witness");
fs.mkdirSync(witnessDir, { recursive: true });

// ===== CLI =====
const argOf = (name: string): string | null => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1]! : null;
};
const campaignFilter = argOf("--campaign");
const endingFilter = argOf("--ending");
const ATTEMPTS = Number(argOf("--attempts") ?? 24);

const { index } = await loadContentDir(path.join(root, "content"));

// 简单可复现 RNG（mulberry32）
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ===== 条件进度评分 =====
function conditionProgress(cond: Condition, state: GameState, index: import("../packages/content-schema/src/index.js").ContentIndex): number {
  const evalNow = (c: Condition): number => conditionProgress(c, state, index);
  switch (cond.kind) {
    case "always":
      return evaluateCondition(cond, state, index) ? 1 : 0;
    case "and": {
      let sum = 0;
      for (const c of cond.conditions) sum += evalNow(c);
      return sum / cond.conditions.length;
    }
    case "or": {
      let best = 0;
      for (const c of cond.conditions) best = Math.max(best, evalNow(c));
      return best;
    }
    case "not":
      return 1 - evalNow(cond.condition);
    case "state": {
      const cur = state.nums[cond.key] ?? 0;
      const target = cond.value;
      if (cond.op === "gte" || cond.op === "gt") return clampRatio(cur, target);
      if (cond.op === "lte" || cond.op === "lt") return clampRatio(target, cur); // 越低越好
      if (cond.op === "eq") return cur === target ? 1 : 0;
      return evaluateCondition(cond, state, index) ? 1 : 0;
    }
    case "flag":
      return ((state.flags[cond.key]?.value ?? false) === (cond.expected ?? true)) ? 1 : 0;
    case "flagValue":
      return evaluateCondition(cond, state, index) ? 1 : 0;
    case "assetType": {
      const count = (state.assets ?? []).filter((a) => a.type === cond.type).length;
      return clampRatio(count, cond.minCount ?? 1);
    }
    case "assetExists":
      return (state.assets ?? []).some((a) => a.id === cond.assetId) ? 1 : 0;
    case "skill": {
      const lvl = state.skills?.[cond.id] ?? 0;
      return clampRatio(lvl, cond.minLevel);
    }
    case "relationship": {
      const cur = state.relationships?.[cond.characterId] ?? 50;
      if (cond.op === "gte" || cond.op === "gt") return clampRatio(cur, cond.value);
      if (cond.op === "lte" || cond.op === "lt") return clampRatio(cond.value, cur);
      return evaluateCondition(cond, state, index) ? 1 : 0;
    }
    case "knowledge":
      return (state.knowledge ?? []).includes(cond.id) ? 1 : 0;
    case "ngPlus":
      return (state.ngPlus ?? 0) >= 1 ? 1 : 0;
    default:
      return evaluateCondition(cond, state, index) ? 1 : 0;
  }
}

function clampRatio(cur: number, target: number): number {
  if (target <= 0) return 1;
  return Math.min(1, Math.max(0, cur / target));
}

// ===== 单次尝试求解 =====
interface Step { do: string; choiceId?: string; expectEvent?: string; expectDay?: number }

// 预计算：每个目标结局的"更高优先级竞争者"（它们若匹配会抢走结算）
const campaignEndingsByCampaign = new Map<string, Ending[]>();
for (const e of index.endings.values()) {
  if (e.campaign === "global") continue;
  const list = campaignEndingsByCampaign.get(e.campaign) ?? [];
  list.push(e as Ending);
  campaignEndingsByCampaign.set(e.campaign, list);
}

function competitorPenalty(target: Ending, state: GameState): number {
  const competitors = (campaignEndingsByCampaign.get(target.campaign) ?? []).filter(
    (e) => e.id !== target.id && e.priority > target.priority,
  );
  if (competitors.length === 0) return 0;
  let closeness = 0;
  for (const c of competitors) {
    // 已完全匹配的竞争者重罚；接近匹配的按进度轻罚
    const matched = evaluateCondition(c.requirements as Condition, state, index);
    closeness += matched ? 2 : 0.6 * conditionProgress(c.requirements as Condition, state, index);
  }
  return closeness / competitors.length;
}

function attemptSolve(target: Ending, campaignId: string, seed: number): { steps: Step[] } | { error: string } {
  const rng = makeRng(seed);
  let state: GameState = newPlaythrough(index, campaignId, "Solver", EMPTY_PROFILE, false);
  const steps: Step[] = [];
  const exploration = 0.08; // 8% 随机探索避免局部最优

  for (let i = 0; i < 4000; i++) {
    if (state.ended) {
      return state.endingId === target.id ? { steps } : { error: `reached ${state.endingId}` };
    }
    if (state.currentEventId) {
      const event = index.events.get(state.currentEventId) as Event | undefined;
      if (!event) {
        const r = reducer(state, { type: "advance" }, index);
        if (r.error) return { error: `advance on missing event: ${r.error}` };
        state = r.state;
        steps.push({ do: "advance", expectEvent: state.currentEventId ?? undefined });
        continue;
      }
      if (event.choices && event.choices.length > 0) {
        // 评估每个选择
        let bestChoice: string | null = null;
        let bestScore = -Infinity;
        for (const ch of event.choices) {
          const clone = structuredClone(state);
          const r = reducer(clone, { type: "choose", choiceId: ch.id }, index);
          if (r.error) continue;
          const score = conditionProgress(target.requirements as Condition, r.state, index)
            - 1.5 * competitorPenalty(target, r.state)
            + (r.state.ended && r.state.endingId === target.id ? 100 : 0)
            + rng() * 0.01;
          if (score > bestScore) {
            bestScore = score;
            bestChoice = ch.id;
          }
        }
        if (!bestChoice) {
          // 全部选择失败 → advance 兜底
          const r = reducer(state, { type: "advance" }, index);
          if (r.error) return { error: `all choices rejected at ${event.id}: ${r.error}` };
          state = r.state;
          steps.push({ do: "advance", expectEvent: event.id });
          continue;
        }
        if (rng() < exploration) {
          const avail = event.choices.filter((ch) => !reducer(structuredClone(state), { type: "choose", choiceId: ch.id }, index).error);
          if (avail.length > 0) bestChoice = avail[Math.floor(rng() * avail.length)]!.id;
        }
        const chosen = event.choices.find((c) => c.id === bestChoice)!;
        const r = reducer(state, { type: "choose", choiceId: chosen.id }, index);
        if (r.error) return { error: `choose ${chosen.id}: ${r.error}` };
        state = r.state;
        steps.push({ do: "choose", choiceId: chosen.id, expectEvent: event.id });
        continue;
      }
      const r = reducer(state, { type: "advance" }, index);
      if (r.error) return { error: `advance at ${event.id}: ${r.error}` };
      state = r.state;
      steps.push({ do: "advance", expectEvent: event.id });
      continue;
    }
    // 无当前事件 → 先开任务（低 stage 优先），再消化 pending 队列，最后结束当天
    if (!state.currentMissionId) {
      const candidates = [...index.missions.values()]
        .filter((m) => m.campaignId === (index.campaigns.get(campaignId)?.type ?? ""))
        .filter(
          (m) =>
            (state.missionStates[m.id]?.status ?? "pending") === "available" ||
            (state.missionStates[m.id] === undefined &&
              m.prerequisites.every((p) => state.missionStates[p]?.status === "completed")),
        )
        .sort((a, b) => a.stage - b.stage);
      for (const mission of candidates) {
        const r = reducer(state, { type: "startMission", missionId: mission.id }, index);
        if (!r.error) {
          state = r.state;
          steps.push({ do: "startMission", missionId: mission.id });
          break;
        }
      }
      if (state.currentMissionId) continue;
    }
    const r = state.pendingEvents.length > 0
      ? reducer(state, { type: "advance" }, index)
      : reducer(state, { type: "endDay" }, index);
    if (r.error) {
      if (r.state.currentEventId || r.state.pendingEvents.length > 0) {
        state = r.state; // 日末事件已入队：回到主循环先处理事件
        continue;
      }
      return { error: `endDay: ${r.error}` };
    }
    state = r.state;
    steps.push({ do: "endDay", expectDay: (state.nums["day"] ?? 1) as number });
  }
  return { error: "max iterations" };
}

// ===== Main =====
const campaignOfType = (type: string): string => {
  for (const c of index.campaigns.values()) if (c.type === type) return c.id;
  throw new Error(`no campaign of type ${type}`);
};

const allEndings = [...index.endings.values()].filter(
  (e) =>
    e.campaign !== "global" &&
    (!campaignFilter || e.campaign === campaignFilter) &&
    (!endingFilter || e.id === endingFilter),
);

console.log(`Target endings: ${allEndings.length} (attempts each: ${ATTEMPTS})\n`);

let solved = 0;
let already = 0;
const failed: Array<{ id: string; reason: string }> = [];

for (const ending of allEndings) {
  const wPath = path.join(witnessDir, `${ending.id}.yaml`);
  if (fs.existsSync(wPath)) {
    already += 1;
    continue;
  }
  let found: Step[] | null = null;
  let lastError = "";
  const campaignId = campaignOfType(ending.campaign);
  for (let a = 0; a < ATTEMPTS && !found; a++) {
    const result = attemptSolve(ending, campaignId, 1000 + a * 7919);
    if ("steps" in result) found = result.steps;
    else lastError = result.error;
  }
  if (found) {
    const doc = {
      endingId: ending.id,
      campaign: ending.campaign,
      description: `Auto-solved witness (greedy solver over real reducer)`,
      steps: found,
    };
    fs.writeFileSync(wPath, stringifyYaml(doc));
    solved += 1;
    process.stdout.write(`  ✅ ${ending.id} (${found.length} steps)\n`);
  } else {
    failed.push({ id: ending.id, reason: lastError });
    process.stdout.write(`  ❌ ${ending.id}: ${lastError}\n`);
  }
}

console.log(`\nSolved: ${solved}   Already existed: ${already}   Failed: ${failed.length}`);
if (failed.length > 0) {
  console.log("\nFailed endings (need requirement/priority fixes or manual witnesses):");
  for (const f of failed) console.log(`  - ${f.id}: ${f.reason}`);
  process.exit(1);
}
console.log("\nWITNESS GENERATION COMPLETE");
