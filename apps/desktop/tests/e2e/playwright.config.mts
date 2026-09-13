import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.e2e.spec.ts",
  timeout: 120000,
  workers: 1,
  fullyParallel: false,
  use: {},
});
