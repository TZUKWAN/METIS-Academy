// METIS Academy — Requirements Audit
// 将源码指标与 quality/requirements/latest.yaml 逐项比对。
// Exit 0 = 全部达标；Exit 1 = 有差距（打印全部差距）。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { collectMetrics } from "./collect-quality-metrics.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REQ = parseYaml(
  fs.readFileSync(path.join(root, "quality/requirements/latest.yaml"), "utf8"),
) as Record<string, Record<string, number>>;

const metrics = await collectMetrics();

const failures: string[] = [];
const passes: string[] = [];
const lineMap: Array<[string, string]> = [
  ["research", "Research"],
  ["competition", "Competition"],
  ["venture", "Venture"],
];

for (const [line, name] of lineMap) {
  const req = REQ[line]!;
  const m = metrics[line as keyof typeof metrics] as Record<string, number>;
  for (const [k, need] of Object.entries(req)) {
    const cur = m[k] ?? 0;
    if (cur >= need) passes.push(`${name}.${k}: ${cur}/${need}`);
    else failures.push(`${name}.${k}: ${cur}/${need} (缺 ${need - cur})`);
  }
}
for (const [k, need] of Object.entries(REQ.total!)) {
  const cur = (metrics.totals as Record<string, number>)[k] ?? 0;
  if (cur >= need) passes.push(`Total.${k}: ${cur}/${need}`);
  else failures.push(`Total.${k}: ${cur}/${need} (缺 ${need - cur})`);
}

console.log("\n===== Requirements Audit =====\n");
console.log(`Git SHA: ${metrics.gitSha}\n`);
console.log(`PASS: ${passes.length}   FAIL: ${failures.length}\n`);
if (failures.length > 0) {
  console.log("Unmet requirements:");
  for (const f of failures) console.log(`  ❌ ${f}`);
  process.exit(1);
} else {
  console.log("ALL REQUIREMENTS MET");
  process.exit(0);
}
