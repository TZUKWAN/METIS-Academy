// 内容验证（TASK-B012）：扫描 content/**/*.yaml，schema + 跨引用 + 规模统计
// 退出非 0 的情况：重复 ID / 缺失引用 / next 指向不存在事件 / mission 找不到 entry event / skill 循环 / ending pool 缺失
import { loadContentDir } from "../packages/content-schema/src/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(root, "content");

const { index, issues } = await loadContentDir(contentDir);

if (issues.length > 0) {
  console.error(`\n❌ 内容验证失败：${issues.length} 个问题\n`);
  for (const issue of issues.slice(0, 100)) {
    console.error(`  [${issue.collection}] ${issue.file}${issue.id ? ` id=${issue.id}` : ""}: ${issue.message}`);
  }
  if (issues.length > 100) console.error(`  ... 其余 ${issues.length - 100} 个省略`);
  process.exit(1);
}

// 规模统计
const byCampaign = { research: { events: 0, decisions: 0, missions: 0, endings: 0 }, competition: { events: 0, decisions: 0, missions: 0, endings: 0 }, venture: { events: 0, decisions: 0, missions: 0, endings: 0 } };
for (const ev of index.events.values()) {
  if (ev.campaign === "global") continue;
  byCampaign[ev.campaign]!.events += 1;
  if (ev.type === "decision" || ev.keyDecision) byCampaign[ev.campaign]!.decisions += 1;
}
for (const m of index.missions.values()) byCampaign[m.campaignId]!.missions += 1;
for (const e of index.endings.values()) {
  if (e.campaign in byCampaign) byCampaign[e.campaign]!.endings += 1;
}

console.log("✅ 内容验证通过（schema + 跨引用 + 无重复 ID）\n");
console.log("规模统计：");
console.log(`  事件: research=${byCampaign.research.events} competition=${byCampaign.competition.events} venture=${byCampaign.venture.events} global=${[...index.events.values()].filter((e) => e.campaign === "global").length}`);
console.log(`  关键决策: research=${byCampaign.research.decisions} competition=${byCampaign.competition.decisions} venture=${byCampaign.venture.decisions}`);
console.log(`  任务: research=${byCampaign.research.missions} competition=${byCampaign.competition.missions} venture=${byCampaign.venture.missions}`);
console.log(`  主结局: research=${byCampaign.research.endings} competition=${byCampaign.competition.endings} venture=${byCampaign.venture.endings} (总 ${index.endings.size})`);
console.log(`  技能原子: ${index.skills.size}  知识卡: ${index.knowledge.size}  角色: ${index.characters.size}`);

// V1 最低规模门槛（未达标提示，不阻塞早期开发；发布前必须全绿）
const mins = { research: { events: 90, decisions: 30, endings: 20 }, competition: { events: 70, decisions: 25, endings: 15 }, venture: { events: 100, decisions: 35, endings: 20 } };
let shortfall = false;
for (const c of Object.keys(mins)) {
  for (const k of Object.keys(mins[c])) {
    const actual = byCampaign[c][k];
    const min = mins[c][k];
    if (actual < min) {
      console.warn(`  ⚠️  ${c}.${k}: ${actual} < 最低要求 ${min}`);
      shortfall = true;
    }
  }
}
if (index.skills.size < 120) { console.warn(`  ⚠️  skill atoms: ${index.skills.size} < 120`); shortfall = true; }
if (index.knowledge.size < 100) { console.warn(`  ⚠️  knowledge cards: ${index.knowledge.size} < 100`); shortfall = true; }
if (shortfall) {
  // 规模未达标：默认仅警告（发布前用 --strict 强制）
  console.warn("（以上为规模进度提示；结构验证已通过。发布验收时使用 --strict）");
  if (process.argv.includes("--strict")) process.exit(2);
  process.exit(0);
}
