// METIS Academy — Gate Runner
// 运行单个机器 Gate 并把结果写入 quality/evidence/<gate>.json（带 gitSha）。
// 用法: npx tsx scripts/run-gate.ts <gate>
// Gates: content | reachability | witness | similarity | lint | typecheck | unit | e2e | build | assets

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gate = process.argv[2];

if (!gate) {
  console.error("Usage: npx tsx scripts/run-gate.ts <gate>");
  console.error("Gates: content | reachability | witness | similarity | lint | typecheck | unit | e2e | build | assets");
  process.exit(2);
}

function headSha(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function writeEvidence(gate: string, pass: boolean, detail: string, extra?: Record<string, unknown>): void {
  const dir = path.join(root, "quality/evidence");
  fs.mkdirSync(dir, { recursive: true });
  const ev = {
    gate,
    gitSha: headSha(),
    pass,
    detail,
    at: new Date().toISOString(),
    extra: extra ?? {},
  };
  fs.writeFileSync(path.join(dir, `${gate}.json`), JSON.stringify(ev, null, 2));
  console.log(`\nEvidence written: quality/evidence/${gate}.json (pass=${pass})`);
}

function run(cmd: string, args: string[], opts: { timeout?: number } = {}): { code: number; stdout: string; stderr: string } {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: opts.timeout ?? 300_000,
  });
  return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

// ===== Gate 实现 =====
switch (gate) {
  case "content": {
    const r = run("npx", ["tsx", "scripts/validate-content.ts"], { timeout: 180_000 });
    const pass = r.code === 0;
    const errCount = (r.stdout.match(/error/gi) ?? []).length;
    writeEvidence("content", pass, pass ? "content validate pass" : r.stdout.slice(-1500) + r.stderr.slice(-500), { exitCode: r.code });
    process.exit(pass ? 0 : 1);
    break;
  }
  case "reachability": {
    const r = run("npx", ["tsx", "scripts/reachability.ts"], { timeout: 180_000 });
    // reachability.ts 成功 exit 0；无不可达事件才算 pass
    const unreachableMatch = r.stdout.match(/不可达[^\d]*(\d+)/);
    const unreachable = unreachableMatch ? Number(unreachableMatch[1]) : r.code === 0 ? 0 : -1;
    const pass = r.code === 0 && unreachable === 0;
    writeEvidence("reachability", pass, pass ? "0 unreachable" : r.stdout.slice(-1200), { unreachable });
    process.exit(pass ? 0 : 1);
    break;
  }
  case "witness": {
    const r = run("npx", ["tsx", "scripts/witness-audit.ts"], { timeout: 300_000 });
    const pass = r.code === 0;
    const m = r.stdout.match(/coverage[=:\s]+(\d+)%/i);
    writeEvidence("witness", pass, pass ? "all witnesses replay" : r.stdout.slice(-1500), {
      coverage: m ? Number(m[1]) : 0,
    });
    process.exit(pass ? 0 : 1);
    break;
  }
  case "similarity": {
    const r = run("npx", ["tsx", "scripts/similarity-audit.ts"], { timeout: 180_000 });
    const pass = r.code === 0;
    const m = r.stdout.match(/blockers?[=:\s]+(\d+)/i);
    writeEvidence("similarity", pass, pass ? "0 blockers" : r.stdout.slice(-1500), {
      blockers: m ? Number(m[1]) : -1,
    });
    process.exit(pass ? 0 : 1);
    break;
  }
  case "lint": {
    const r = run("pnpm", ["lint"], { timeout: 300_000 });
    const pass = r.code === 0;
    writeEvidence("lint", pass, pass ? "0 problems" : (r.stdout + r.stderr).slice(-1500));
    process.exit(pass ? 0 : 1);
    break;
  }
  case "typecheck": {
    const r = run("pnpm", ["typecheck"], { timeout: 300_000 });
    const pass = r.code === 0;
    writeEvidence("typecheck", pass, pass ? "0 errors" : (r.stdout + r.stderr).slice(-1500));
    process.exit(pass ? 0 : 1);
    break;
  }
  case "unit": {
    const r = run("pnpm", ["test"], { timeout: 600_000 });
    const out = r.stdout + r.stderr;
    const m = out.match(/(\d+) passed/i);
    const f = out.match(/(\d+) failed/i);
    const passed = m ? Number(m[1]) : 0;
    const failed = f ? Number(f[1]) : r.code === 0 ? 0 : -1;
    const pass = r.code === 0 && failed === 0;
    writeEvidence("unit", pass, pass ? `${passed} tests passed` : out.slice(-1500), { passed, failed });
    process.exit(pass ? 0 : 1);
    break;
  }
  case "e2e": {
    const r = run("pnpm", ["test:e2e"], { timeout: 600_000 });
    const out = r.stdout + r.stderr;
    const m = out.match(/(\d+) passed/i);
    const f = out.match(/(\d+) failed/i);
    const passed = m ? Number(m[1]) : 0;
    const failed = f ? Number(f[1]) : -1;
    const pass = r.code === 0 && failed === 0 && passed > 0;
    writeEvidence("e2e", pass, pass ? `${passed} e2e passed` : out.slice(-1500), { passed, failed, total: passed + Math.max(failed, 0) });
    process.exit(pass ? 0 : 1);
    break;
  }
  case "build": {
    const r = run("pnpm", ["build"], { timeout: 600_000 });
    const pass = r.code === 0;
    writeEvidence("build", pass, pass ? "build ok" : (r.stdout + r.stderr).slice(-1500));
    process.exit(pass ? 0 : 1);
    break;
  }
  case "assets": {
    const r = run("npx", ["tsx", "scripts/asset-audit.ts"], { timeout: 120_000 });
    const pass = r.code === 0;
    const unknown = (r.stdout.match(/unknown[=:\s]+(\d+)/i) ?? [])[1];
    writeEvidence("assets", pass, pass ? "all assets licensed" : r.stdout.slice(-1500), {
      unknown: unknown ? Number(unknown) : 0,
    });
    process.exit(pass ? 0 : 1);
    break;
  }
  default:
    console.error(`Unknown gate: ${gate}`);
    process.exit(2);
}
