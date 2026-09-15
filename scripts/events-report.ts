// METIS Academy — Event Report
// 按线输出全部事件索引：ID / Day / Type / NPC / Meaningful / Delayed / Hidden / NG+ / Trigger
// 输出 markdown 到 docs/continuous-quality/final/<line>-event-index.md 和 stdout 摘要。

import { loadContentDir } from "../packages/content-schema/src/index.js";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { index } = await loadContentDir(path.join(root, "content"));

const outDir = path.join(root, "docs/continuous-quality/final");
fs.mkdirSync(outDir, { recursive: true });

for (const line of ["research", "competition", "venture"]) {
  const evs = [...index.events.values()]
    .filter((e) => e.campaign === line)
    .sort((a, b) => a.day - b.day || a.id.localeCompare(b.id));

  const rows = evs.map((e) => {
    const t = e.trigger as { kind: string };
    const delayed = (e.delayedEffects?.length ?? 0) > 0 || (e.choices ?? []).some((c) => (c.delayed?.length ?? 0) > 0);
    return `| ${e.id} | ${e.day} | ${e.type} | ${(e.scene?.characters ?? []).join(",") || "-"} | ${e.keyDecision ? "Y" : "-"} | ${delayed ? "Y" : "-"} | ${e.hidden ? "Y" : "-"} | ${e.ngPlus ? "Y" : "-"} | ${t.kind} |`;
  });

  const md = [
    `# ${line} Event Index`,
    "",
    `Total: ${evs.length} events`,
    "",
    "| ID | Day | Type | NPC | Meaningful | Delayed | Hidden | NG+ | Trigger |",
    "|---|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, `${line}-event-index.md`), md);
  console.log(`${line}: ${evs.length} events → docs/continuous-quality/final/${line}-event-index.md`);
}
