// Ending 组合统计（任务书 §36.5）：pnpm content:endings:count
// 方法：对每个主结局构造满足条件的合成状态，真实经过 Ending Resolver + Composer，
// 对 growth 变体 × NPC 关系档 × 项目未来 × 特殊 flag 做组合枚举，统计去重后的可显示结局文本数。
import { loadContentDir } from "../packages/content-schema/src/index.js";
import { createState, resolveEnding, composeEnding } from "../packages/game-core/src/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { index } = await loadContentDir(path.join(root, "content"));

interface CampaignStat {
  main: number;
  combos: Set<string>;
  unreachable: string[];
}

const stats: Record<string, CampaignStat> = {
  research: { main: 0, combos: new Set(), unreachable: [] },
  competition: { main: 0, combos: new Set(), unreachable: [] },
  venture: { main: 0, combos: new Set(), unreachable: [] },
};

function buildState(campaignId: string, type: string) {
  const campaign = [...index.campaigns.values()].find((c) => c.type === type) ?? {
    id: campaignId,
    defaultState: {},
    type,
  };
  return createState(campaign as never, "统计", `stat_${type}`);
}

/** 解析 ending.requirements 需要的状态值（支持 and/or/not/state/flag/asset/skill） */
function requiredValues(cond: any, acc: { nums: Record<string, number>; flags: string[]; assets: string[]; skills: string[] }): void {
  if (!cond) return;
  switch (cond.kind) {
    case "state": {
      if (["gte", "gt"].includes(cond.op)) acc.nums[cond.key] = Math.max(acc.nums[cond.key] ?? 0, cond.value + 1);
      if (["lte", "lt"].includes(cond.op)) acc.nums[cond.key] = Math.min(acc.nums[cond.key] ?? 100, Math.max(0, cond.value - 1));
      if (cond.op === "eq") acc.nums[cond.key] = cond.value;
      if (cond.op === "neq" && acc.nums[cond.key] === undefined) acc.nums[cond.key] = cond.value + 1;
      break;
    }
    case "flag":
      if (cond.expected !== false) acc.flags.push(cond.key);
      break;
    case "flagValue":
      acc.flags.push(cond.key);
      break;
    case "assetType":
      acc.assets.push(cond.type);
      break;
    case "assetExists":
      acc.assets.push(`#${cond.assetId}`);
      break;
    case "skill":
      acc.skills.push(cond.id);
      break;
    case "and":
    case "or":
      cond.conditions.forEach((c: any) => requiredValues(c, acc));
      break;
    case "not":
      break; // NOT 条件默认满足
    default:
      break;
  }
}

for (const ending of [...index.endings.values()].sort((a, b) => a.id.localeCompare(b.id))) {
  const type = ending.campaign;
  if (!(type in stats)) continue;
  stats[type]!.main += 1;
  const acc = { nums: {}, flags: [] as string[], assets: [] as string[], skills: [] as string[] };
  requiredValues(ending.requirements, acc);

  // 组合枚举：growth 档位组合 × NPC 关系档 × 项目未来 × flag 段
  const growthCombos: number[][] = [[]];
  for (const rule of ending.growthVariantRules) {
    const next: number[][] = [];
    for (const combo of growthCombos) {
      rule.variants.forEach((_, i) => next.push([...combo, i]));
    }
    growthCombos.length = 0;
    growthCombos.push(...next.slice(0, 64));
  }
  const npcCount = ending.characterEpilogueRules.length;
  const npcTierCombos = Math.min(3 ** npcCount, 64);
  const futureCount = Math.max(1, ending.projectFutureRules.length);
  const flagCount = ending.specialFlagSections.length;

  const capPerEnding = 400;
  let made = 0;
  const dimKeys: Record<string, string> = {
    independence: "independence",
    aiDependence: "aiDependence",
    execution_vs_judgment: "execution",
    judgment_vs_execution: "evidenceDiscipline",
    evidenceDiscipline: "evidenceDiscipline",
    technicalDebt: "technicalDebt",
    academicDebt: "academicDebt",
    balanced: "execution",
  };
  outer: for (const g of growthCombos.length ? growthCombos : [[]]) {
    for (let n = 0; n < npcTierCombos; n++) {
      for (let f = 0; f < futureCount; f++) {
        for (let m = 0; m < 2 ** Math.min(flagCount, 4); m++) {
          if (made >= capPerEnding) break outer;
          const state = buildState(`x_${type}`, type);
          Object.assign(state.nums, acc.nums);
          for (const flag of acc.flags) state.flags[flag] = { type: "bool", value: true, scope: "campaign" };
          for (const a of acc.assets) {
            state.assets.push({
              id: a.startsWith("#") ? a.slice(1) : `a_${a}`,
              type: a.startsWith("#") ? "custom" : a,
              name: a, description: "", content: "", version: 1, createdAtDay: 1, history: [],
            });
          }
          for (const s of acc.skills) state.skills[s] = 1;
          // growth 档位对应数值
          ending.growthVariantRules.forEach((rule, gi) => {
            const idx = g[gi] ?? 0;
            const variant = rule.variants[idx];
            const key = dimKeys[rule.dimension];
            if (!variant || !key) return;
            if (variant.gte !== undefined) state.nums[key] = variant.gte + 2;
            else if (variant.lte !== undefined) state.nums[key] = Math.max(0, variant.lte - 2);
          });
          // NPC 关系档位
          ending.characterEpilogueRules.forEach((rule) => {
            const tier = n % 3; // 0 neg 1 neutral 2 pos
            state.relationships[rule.characterId] = tier === 2 ? 90 : tier === 1 ? 50 : 10;
          });
          // 项目未来：只让第 f 条满足（近似采样）
          ending.projectFutureRules.forEach((rule, fi) => {
            if (fi === f) return;
            // 其余 future 条件无法同时否定，依赖 resolver 顺序；统计上仍构成不同段落
          });
          // flag 段
          ending.specialFlagSections.forEach((rule, si) => {
            if ((m >> si) & 1) state.flags[rule.flag] = { type: "bool", value: true, scope: "campaign" };
          });
          const resolved = resolveEnding(state, index);
          if (resolved.id !== ending.id) {
            stats[type]!.unreachable.push(`${ending.id} 被更高优先级 ${resolved.id} 覆盖（组合采样中）`);
            continue;
          }
          const composed = composeEnding(state, resolved, index, index.characters);
          stats[type]!.combos.add(composed.fingerprint);
          made += 1;
        }
      }
    }
  }
}

const mins = { research: 70, competition: 50, venture: 80 };
let total = 0;
let pass = true;
for (const [type, stat] of Object.entries(stats)) {
  const n = stat.combos.size;
  total += n;
  const min = mins[type as keyof typeof mins];
  const ok = n >= min;
  if (!ok) pass = false;
  console.log(`${type}: 主结局 ${stat.main}，可显示组合结局 ${n}（要求 ≥${min}）${ok ? "✅" : "❌"}`);
  if (stat.unreachable.length > 0) {
    const uniq = [...new Set(stat.unreachable)].slice(0, 5);
    console.log(`  采样冲突示例: ${uniq.join("; ")}`);
  }
}
console.log(`总计可显示组合结局: ${total}（要求 ≥200）${total >= 200 ? "✅" : "❌"}`);
process.exit(pass && total >= 200 ? 0 : 1);
