// 终版一键门禁：按任务书 §29/§U 依次执行全部可机验检查
// 用法：npx tsx scripts/final-gate.ts
import { spawnSync } from "node:child_process";

interface GateResult { name: string; cmd: string[]; ok: boolean; tail: string }

const gates: { name: string; cmd: string[]; cwd?: string }[] = [
  { name: "内容验证（schema+跨引用+重复ID）", cmd: ["npx", "tsx", "scripts/validate-content.ts"] },
  { name: "能力触点覆盖（121/121）", cmd: ["npx", "tsx", "scripts/capability-coverage.ts"] },
  { name: "内容 Lint（K001）", cmd: ["npx", "tsx", "scripts/content-lint.ts"] },
  { name: "结局组合统计（≥200）", cmd: ["npx", "tsx", "scripts/count-endings.ts"] },
  { name: "剧情可达性（§37）", cmd: ["npx", "tsx", "scripts/reachability.ts"] },
  { name: "引擎单元测试（66）", cmd: ["npx", "vitest", "run", "--silent"], cwd: "packages/game-core" },
  { name: "Schema 单元测试（35）", cmd: ["npx", "vitest", "run", "--silent"], cwd: "packages/content-schema" },
];

const results: GateResult[] = [];
for (const g of gates) {
  const r = spawnSync(g.cmd[0]!, g.cmd.slice(1), { cwd: g.cwd ? g.cwd : root(), shell: true, encoding: "utf8" });
  const ok = r.status === 0;
  const tail = (r.stdout ?? "").trim().split(/\r?\n/).filter((l) => /✅|Tests|总计|单元测试|通过|原子|事件:|Lint|组合/.test(l)).slice(-2).join(" | ");
  results.push({ name: g.name, cmd: g.cmd.join(" "), ok, tail });
  console.log(`${ok ? "✅" : "❌"} ${g.name}${tail ? "  —— " + tail : ""}`);
}
function root(): string { return process.cwd(); }

// bot 三线（first 策略代表；完整 9 条见 PLAYTEST_RECORDS）
for (const c of ["research", "competition", "venture"]) {
  const r = spawnSync("npx", ["tsx", "scripts/bot.ts", c, "first"], { cwd: root(), shell: true, encoding: "utf8" });
  const ok = r.status === 0;
  results.push({ name: `bot 跑通 ${c}/first`, cmd: "", ok, tail: (r.stdout ?? "").trim().split(/\r?\n/).findLast?.((l) => l.includes("ending")) ?? "" });
  console.log(`${ok ? "✅" : "❌"} bot 跑通 ${c}/first`);
}

// 汇总
const failed = results.filter((r) => !r.ok);
console.log("\n===== 终版门禁汇总 =====");
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}`);
console.log(`\n${failed.length === 0 ? "✅ 全部门禁通过 — RELEASE READY" : `❌ ${failed.length} 项未通过`}`);
process.exit(failed.length === 0 ? 0 : 1);
