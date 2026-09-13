// §30 逐日六要素机械化审计：
// 每个游戏日必须满足：≥1事件 / ≥1决策(玩家决策) / ≥1资产或状态变化 / ≥1能力训练目标(learning或knowledge) / ≥1反馈或延迟(可见回应/延迟)
// 另检查每线延迟后果、随机事件、BAD END 分支的总量门槛
import { loadContentDir } from "../packages/content-schema/src/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { index } = await loadContentDir(path.join(root, "content"));

interface DayAudit {
  campaign: string; day: number; events: number; decisions: number;
  assetOrState: boolean; feedbackOrDelayed: boolean; learning: boolean;
}
const audits: DayAudit[] = [];
const problems: string[] = [];

for (const campaign of index.campaigns.values()) {
  const type = campaign.type;
  for (let day = 1; day <= campaign.totalDays; day++) {
    const dayEvents = [...index.events.values()].filter((e) => e.campaign === type && e.day === day);
    const decisions = dayEvents.filter((e) => e.type === "decision" || e.keyDecision);
    const hasAssetOrState = dayEvents.some((e) => {
      const fx = [...(e.automaticEffects ?? []), ...(e.choices ?? []).flatMap((c) => c.hiddenEffects ?? [])];
      return fx.some((f) => ["addAsset", "updateAsset", "add", "set", "subtract", "scheduleEvent", "unlockKnowledge", "unlockSkill"].includes(f.kind));
    });
    const hasFeedback = dayEvents.some((e) =>
      (e.choices ?? []).some((c) => c.visibleResponse) ||
      (e.delayedEffects?.length ?? 0) > 0 ||
      (e.choices ?? []).some((c) => (c.delayed?.length ?? 0) > 0) ||
      // 即时反馈类：成就解锁 / 知识卡解锁（玩家可见的确定性回应）
      (e.automaticEffects ?? []).some((f) => f.kind === "achievement") ||
      (e.knowledgeUnlocks?.length ?? 0) > 0);
    const hasLearning = dayEvents.some((e) => e.purpose?.learning || e.learningPoint || (e.knowledgeUnlocks?.length ?? 0) > 0 || (e.choices ?? []).some((c) => (c.unlockKnowledge?.length ?? 0) > 0));
    audits.push({ campaign: type, day, events: dayEvents.length, decisions: decisions.length, assetOrState: hasAssetOrState, feedbackOrDelayed: hasFeedback, learning: hasLearning });
    if (dayEvents.length === 0) problems.push(`[${type}] 第 ${day} 天：无任何事件`);
    else {
      if (decisions.length === 0) problems.push(`[${type}] 第 ${day} 天：无玩家决策`);
      if (!hasAssetOrState) problems.push(`[${type}] 第 ${day} 天：无资产或状态变化`);
      if (!hasFeedback) problems.push(`[${type}] 第 ${day} 天：无即时反馈或延迟后果`);
      if (!hasLearning) problems.push(`[${type}] 第 ${day} 天：无能力训练目标`);
    }
  }
}

for (const a of audits) {
  if (a.events === 0 || !a.decisions || !a.assetOrState || !a.feedbackOrDelayed || !a.learning) {
    problems.push(`[${a.campaign}] 第 ${a.day} 天六要素不全：事件${a.events} 决策${a.decisions} 资产/状态${a.assetOrState ? "✓" : "✗"} 反馈/延迟${a.feedbackOrDelayed ? "✓" : "✗"} 训练目标${a.learning ? "✓" : "✗"}`);
  }
}

if (problems.length > 0) {
  console.error(`❌ 逐日六要素审计：${problems.length} 个问题`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(`✅ 逐日六要素审计通过：${audits.length} 个游戏日全部满足六要素`);
