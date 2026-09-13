#!/usr/bin/env node
// 开发模式：并行启动 Vite（renderer）与 Electron（main）
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, "..");

console.log("[dev] 编译 main/preload…");
await esbuild.build({
  entryPoints: [
    path.join(desktopRoot, "src/main/main.ts"),
    path.join(desktopRoot, "src/preload/index.ts"),
  ],
  outdir: path.join(desktopRoot, "dist"),
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron", "better-sqlite3"],
  sourcemap: "inline",
});

console.log("[dev] 启动 Vite…");
const vite = spawn("npx", ["vite"], { cwd: desktopRoot, shell: true, stdio: "inherit" });

async function waitFor(url, timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise((resolve) => {
      const req = http.get(url, (res) => {
        resolve(res.statusCode !== undefined && res.statusCode < 500);
        req.destroy();
      });
      req.on("error", () => resolve(false));
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

const ready = await waitFor("http://localhost:5183");
if (!ready) {
  console.error("[dev] Vite 未就绪，退出");
  vite.kill();
  process.exit(1);
}

console.log("[dev] 启动 Electron…");
const electron = spawn("npx", ["electron", "."], {
  cwd: desktopRoot,
  shell: true,
  stdio: "inherit",
  env: { ...process.env, VITE_DEV_SERVER_URL: "http://localhost:5183", NODE_ENV: "development" },
});

electron.on("close", () => {
  vite.kill();
  process.exit(0);
});
process.on("SIGINT", () => {
  vite.kill();
  electron.kill();
  process.exit(0);
});
