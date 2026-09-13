// 剧情文本质量深度扫描：找出所有不通顺、残留补丁痕迹、格式异常的文本
import { loadContentDir } from "../packages/content-schema/src/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { index } = await loadContentDir(path.join(root, "content"));
const issues: string[] = [];

function checkText(text: string, ctx: string): void {
  // 重复标点
  if (/[[。。！！？？]{3,}]{3,}/.test(text)) issues.push(`[重复标点] ${ctx}: "${text.slice(0, 40)}"`);
  // 以逗号结尾的句子（不自然断句）
  if (/[,，]$/.test(text.trim()) && text.trim().length > 5) issues.push(`[逗号结尾] ${ctx}: "${text.slice(-30)}"`);
  // 残留的正则补丁痕迹
  if (/\\u[0-9a-fA-F]{4}/.test(text)) issues.push(`[Unicode残留] ${ctx}: "${text.slice(0, 40)}"`);
  if (/\\n(?![^"]*")/.test(text)) issues.push(`[转义残留] ${ctx}: "${text.slice(0, 40)}"`);
  // 引号不匹配
  const openCount = (text.match(/["\u201c]/g) ?? []).length;
  const closeCount = (text.match(/["\u201d]/g) ?? []).length;
  if (openCount !== closeCount && openCount > 0) issues.push(`[引号不匹配] ${ctx}: "${text.slice(0, 50)}"`);
  // 混合中英文空格
  if (/[a-zA-Z] [a-zA-Z] [a-zA-Z] [a-zA-Z] [a-zA-Z]/.test(text) && !/the|and|for|with/.test(text)) {
    // 可能是中文中夹了太多英文单词
  }
  // 空括号
  if (/\(\)|\uff08\uff09/.test(text)) issues.push(`[空括号] ${ctx}: "${text.slice(0, 40)}"`);
  // 重复词汇
  if (/(.{2})\1{2,}/.test(text) && !/……/.test(text)) issues.push(`[重复词] ${ctx}: "${text.slice(0, 40)}"`);
}

// 扫描所有事件
for (const ev of index.events.values()) {
  for (const d of ev.dialogue) {
    checkText(d.text, `dialogue:${ev.id}/${d.speaker}`);
  }
  for (const st of ev.setup ?? []) {
    checkText(st, `setup:${ev.id}`);
  }
  for (const ch of ev.choices ?? []) {
    checkText(ch.text, `choice:${ev.id}/${ch.id}`);
    if (ch.visibleResponse) checkText(ch.visibleResponse, `response:${ev.id}/${ch.id}`);
  }
}

// 扫描所有结局
for (const e of index.endings.values()) {
  checkText(e.baseText, `ending:${e.id}`);
  for (const s of e.sections_placeholder ?? []) checkText(s, `ending-section:${e.id}`);
  for (const rule of e.characterEpilogueRules) {
    checkText(rule.positive, `epilogue-pos:${e.id}`);
    checkText(rule.neutral, `epilogue-neu:${e.id}`);
    checkText(rule.negative, `epilogue-neg:${e.id}`);
  }
  for (const rule of e.projectFutureRules) {
    checkText(rule.text, `future:${e.id}`);
  }
  for (const rule of e.specialFlagSections) {
    checkText(rule.text, `flag:${e.id}`);
  }
  checkText(e.reflection, `reflection:${e.id}`);
}

// 扫描知识卡
for (const k of index.knowledge.values()) {
  for (const field of [k.depth30s, k.depth3m]) {
    checkText(field, `knowledge:${k.id}`);
  }
}

if (issues.length > 0) {
  console.error(`❌ 文本质量扫描发现 ${issues.length} 个问题：`);
  for (const i of issues.slice(0, 30)) console.error("  " + i);
  if (issues.length > 30) console.error(`  ...其余 ${issues.length - 30} 个`);
  process.exit(1);
}
console.log(`✅ 文本质量扫描通过：${index.events.size} 事件 + ${index.endings.size} 结局 + ${index.knowledge.size} 知识卡 无异常`);
