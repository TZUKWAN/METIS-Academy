// §U 教学门禁：所有关键能力至少在剧情中实际使用一次
// 触点判定：任一事件的 skillCheck / choices.hiddenEffects(unlockSkill) / missions.recommendedSkills /
//          knowledge.relatedSkillIds / events.automaticEffects(unlockSkill) 引用了该原子 id
import { loadContentDir } from "../packages/content-schema/src/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { index } = await loadContentDir(path.join(root, "content"));

const usage = new Map<string, string[]>();
for (const id of index.skills.keys()) usage.set(id, []);

const touch = (id: string, where: string): void => {
  if (usage.has(id)) usage.get(id)!.push(where);
};

for (const ev of index.events.values()) {
  for (const ch of ev.choices ?? []) {
    for (const fx of ch.hiddenEffects ?? []) if (fx.kind === "unlockSkill") touch(fx.skillId, `event:${ev.id}`);
    if (ch.skillCheck) touch(ch.skillCheck.skillId, `event:${ev.id}`);
  }
  for (const fx of ev.automaticEffects ?? []) if (fx.kind === "unlockSkill") touch(fx.skillId, `event:${ev.id}`);
}
for (const m of index.missions.values()) {
  for (const s of m.recommendedSkills) touch(s, `mission:${m.id}`);
}
for (const k of index.knowledge.values()) {
  for (const s of k.relatedSkillIds) touch(s, `knowledge:${k.id}`);
}

const uncovered = [...usage.entries()].filter(([, where]) => where.length === 0).map(([id]) => id);
console.log(`能力原子总数: ${usage.size}，有剧情触点: ${usage.size - uncovered.length}，未触达: ${uncovered.length}`);
if (uncovered.length > 0) {
  console.error("❌ 以下能力原子无剧情触点：");
  for (const id of uncovered) console.error("  " + id);
  process.exit(1);
}
console.log("✅ 全部能力原子均在剧情/知识卡中至少被使用或引用一次");
