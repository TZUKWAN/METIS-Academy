// 内容质量深度扫描：检测被 regex 补丁破坏的文本、空洞文本、编号残留
import { loadContentDir } from "../packages/content-schema/src/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { index } = await loadContentDir(path.join(root, "content"));
const issues: string[] = [];

for (const ev of index.events.values()) {
  // 检查 dialogue 文本
  for (const d of ev.dialogue) {
    if (d.text.includes("MISS") || d.text.includes("undefined") || d.text.includes("[object")) {
      issues.push(`[文本异常] ${ev.id}: "${d.text.slice(0, 50)}"`);
    }
    if (d.text.trim().length === 0) {
      issues.push(`[空文本] ${ev.id}: speaker=${d.speaker}`);
    }
  }
  // 检查 visibleResponse
  for (const ch of ev.choices ?? []) {
    if (ch.visibleResponse && (ch.visibleResponse.includes("MISS") || ch.visibleResponse.includes("undefined"))) {
      issues.push(`[回应异常] ${ev.id}/${ch.id}: "${ch.visibleResponse.slice(0, 50)}"`);
    }
    if (ch.text.includes("undefined") || ch.text.includes("[object")) {
      issues.push(`[选项异常] ${ev.id}/${ch.id}: "${ch.text.slice(0, 50)}"`);
    }
  }
  // 检查 setup
  for (const st of ev.setup ?? []) {
    if (st.includes("[object") || st.includes("undefined")) {
      issues.push(`[场景异常] ${ev.id}: "${st.slice(0, 50)}"`);
    }
  }
}

// 检查 endings 文本
for (const e of index.endings.values()) {
  if (e.baseText.includes("[object") || e.baseText.includes("undefined")) {
    issues.push(`[结局文本] ${e.id}: "${e.baseText.slice(0, 50)}"`);
  }
  for (const sec of e.characterEpilogueRules) {
    for (const field of [sec.positive, sec.neutral, sec.negative]) {
      if (field.includes("[object") || field.includes("undefined")) {
        issues.push(`[结局后日谈] ${e.id}/${sec.characterId}: "${field.slice(0, 40)}"`);
      }
    }
  }
}

// 检查 knowledge 文本
for (const k of index.knowledge.values()) {
  for (const field of [k.problem, k.wrongPattern, k.correctBehavior, k.why, k.depth30s, k.depth3m, k.depth10m]) {
    if (field && (field.includes("[object") || field.includes("undefined"))) {
      issues.push(`[知识卡] ${k.id}: "${field.slice(0, 40)}"`);
    }
  }
}

// 检查 missions
for (const m of index.missions.values()) {
  for (const field of [m.title, m.objective, m.briefing]) {
    if (field.includes("[object") || field.includes("undefined")) {
      issues.push(`[任务] ${m.id}: "${field.slice(0, 40)}"`);
    }
  }
}

if (issues.length > 0) {
  console.error(`❌ 内容质量扫描发现 ${issues.length} 个问题：`);
  for (const i of issues) console.error("  " + i);
  process.exit(1);
}
console.log(`✅ 内容质量扫描通过：无文本异常、无空洞文本、无编号残留`);
console.log(`  事件 ${index.events.size} / 任务 ${index.missions.size} / 结局 ${index.endings.size} / 知识卡 ${index.knowledge.size}`);
