// METIS Academy — 源码指标收集器
// 直接从当前源码统计所有质量指标，输出 quality/metrics/latest.json。
// 事实源 = 源码 + Git SHA，不是任何 Markdown 报告。
//
// 指标定义：
// - events: 该线全部事件数
// - baseEndings: 该线全部独立基础结局数（每条 Ending 记录 = 一个基础结局）
// - meaningfulDecisions: type=decision 且 keyDecision=true 且 choices>=2 的事件
// - delayedConsequences: 被其他事件/选择的 delayedEffects 指向的目标事件（唯一 ID 数）
//   —— 完整延迟后果还要求"世界响应"，由 endings/delayed 质量审计另行检查
// - npcInteractions: 有具名角色出场且有非系统台词的事件
// - hiddenEvents: 显式标记 hidden: true 的事件
// - ngPlusEvents: 显式标记 ngPlus: true 的事件
// - hiddenBaseEndings: tier=hidden 的结局
// - ngPlusBaseEndings: ngPlus: true 的结局
// - ultraRareBaseEndings: ultraRare: true 的结局

import { loadContentDir } from "../packages/content-schema/src/index.js";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function gitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function appVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "apps/desktop/package.json"), "utf8"));
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

function contentVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    return String(pkg.contentVersion ?? "unknown");
  } catch {
    return "unknown";
  }
}

const SYSTEM_SPEAKERS = new Set(["你", "系统", "旁白"]);

export interface CampaignMetrics {
  events: number;
  baseEndings: number;
  meaningfulDecisions: number;
  delayedConsequences: number;
  npcInteractions: number;
  hiddenEvents: number;
  ngPlusEvents: number;
  hiddenBaseEndings: number;
  ngPlusBaseEndings: number;
  ultraRareBaseEndings: number;
  // 派生质量信号
  displayVariantCount: number;
  endingTones: Record<string, number>;
  visibleEventRange: number; // 单周目典型可见事件估算（day-triggered + missionEntry 主干）
}

export interface MetricsFile {
  gitSha: string;
  appVersion: string;
  contentVersion: string;
  calculatedAt: string;
  research: CampaignMetrics;
  competition: CampaignMetrics;
  venture: CampaignMetrics;
  totals: {
    events: number;
    baseEndings: number;
    meaningfulDecisions: number;
    delayedConsequences: number;
  };
}

