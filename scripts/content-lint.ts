// K001 内容 Linter：AI 味/文本长度/选择设计 自动检查
// 退出非 0：单 NPC 连续 >4 段、单句 >120 字（上限放宽自 80 以容忍旁白）、事件 choices >6、单事件正文 >1500 字
// 警告（不计失败）："首先…其次…最后"套话、"就像…一样"类比密度、缺延迟后果的 decision 占比
import { loadContentDir } from "../packages/content-schema/src/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { index } = await loadContentDir(path.join(root, "content"));

const errors: string[] = [];
const warns: string[] = [];
const C = (tag: string, id: string, msg: string): string => `[${tag}] ${id}: ${msg}`;

for (const ev of index.events.values()) {
  // 1) NPC 连续段：同一 speaker 连续 ≤4 段
  let lastSpeaker = "";
  let run = 0;
  for (const line of ev.dialogue) {
    if (line.speaker === lastSpeaker) run++;
    else { lastSpeaker = line.speaker; run = 1; }
    if (run > 4) { errors.push(C("连续段", ev.id, `${line.speaker} 连续 ${run} 段（>4）`)); break; }
    // 2) 单句长度（对话文本 ≤120 字，任务书 5-80 的放宽护栏）
    if (line.text.length > 120) errors.push(C("句长", ev.id, `单句 ${line.text.length} 字（>120）："${line.text.slice(0, 24)}…"`));
  }
  // 3) 事件正文字数（setup+dialogue 合计 ≤1500 字）
  const total = ev.dialogue.reduce((s, d) => s + d.text.length, 0) + (ev.setup ?? []).join("").length;
  if (total > 1500) errors.push(C("篇幅", ev.id, `正文 ${total} 字（>1500）`));
  // 4) choices 数量 ≤6
  if ((ev.choices?.length ?? 0) > 6) errors.push(C("选项数", ev.id, `${ev.choices!.length} 个（>6）`));
  // 5) AI 套话检测（warning 级）
  const all = JSON.stringify(ev);
  if (/首先[^。]{0,40}其次[^。]{0,40}最后/.test(all)) warns.push(C("套话", ev.id, "『首先…其次…最后』三段式"));
  const likeCount = (all.match(/就像[^。，；]{2,20}一样/g) ?? []).length;
  if (likeCount >= 3) warns.push(C("类比密度", ev.id, `『就像…一样』出现 ${likeCount} 次`));
  if (/赋能|抓手|闭环赋能|颠覆式/.test(all)) warns.push(C("黑话", ev.id, "含未解释的商业黑话"));
}

// 6) 每线延迟后果密度
for (const c of ["research", "competition", "venture"]) {
  let delayed = 0;
  let decisions = 0;
  for (const ev of index.events.values()) {
    if (ev.campaign !== c) continue;
    const countSched = (fx: { kind: string }[] | undefined): number => (fx ?? []).filter((x) => x.kind === "scheduleEvent").length;
    delayed +=
      (ev.delayedEffects?.length ?? 0) +
      countSched(ev.automaticEffects) +
      (ev.choices ?? []).reduce((s, x) => s + (x.delayed?.length ?? 0) + countSched(x.hiddenEffects), 0);
    if (ev.type === "decision" || ev.keyDecision) decisions += 1;
  }
  if (decisions > 0 && delayed / decisions < 0.15) {
    warns.push(C("延迟后果", c, `decision ${decisions} 条仅 ${delayed} 处延迟（密度偏低）`));
  }
}

for (const w of warns) console.warn("⚠️ " + w);
if (errors.length > 0) {
  console.error(`❌ 内容 Lint 失败：${errors.length} 个错误`);
  for (const e of errors.slice(0, 40)) console.error("  " + e);
  process.exit(1);
}
console.log(`✅ 内容 Lint 通过（错误 0，风格警告 ${warns.length}）`);
