#!/usr/bin/env node
// 构建：1) esbuild 编译 main/preload（CJS, external 本机模块与 workspace 源码包）
//       2) vite 构建 renderer
// workspace 的 TS 源码包（@metis/*）在 renderer 里由 vite 打包；在 main 里由 esbuild 打包（不 external）
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, "..");

console.log("[build] main/preload (esbuild)…");
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
  sourcemap: false,
  tsconfig: path.join(desktopRoot, "tsconfig.json"),
});

console.log("[build] renderer (vite)…");
await new Promise((resolve, reject) => {
  const p = spawn("npx", ["vite", "build"], { cwd: desktopRoot, shell: true, stdio: "inherit" });
  p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`vite exit ${code}`))));
});

// electron-builder 需要的 main 入口
const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, "package.json"), "utf-8"));
console.log(`[build] done. main=${pkg.main}`);
