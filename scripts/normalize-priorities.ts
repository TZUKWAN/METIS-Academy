// METIS Academy — 结局优先级规范化
// 规则：凡 requirements 中不含任何"旗标/资产/知识"类条件（即纯数值/关系结局）
// 且 tier != hidden 且非 ngPlus 的"通用结局"，priority 一律封顶 88。
// 这样保证旗标守卫的具体结局（90-99）永远不会被通用结局抢走结算。
// 用法: npx tsx scripts/normalize-priorities.ts [--dry]

import { loadContentDir } from "../packages/content-schema/src/index.js";
import type { Condition } from "../packages/content-schema/src/index.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dry = process.argv.includes("--dry");

// 共享流程旗标：多个结局共用、几乎每局都会设置（如 *_final_done / *_done），
// 不构成"具体性守卫"，不能豁免通用结局的优先级封顶。
const SHARED_FLAGS = new Set(["c_final_done", "v_final_done", "r_final_done", "defense_done"]);

function isSpecificFlag(key: string): boolean {
  return !SHARED_FLAGS.has(key) && !/_final_done$|_done$/.test(key);
}

function hasGateCondition(c: Condition): boolean {
  switch (c.kind) {
    case "flag":
      return c.key !== undefined && isSpecificFlag(c.key);
    case "flagValue":
    case "assetType":
    case "assetExists":
    case "skill":
    case "knowledge":
    case "ngPlus":
      return true;
    case "and":
    case "or":
      return c.conditions.some(hasGateCondition);
    case "not":
      return hasGateCondition(c.condition);
    default:
      return false;
  }
}

const { index } = await loadContentDir(path.join(root, "content"));

// 找出所有含 endings 定义的 YAML 文件
const endingFiles: string[] = [];
const walk = (dir: string): void => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.ya?ml$/.test(e.name)) endingFiles.push(full);
  }
};
walk(path.join(root, "content"));

let capped = 0;
for (const file of endingFiles) {
  const raw = fs.readFileSync(file, "utf8");
  const doc = parse(raw);
  const endings = doc?.endings;
  if (!Array.isArray(endings)) continue;
  let changed = false;
  for (const e of endings) {
    if (e.tier === "hidden" || e.ngPlus === true || e.ultraRare === true) continue;
    const req = e.requirements as Condition | undefined;
    if (!req) continue;
    if (!hasGateCondition(req) && typeof e.priority === "number" && e.priority > 88) {
      e.priority = 88;
      changed = true;
      capped += 1;
      console.log(`  cap ${e.id}: ${e.priority === 88 ? "?" : ""}→88 (纯数值通用结局)`);
    }
  }
  if (changed && !dry) {
    fs.writeFileSync(file, stringify(doc));
  }
}

console.log(`\nCapped ${capped} generic endings${dry ? " (dry run)" : ""}.`);
