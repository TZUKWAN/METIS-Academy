// METIS Academy — Stale Reports 检测
// 所有 quality/evidence/*.json 的 gitSha 与 HEAD 不一致 → STALE，不得作为当前证据。
// Exit 0 = 全部新鲜；Exit 1 = 存在 STALE / 缺失。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let sha = "unknown";
try {
  sha = execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
} catch { /* ignore */ }

const evDir = path.join(root, "quality/evidence");
const gates = ["content", "reachability", "witness", "similarity", "lint", "typecheck", "unit", "e2e", "build", "assets"];

console.log(`\n===== Stale Reports Check (HEAD ${sha.slice(0, 8)}) =====\n`);
let stale = 0;
let missing = 0;
for (const g of gates) {
  const p = path.join(evDir, `${g}.json`);
  if (!fs.existsSync(p)) {
    console.log(`  MISSING  ${g}`);
    missing += 1;
    continue;
  }
  try {
    const ev = JSON.parse(fs.readFileSync(p, "utf8")) as { gitSha: string; pass: boolean; at: string };
    if (ev.gitSha !== sha) {
      console.log(`  STALE    ${g} (evidence @ ${ev.gitSha.slice(0, 8)}, pass=${ev.pass})`);
      stale += 1;
    } else if (!ev.pass) {
      console.log(`  FAILED   ${g} (fresh but failing)`);
      stale += 1;
    } else {
      console.log(`  FRESH    ${g} ✅`);
    }
  } catch {
    console.log(`  CORRUPT  ${g}`);
    stale += 1;
  }
}

if (stale === 0 && missing === 0) {
  console.log("\nALL EVIDENCE FRESH");
  process.exit(0);
} else {
  console.log(`\n${stale + missing} evidence files are STALE/MISSING/FAILED — not usable as current proof.`);
  process.exit(1);
}
