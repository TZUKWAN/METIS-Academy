# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.e2e.spec.ts >> 能力页显示能力图谱
- Location: tests\e2e\app.e2e.spec.ts:94:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /能力|技能/ }).first()

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
  1   | // E2E V2: Title Screen → Hub → In-Game flow
  2   | import { test, expect, _electron, type ElectronApplication, type Page } from '@playwright/test';
  3   | const desktopRoot = process.cwd();
  4   | 
  5   | let electronApp: ElectronApplication;
  6   | let page: Page;
  7   | 
  8   | test.beforeAll(async () => {
  9   |   electronApp = await _electron.launch({ args: ['.'], cwd: desktopRoot, env: { ...process.env, NODE_ENV: 'production' } });
  10  |   for (let i = 0; i < 60; i++) {
  11  |     const wins = electronApp.windows();
  12  |     if (wins.length > 0) { page = wins[0]!; break; }
  13  |     await new Promise((r) => setTimeout(r, 500));
  14  |   }
  15  |   if (!page) throw new Error('窗口未出现');
  16  |   await page.waitForLoadState('domcontentloaded');
  17  |   await page.waitForTimeout(1000);
  18  | });
  19  | 
  20  | test.afterAll(async () => { await electronApp.close(); });
  21  | 
  22  | /** 确保在主界面（如果有 Title Screen 就跳到 Hub → In-Game） */
  23  | async function ensureInGame(): Promise<void> {
  24  |   // 如果已经有左侧导航说明在游戏中
  25  |   if (await page.locator('nav').isVisible().catch(() => false)) return;
  26  |   // 尝试从 Title Screen 进入：点击第一条主线的"新周目"
  27  |   const newBtn = page.getByRole('button', { name: /新周目/ }).first();
  28  |   if (await newBtn.isVisible().catch(() => false)) {
  29  |     await newBtn.click();
  30  |     const nameInput = page.getByPlaceholder(/角色名/);
  31  |     if (await nameInput.isVisible().catch(() => false)) {
  32  |       await nameInput.fill('E2E');
  33  |     }
  34  |     const startBtn = page.getByRole('button', { name: '开始', exact: true });
  35  |     if (await startBtn.isVisible().catch(() => false)) {
  36  |       await startBtn.click();
  37  |     }
  38  |     await page.waitForTimeout(1000);
  39  |     return;
  40  |   }
  41  |   // 尝试从 Hub 进入（点击剧情）
  42  |   const storyBtn = page.getByRole('button', { name: '剧情', exact: true });
  43  |   if (await storyBtn.isVisible().catch(() => false)) {
  44  |     await storyBtn.click();
  45  |     await page.waitForTimeout(500);
  46  |   }
  47  | }
  48  | 
  49  | test('Title Screen 显示标题与菜单', async () => {
  50  |   await expect(page.getByText('METIS Academy')).toBeVisible();
  51  | });
  52  | 
  53  | test('Title Screen 有三条主线入口', async () => {
  54  |   // Title Screen 可能显示三条主线或 Hub 入口
  55  |   const hasResearch = await page.getByText(/科研|研究/).first().isVisible().catch(() => false);
  56  |   const hasNewGame = await page.getByText(/新|开始/).first().isVisible().catch(() => false);
  57  |   expect(hasResearch || hasNewGame).toBe(true);
  58  | });
  59  | 
  60  | test('进入游戏 → 剧情页可见', async () => {
  61  |   await enterGame();
  62  |   // 剧情页应有任务信息或剧情文本
  63  |   const hasStory = await page.getByText(/任务：|剧情|DAY|天/).first().isVisible().catch(() => false);
  64  |   expect(hasStory).toBe(true);
  65  | });
  66  | 
  67  | test('做出选择推进剧情', async () => {
  68  |   await enterGame();
  69  |   // 尝试推进剧情并做选择
  70  |   for (let i = 0; i < 15; i++) {
  71  |     const choice = page.locator('button').filter({ hasText: /直接|先|让|查|搜索|问|帮/ }).first();
  72  |     if (await choice.isVisible().catch(() => false)) {
  73  |       await choice.click();
  74  |       await page.waitForTimeout(300);
  75  |       break;
  76  |     }
  77  |     await page.mouse.click(640, 400);
  78  |     await page.waitForTimeout(300);
  79  |   }
  80  |   // 无论如何应该能看到游戏 UI 元素
  81  |   const hasUI = await page.getByText(/结束这一天|任务|剧情|选择/).first().isVisible().catch(() => false);
  82  |   expect(hasUI).toBe(true);
  83  | });
  84  | 
  85  | test('工作台可访问且有内容', async () => {
  86  |   await ensureInGame();
  87  |   const wbBtn = page.getByRole('button', { name: '工作台' }).first();
  88  |   await wbBtn.click({ force: true, timeoutMs: 5000 });
  89  |   await page.waitForTimeout(500);
  90  |   const hasWorkbench = await page.getByText(/AI Agent|终端|工作台/).first().isVisible().catch(() => false);
  91  |   expect(hasWorkbench).toBe(true);
  92  | });
  93  | 
  94  | test('能力页显示能力图谱', async () => {
  95  |   await ensureInGame();
  96  |   const skillBtn = page.getByRole('button', { name: /能力|技能/ }).first();
> 97  |   await skillBtn.click({ force: true, timeoutMs: 5000 });
      |                  ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  98  |   await page.waitForTimeout(500);
  99  |   const hasSkills = await page.getByText(/能力|技能|图谱/).first().isVisible().catch(() => false);
  100 |   expect(hasSkills).toBe(true);
  101 | });
  102 | 
  103 | test('方法库可搜索', async () => {
  104 |   await ensureInGame();
  105 |   const libBtn = page.getByRole('button', { name: /方法库|知识/ }).first();
  106 |   await libBtn.click({ force: true, timeoutMs: 5000 });
  107 |   await page.waitForTimeout(500);
  108 |   const hasLibrary = await page.getByText(/知识卡|方法|搜索/).first().isVisible().catch(() => false);
  109 |   expect(hasLibrary).toBe(true);
  110 | });
  111 | 
  112 | test('设置页显示 AI 服务', async () => {
  113 |   await ensureInGame();
  114 |   const setBtn = page.getByRole('button', { name: /设置/ }).first();
  115 |   await setBtn.click({ force: true, timeoutMs: 5000 });
  116 |   await page.waitForTimeout(500);
  117 |   const hasSettings = await page.getByText(/AI|设置|Provider/).first().isVisible().catch(() => false);
  118 |   expect(hasSettings).toBe(true);
  119 | });
  120 | 
```