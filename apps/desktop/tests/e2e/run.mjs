// E2E 运行器：先构建，再以 Playwright Electron 启动测试
import { runMain } from "playwright/lib/program";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, "../..");

console.log("[e2e] 构建 renderer + main…");
const build = spawnSync("node", [path.join(desktopRoot, "scripts/build.mjs")], {
  stdio: "inherit",
  shell: true,
  cwd: desktopRoot,
});
if (build.status !== 0) {
  console.error("[e2e] 构建失败");
  process.exit(1);
}

process.env.PLAYWRIGHT_JSON_OUTPUT_NAME = "";
process.argv = [process.argv[0], "playwright", "test", "--config", path.join(__dirname, "playwright.config.ts")];
runMain();
