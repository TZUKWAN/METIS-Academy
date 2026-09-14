# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.e2e.spec.ts >> 设置页显示 Provider 信息
- Location: tests\e2e\app.e2e.spec.ts:81:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('nav button').filter({ hasText: '设置' }).first()

```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - generic [ref=f1e8]:
    - paragraph [ref=f1e9]: AI Agent Growth Simulator
    - heading "METIS Academy" [level=1] [ref=f1e10]
    - paragraph [ref=f1e12]: 在真实任务里，学会让 Agent 真正为你工作
  - generic [ref=f1e13]:
    - button "新的开始" [ref=f1e14] [cursor=pointer]
    - button "结局档案" [ref=f1e16] [cursor=pointer]
    - button "设置" [ref=f1e17] [cursor=pointer]
    - button "制作人员" [ref=f1e18] [cursor=pointer]
  - paragraph [ref=f1e20]: © 2026 METIS Academy · Open Source (MIT)
```

# Test source

```ts
  1  | // E2E V2: Title Screen → Hub → In-Game flow
  2  | import { test, expect, _electron, type ElectronApplication, type Page } from '@playwright/test';
  3  | const desktopRoot = process.cwd();
  4  | 
  5  | let electronApp: ElectronApplication;
  6  | let page: Page;
  7  | 
  8  | test.beforeAll(async () => {
  9  |   electronApp = await _electron.launch({ args: ['.'], cwd: desktopRoot, env: { ...process.env, NODE_ENV: 'production' } });
  10 |   for (let i = 0; i < 60; i++) {
  11 |     const wins = electronApp.windows();
  12 |     if (wins.length > 0) { page = wins[0]!; break; }
  13 |     await new Promise((r) => setTimeout(r, 500));
  14 |   }
  15 |   if (!page) throw new Error('窗口未出现');
  16 |   await page.waitForLoadState('domcontentloaded');
  17 |   await page.waitForTimeout(1000);
  18 | });
  19 | 
  20 | test.afterAll(async () => { await electronApp.close(); });
  21 | 
  22 | async function enterGame(): Promise<void> {
  23 |   if (await page.locator('nav').isVisible().catch(() => false)) return;
  24 |   const btn = page.getByRole('button', { name: /新周目/ }).first();
  25 |   if (await btn.isVisible().catch(() => false)) {
  26 |     await btn.click();
  27 |     const nameInput = page.getByPlaceholder(/角色名/);
  28 |     if (await nameInput.isVisible().catch(() => false)) { await nameInput.fill('E2E'); }
  29 |     const startBtn = page.getByRole('button', { name: '开始', exact: true });
  30 |     if (await startBtn.isVisible().catch(() => false)) { await startBtn.click(); }
  31 |     await page.waitForTimeout(1000);
  32 |     return;
  33 |   }
  34 |   const storyBtn = page.getByRole('button', { name: '剧情', exact: true });
  35 |   if (await storyBtn.isVisible().catch(() => false)) { await storyBtn.click(); await page.waitForTimeout(500); }
  36 | }
  37 | 
  38 | test('Title Screen 显示标题', async () => {
  39 |   await expect(page.getByText('METIS Academy').first()).toBeVisible();
  40 | });
  41 | 
  42 | test('Title Screen 有菜单入口', async () => {
  43 |   const hasNewGame = await page.getByText(/新|开始/).first().isVisible().catch(() => false);
  44 |   const hasSettings = await page.getByText(/设置/).first().isVisible().catch(() => false);
  45 |   expect(hasNewGame || hasSettings).toBe(true);
  46 | });
  47 | 
  48 | test('进入游戏后剧情页可见', async () => {
  49 |   await enterGame();
  50 |   const hasStory = await page.getByText(/任务：|剧情|DAY|天/).first().isVisible().catch(() => false);
  51 |   expect(hasStory).toBe(true);
  52 | });
  53 | 
  54 | test('工作台可导航', async () => {
  55 |   await enterGame();
  56 |   const wb = page.getByRole('button', { name: '工作台', exact: true }).first();
  57 |   await wb.click({ force: true });
  58 |   await page.waitForTimeout(500);
  59 |   const hasWb = await page.getByText(/AI Agent|终端|运行/).first().isVisible().catch(() => false);
  60 |   expect(hasWb).toBe(true);
  61 | });
  62 | 
  63 | test('能力页可导航', async () => {
  64 |   await enterGame();
  65 |   const skBtn = page.locator('nav button', { hasText: '能力' }).first();
  66 |   await skBtn.click({ force: true });
  67 |   await page.waitForTimeout(500);
  68 |   const hasSkills = await page.getByText(/能力|图谱/).first().isVisible().catch(() => false);
  69 |   expect(hasSkills).toBe(true);
  70 | });
  71 | 
  72 | test('方法库可搜索', async () => {
  73 |   await enterGame();
  74 |   const libBtn = page.locator('nav button', { hasText: '方法库' }).first();
  75 |   await libBtn.click({ force: true });
  76 |   await page.waitForTimeout(500);
  77 |   const hasLib = await page.getByText(/知识卡|方法|搜索/).first().isVisible().catch(() => false);
  78 |   expect(hasLib).toBe(true);
  79 | });
  80 | 
  81 | test('设置页显示 Provider 信息', async () => {
  82 |   await enterGame();
  83 |   const setBtn = page.locator('nav button', { hasText: '设置' }).first();
> 84 |   await setBtn.click({ force: true });
     |                ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  85 |   await page.waitForTimeout(500);
  86 |   const hasSettings = await page.getByText(/AI|设置|Provider|存储/).first().isVisible().catch(() => false);
  87 |   expect(hasSettings).toBe(true);
  88 | });
  89 | 
```