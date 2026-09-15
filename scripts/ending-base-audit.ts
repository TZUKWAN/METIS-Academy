// METIS Academy — Base Ending 独立性审计
// 检查：
// 1. whyDistinct 缺失率（独立性声明）
// 2. family 分布（Ending Matrix 家族覆盖）
// 3. tone 分布（情绪配比目标：positive 20-30% / negative 20-30% / mixed 30-40% / ambiguous 10-20%）
// 4. 标题裸测（空泛标题率：如"新的开始/另一个选择/意外结果"）
// 5. mainResult 高相似对（核心结果重复）
// Exit 0 = 无 blocker；Exit 1 = 有 blocker

import { loadContentDir } from "../packages/content-schema/src/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { index } = await loadContentDir(path.join(root, "content"));

const GENERIC_TITLES = new Set([
  "新的开始", "另一个选择", "意外结果", "失败的项目", "重新出发", "结束", "开始",
  "新的起点", "落幕", "尾声", "结局", "完成", "失败", "成功", "平淡的一天",
]);

interface Blocker { kind: string; id: string; detail: string }

const blockers: Blocker[] = [];
const warnings: string[] = [];

const endings = [...index.endings.values()].filter((e) => e.campaign !== "global");
console.log(`\n===== Base Ending Independence Audit =====\nTotal base endings: ${endings.length}\n`);

// 1. whyDistinct
const noWhy = endings.filter((e) => !(e as { whyDistinct?: string }).whyDistinct);
console.log(`whyDistinct 缺失: ${noWhy.length}/${endings.length}`);
if (noWhy.length > endings.length * 0.5) {
  blockers.push({ kind: "whyDistinct", id: "*", detail: `${noWhy.length}/${endings.length} endings lack whyDistinct declaration` });
}

// 2. family 分布
const families: Record<string, number> = {};
for (const e of endings) {
  const fam = (e as { family?: string }).family ?? "(none)";
  families[fam] = (families[fam] ?? 0) + 1;
}
console.log(`family 分布: ${JSON.stringify(families)}`);
const famCount = Object.keys(families).filter((f) => f !== "(none)").length;

// 3. tone 分布（按线）
console.log("\n情绪分布（目标 positive 20-30% / negative 20-30% / mixed 30-40% / ambiguous 10-20%）:");
for (const line of ["research", "competition", "venture"]) {
  const le = endings.filter((e) => e.campaign === line);
  const tones: Record<string, number> = { positive: 0, negative: 0, mixed: 0, ambiguous: 0, unset: 0 };
  for (const e of le) {
    const t = (e as { tone?: string }).tone ?? "unset";
    tones[t] = (tones[t] ?? 0) + 1;
  }
  const pct = (n: number) => (le.length ? Math.round((n / le.length) * 100) : 0);
  console.log(
    `  ${line}: pos=${pct(tones.positive)}% neg=${pct(tones.negative)}% mixed=${pct(tones.mixed)}% amb=${pct(tones.ambiguous)}% unset=${tones.unset}`,
  );
  if (tones.unset === le.length && le.length >= 20) {
    warnings.push(`${line}: 全部结局未标 tone（${le.length} 个）`);
  }
}

// 4. 标题裸测
const generic = endings.filter((e) => GENERIC_TITLES.has(e.title.trim()));
console.log(`\n空泛标题: ${generic.length}`);
for (const g of generic) blockers.push({ kind: "genericTitle", id: g.id, detail: `"${g.title}" 是空泛标题` });

// 5. mainResult 相同文本重复
const byResult = new Map<string, string[]>();
for (const e of endings) {
  const key = e.mainResult.replace(/\s+/g, "");
  byResult.set(key, [...(byResult.get(key) ?? []), e.id]);
}
for (const [result, ids] of byResult) {
  if (ids.length > 1) {
    blockers.push({ kind: "duplicateMainResult", id: ids.join(","), detail: `"${result}" 被 ${ids.length} 个结局共用` });
  }
}

console.log(`\n家族数（各线合计）: ${famCount}`);
console.log(`Blockers: ${blockers.length}`);
for (const b of blockers.slice(0, 30)) console.log(`  ❌ [${b.kind}] ${b.id}: ${b.detail}`);
console.log(`Warnings: ${warnings.length}`);
for (const w of warnings) console.log(`  ⚠ ${w}`);

if (blockers.length === 0) {
  console.log("\nENDING BASE AUDIT: PASS");
  process.exit(0);
} else {
  console.log("\nENDING BASE AUDIT: FAIL");
  process.exit(1);
}
