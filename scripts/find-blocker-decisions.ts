// 找出所有"必经决策且每个选项都设置旗标"的阻塞事件（需要加中立选项）
import { loadContentDir } from "../packages/content-schema/src/index.js";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { index } = await loadContentDir(path.join(root, "content"));

// 事件可达性近似：missionEntry 触发或被 next 引用即"必经"
const referenced = new Set<string>();
for (const ev of index.events.values()) {
  if (ev.next) referenced.add(ev.next);
  for (const c of ev.choices ?? []) if (c.next) referenced.add(c.next);
}
const out: string[] = [];
for (const ev of index.events.values()) {
  if (ev.type !== "decision" || ev.hidden || ev.ngPlus) continue;
  const trig = ev.trigger as { kind: string };
  const mandatory = trig.kind === "missionEntry" || trig.kind === "day" || referenced.has(ev.id);
  if (!mandatory) continue;
  const choices = ev.choices ?? [];
  if (choices.length === 0) continue;
  const allFlagged = choices.every((c) => (c.hiddenEffects ?? []).some((e) => e.kind === "setFlag"));
  if (allFlagged) {
    out.push(`${ev.campaign}\t${ev.id}\tday ${ev.day}\tchoices: ${choices.map((c) => c.id).join("/")}`);
  }
}
fs.writeFileSync(path.join(root, "quality/blocker-decisions.txt"), out.join("\n") + "\n");
console.log("blocker decisions:", out.length);
for (const l of out) console.log("  " + l);