export async function collectMetrics(): Promise<MetricsFile> {
  const { index } = await loadContentDir(path.join(root, "content"));

  const campaigns = ["research", "competition", "venture"] as const;
  const result: Record<string, CampaignMetrics> = {};

  // 预计算：所有被 delayedEffects 指向的目标事件
  const delayedTargets = new Set<string>();
  for (const ev of index.events.values()) {
    for (const d of ev.delayedEffects ?? []) delayedTargets.add(d.eventId);
    for (const ch of ev.choices ?? []) {
      for (const d of ch.delayed ?? []) delayedTargets.add(d.eventId);
    }
  }

  // 结局优先级覆盖统计（displayVariantCount 用）
  const endingsByCampaign = new Map<string, typeof index.endings extends Map<string, infer E> ? E[] : never[]>();
  for (const c of campaigns) endingsByCampaign.set(c, []);

  for (const e of index.endings.values()) {
    if (e.campaign !== "global" && (campaigns as readonly string[]).includes(e.campaign)) {
      endingsByCampaign.get(e.campaign as (typeof campaigns)[number])!.push(e);
    }
  }

  for (const c of campaigns) {
    const evs = [...index.events.values()].filter((e) => e.campaign === c);
    const ends = endingsByCampaign.get(c)!;

    const meaningfulDecisions = evs.filter(
      (e) => e.type === "decision" && e.keyDecision === true && (e.choices?.length ?? 0) >= 2,
    ).length;

    const delayedConsequences = new Set(
      evs.filter((e) => delayedTargets.has(e.id)).map((e) => e.id),
    ).size;

    const npcInteractions = evs.filter((e) => {
      const hasNamedChar = (e.scene?.characters?.length ?? 0) > 0;
      const hasNpcDialogue = (e.dialogue ?? []).some(
        (d) => !SYSTEM_SPEAKERS.has(d.speaker),
      );
      return hasNamedChar && hasNpcDialogue;
    }).length;

    const hiddenEvents = evs.filter((e) => e.hidden === true).length;
    const ngPlusEvents = evs.filter((e) => e.ngPlus === true).length;

    const hiddenBaseEndings = ends.filter((e) => e.tier === "hidden").length;
    const ngPlusBaseEndings = ends.filter((e) => (e as { ngPlus?: boolean }).ngPlus === true).length;
    const ultraRareBaseEndings = ends.filter((e) => (e as { ultraRare?: boolean }).ultraRare === true).length;

    // 组合结局显示变体（仅作参考，不作为 gate）
    const displayVariantCount = ends.reduce((acc, e) => {
      let variants = 1;
      for (const rule of e.growthVariantRules ?? []) variants *= rule.variants.length;
      for (const rule of e.characterEpilogueRules ?? []) variants *= 3;
      return acc + variants;
    }, 0);

    const endingTones: Record<string, number> = { positive: 0, negative: 0, mixed: 0, ambiguous: 0, unset: 0 };
    for (const e of ends) {
      const tone = (e as { tone?: string }).tone ?? "unset";
      endingTones[tone] = (endingTones[tone] ?? 0) + 1;
    }

    // 单周目主干可见事件估算：missionEntry/day 触发的非隐藏事件
    const visibleEventRange = evs.filter((e) => {
      const t = e.trigger as { kind: string };
      return (t.kind === "missionEntry" || t.kind === "day") && e.hidden !== true;
    }).length;

    result[c] = {
      events: evs.length,
      baseEndings: ends.length,
      meaningfulDecisions,
      delayedConsequences,
      npcInteractions,
      hiddenEvents,
      ngPlusEvents,
      hiddenBaseEndings,
      ngPlusBaseEndings,
      ultraRareBaseEndings,
      displayVariantCount,
      endingTones,
      visibleEventRange,
    };
  }

  const totals = {
    events: campaigns.reduce((a, c) => a + result[c].events, 0),
    baseEndings: campaigns.reduce((a, c) => a + result[c].baseEndings, 0),
    meaningfulDecisions: campaigns.reduce((a, c) => a + result[c].meaningfulDecisions, 0),
    delayedConsequences: campaigns.reduce((a, c) => a + result[c].delayedConsequences, 0),
  };

  return {
    gitSha: gitSha(),
    appVersion: appVersion(),
    contentVersion: contentVersion(),
    calculatedAt: new Date().toISOString(),
    research: result.research,
    competition: result.competition,
    venture: result.venture,
    totals,
  };
}

// ===== CLI =====
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const metrics = await collectMetrics();
  const outDir = path.join(root, "quality/metrics");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "latest.json");
  fs.writeFileSync(outFile, JSON.stringify(metrics, null, 2));

  console.log("\n===== METIS Academy Source Metrics =====\n");
  console.log(`Git SHA:  ${metrics.gitSha}`);
  console.log(`App Ver:  ${metrics.appVersion}   Content Ver: ${metrics.contentVersion}`);
  console.log(`Time:     ${metrics.calculatedAt}\n`);
  const lines: Array<[string, CampaignMetrics]> = [
    ["Research", metrics.research],
    ["Competition", metrics.competition],
    ["Venture", metrics.venture],
  ];
  for (const [name, m] of lines) {
    console.log(`${name}:`);
    console.log(`  events=${m.events} baseEndings=${m.baseEndings} decisions=${m.meaningfulDecisions} delayed=${m.delayedConsequences}`);
    console.log(`  npc=${m.npcInteractions} hidden=${m.hiddenEvents} ngPlus=${m.ngPlusEvents}`);
    console.log(`  hiddenEndings=${m.hiddenBaseEndings} ngPlusEndings=${m.ngPlusBaseEndings} ultraRare=${m.ultraRareBaseEndings}`);
    console.log(`  tones=${JSON.stringify(m.endingTones)} visible主干=${m.visibleEventRange}`);
  }
  console.log(`\nTOTAL: events=${metrics.totals.events} baseEndings=${metrics.totals.baseEndings} decisions=${metrics.totals.meaningfulDecisions} delayed=${metrics.totals.delayedConsequences}`);
  console.log(`\nWritten: ${outFile}`);
}
