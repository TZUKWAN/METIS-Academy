// 剧情自动跑通 bot（TASK-R003/R004/R005 基础设施）
// 用法: npx tsx scripts/bot.mjs <research|competition|venture> <first|last|random>
// 验收：无崩溃、到达 Ending Resolver、事件覆盖率打印
import { loadContentDir } from "../packages/content-schema/src/index.js";
import { newPlaythrough, reducer, EMPTY_PROFILE } from "../packages/game-core/src/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [, , campaignType = "research", strategy = "first"] = process.argv;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { index, issues } = await loadContentDir(path.join(root, "content"));
if (issues.length > 0) {
  console.error(`内容存在问题，先运行 pnpm content:validate 修复（${issues.length} 个）`);
  for (const i of issues.slice(0, 20)) console.error(`  ${i.file} ${i.id ?? ""}: ${i.message}`);
  process.exit(1);
}

const campaigns = [...index.campaigns.values()].filter((c) => c.type === campaignType);
if (campaigns.length === 0) {
  console.error(`找不到 campaign type=${campaignType} 的内容（可能尚未制作）`);
  process.exit(3);
}
const campaign = campaigns[0]!;

let state = newPlaythrough(index, campaign.id, "Bot", EMPTY_PROFILE, false);
const rng = Math.random;
const visited = new Set<string>();
const errors: string[] = [];
let steps = 0;
let missionStarts = 0;

function pickChoice(choices: { id: string }[]): string {
  if (choices.length === 0) throw new Error("decision 事件没有任何 choices");
  if (strategy === "first") return choices[0]!.id;
  if (strategy === "last") return choices[choices.length - 1]!.id;
  return choices[Math.floor(rng() * choices.length)]!.id;
}

const MAX_STEPS = 3000;
let finished = false;
while (steps < MAX_STEPS) {
  steps += 1;
  if (state.ended) {
    finished = true;
    break;
  }
  if (state.currentEventId) {
    visited.add(state.currentEventId);
    const event = index.events.get(state.currentEventId)!;
    if (event.choices && event.choices.length > 0) {
      const r = reducer(state, { type: "choose", choiceId: pickChoice(event.choices) }, index);
      if (r.error) {
        // 换一个选择重试
        let done = false;
        for (const c of event.choices) {
          const r2 = reducer(state, { type: "choose", choiceId: c.id }, index);
          if (!r2.error) {
            state = r2.state;
            done = true;
            break;
          }
        }
        if (!done) {
          const r3 = reducer(state, { type: "advance" }, index);
          if (r3.error) {
            errors.push(`day${state.nums["day"]} 事件 ${state.currentEventId}: 所有选择被拒绝`);
            break;
          }
          state = r3.state;
        }
      } else {
        state = r.state;
      }
    } else {
      const r = reducer(state, { type: "advance" }, index);
      if (r.error) {
        errors.push(`day${state.nums["day"]} advance: ${r.error}`);
        break;
      }
      state = r.state;
    }
    continue;
  }
  // 无当前事件：优先开任务（按 stage 排序尝试，失败则跳过该任务）
  if (!state.currentMissionId) {
    const candidates = [...index.missions.values()]
      .filter((m) => m.campaignId === campaignType)
      .filter(
        (m) =>
          (state.missionStates[m.id]?.status ?? "pending") === "available" ||
          (state.missionStates[m.id] === undefined &&
            m.prerequisites.every((p) => state.missionStates[p]?.status === "completed")),
      )
      .sort((a, b) => a.stage - b.stage);
    let started = false;
    for (const mission of candidates) {
      const r = reducer(state, { type: "startMission", missionId: mission.id }, index);
      if (!r.error) {
        state = r.state;
        missionStarts += 1;
        started = true;
        break;
      }
    }
    if (started) continue;
  }
  const r = reducer(state, { type: "endDay" }, index);
  if (r.error) {
    if (r.state.currentEventId) {
      state = r.state; // 日末事件已入队：回到主循环先处理事件
      continue;
    }
    errors.push(`day${state.nums["day"]} endDay: ${r.error}`);
    break;
  }
  state = r.state;
}

const allEvents = [...index.events.values()].filter(
  (e) => e.campaign === campaignType || e.campaign === "global",
);
const coverage = allEvents.length === 0 ? 0 : (visited.size / allEvents.length) * 100;

console.log(`=== Bot ${campaignType}/${strategy} ===`);
console.log(`steps=${steps} days=${state.nums["day"]} missions_started=${missionStarts} assets=${state.assets.length} knowledge=${state.knowledge.length}`);
console.log(`事件覆盖: ${visited.size}/${allEvents.length} (${coverage.toFixed(1)}%)`);
console.log(`ending: ${state.endingId ?? "(未到达)"}  ended=${state.ended}`);
if (errors.length) console.log(`错误:\n  ${errors.join("\n  ")}`);

if (!finished || errors.length > 0) {
  console.error("❌ bot 未成功走通");
  process.exit(1);
}
const isFinalDay = state.nums["day"] >= campaign.totalDays;
if (coverage < 80 && strategy !== "random") {
  console.warn(`⚠️ 覆盖率 ${coverage.toFixed(1)}% < 80%（策略性偏低可接受，但需人工确认）`);
}
console.log(finished && isFinalDay ? "✅ bot 走通到结局" : "✅ bot 走通（提前结算）");
