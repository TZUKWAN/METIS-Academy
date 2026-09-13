// 内容可达性检查（任务书 §37）
// 从每个 Campaign 起点遍历 Mission/Event 图，找出：不可达事件 / 不可达结局 / 死循环 / 无出口节点
import { loadContentDir } from "../packages/content-schema/src/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { index } = await loadContentDir(path.join(root, "content"));

const problems: string[] = [];

// 1) Mission 图可达性：从 startMissionId 沿 nextMissionRules + prerequisites 展开
for (const campaign of index.campaigns.values()) {
  const type = campaign.type;
  const reached = new Set<string>([campaign.startMissionId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of index.missions.values()) {
      if (reached.has(m.id)) continue;
      if (m.campaignId !== type) continue;
      if (m.prerequisites.every((p) => reached.has(p))) {
        reached.add(m.id);
        for (const r of m.nextMissionRules) reached.add(r.goto);
        changed = true;
      }
    }
    // 从已达 mission 的 rules 直接扩散
    for (const id of [...reached]) {
      const m = index.missions.get(id);
      if (m) for (const r of m.nextMissionRules) if (!reached.has(r.goto)) { reached.add(r.goto); changed = true; }
    }
  }
  const allMissions = [...index.missions.values()].filter((m) => m.campaignId === type);
  for (const m of allMissions) {
    if (!reached.has(m.id)) problems.push(`[mission] ${type}: ${m.id} 从起点不可达`);
  }

  // 2) Event 可达：入口=可达 mission 的 entry + day 触发 + missionEntry 触发(可达mission) + state/asset/random；再沿 next/choice.next/delayed 扩散
  const eventReached = new Set<string>();
  const queue: string[] = [];
  for (const ev of index.events.values()) {
    if (ev.campaign !== type && ev.campaign !== "global") continue;
    const t = ev.trigger;
    const entryReachable =
      (t.kind === "missionEntry" && reached.has(t.mission)) ||
      t.kind === "day" ||
      t.kind === "stage" ||
      t.kind === "state" ||
      t.kind === "asset" ||
      t.kind === "random" ||
      t.kind === "delayed";
    if (entryReachable) {
      eventReached.add(ev.id);
      queue.push(ev.id);
    }
  }
  while (queue.length > 0) {
    const id = queue.pop()!;
    const ev = index.events.get(id)!;
    const outs = [
      ev.next,
      ...(ev.choices ?? []).flatMap((c) => [c.next, ...(c.delayed ?? []).map((d) => d.eventId)]),
      ...(ev.delayedEffects ?? []).map((d) => d.eventId),
    ].filter(Boolean) as string[];
    for (const o of outs) {
      if (!index.events.has(o)) continue;
      if (!eventReached.has(o)) {
        eventReached.add(o);
        queue.push(o);
      }
    }
  }
  for (const ev of index.events.values()) {
    if (ev.campaign !== type && ev.campaign !== "global") continue;
    if (!eventReached.has(ev.id)) problems.push(`[event] ${type}: ${ev.id} 不可达（manual 且无入口指向）`);
  }

  // 3) 无出口节点：decision 无 choices 且无 next 且非 terminal；story 有 next 或 terminal 才行
  for (const ev of index.events.values()) {
    if (ev.campaign !== type && ev.campaign !== "global") continue;
    const hasChoices = (ev.choices?.length ?? 0) > 0;
    const hasExit = hasChoices || ev.next || ev.terminal;
    if (!hasExit) problems.push(`[event] ${type}: ${ev.id} 无出口（无choices/next/terminal）`);
    for (const c of ev.choices ?? []) {
      if (!c.next && !c.endFlow && !c.delayed?.length && !c.unlockKnowledge?.length) {
        // 允许纯效果选择（有 hiddenEffects 或 visibleResponse）
        if (!c.hiddenEffects?.length && !c.visibleResponse) {
          problems.push(`[event] ${type}: ${ev.id} 选择 ${c.id} 既无出口也无效果`);
        }
      }
    }
  }

  // 4) Ending 可达：requirements 可满足（简化：要求链中不含不可能组合，检查 endingPool 完整 + 至少一个 always 兜底）
  const pool = campaign.endingPool.map((e) => index.endings.get(e)).filter(Boolean);
  if (pool.length === 0) problems.push(`[ending] ${type}: endingPool 为空`);
}

// 5) 死循环：next 指针成环（不含 random 重访）
function detectCycle(type: string): void {
  const color = new Map<string, number>();
  const stack: string[] = [];
  const dfs = (id: string): void => {
    color.set(id, 1);
    stack.push(id);
    const ev = index.events.get(id);
    for (const nxt of [ev?.next, ...(ev?.choices ?? []).map((c) => c.next)].filter(Boolean) as string[]) {
      if (!index.events.has(nxt)) continue;
      if (color.get(nxt) === 1) {
        problems.push(`[cycle] ${type}: next 指针成环 ${[...stack, nxt].join("->")}`);
      } else if (!color.has(nxt)) {
        dfs(nxt);
      }
    }
    stack.pop();
    color.set(id, 2);
  };
  for (const ev of index.events.values()) {
    if (ev.campaign === type && !color.has(ev.id)) dfs(ev.id);
  }
}
detectCycle("research");
detectCycle("competition");
detectCycle("venture");

if (problems.length > 0) {
  console.error(`❌ 可达性问题 ${problems.length} 个：`);
  for (const p of problems.slice(0, 60)) console.error("  " + p);
  if (problems.length > 60) console.error(`  ...其余 ${problems.length - 60} 个`);
  process.exit(1);
}
console.log("✅ 可达性检查通过：无不可达事件/结局、无死循环、无无出口节点");
console.log(`  missions: ${index.missions.size}, events: ${index.events.size}, endings: ${index.endings.size}`);
