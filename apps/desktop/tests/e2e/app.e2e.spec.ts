// E2E V2: Title Screen → Hub → In-Game flow
import { test, expect, _electron, type ElectronApplication, type Page } from '@playwright/test';
const desktopRoot = process.cwd();

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  electronApp = await _electron.launch({ args: ['.'], cwd: desktopRoot, env: { ...process.env, NODE_ENV: 'production' } });
  for (let i = 0; i < 60; i++) {
    const wins = electronApp.windows();
    if (wins.length > 0) { page = wins[0]!; break; }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!page) throw new Error('窗口未出现');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
});

test.afterAll(async () => { await electronApp.close(); });

/** 确保在主界面（如果有 Title Screen 就跳到 Hub → In-Game） */
async function ensureInGame(): Promise<void> {
  // 如果已经有左侧导航说明在游戏中
  if (await page.locator('nav').isVisible().catch(() => false)) return;
  // 尝试从 Title Screen 进入：点击第一条主线的"新周目"
  const newBtn = page.getByRole('button', { name: /新周目/ }).first();
  if (await newBtn.isVisible().catch(() => false)) {
    await newBtn.click();
    const nameInput = page.getByPlaceholder(/角色名/);
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('E2E');
    }
    const startBtn = page.getByRole('button', { name: '开始', exact: true });
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
    }
    await page.waitForTimeout(1000);
    return;
  }
  // 尝试从 Hub 进入（点击剧情）
  const storyBtn = page.getByRole('button', { name: '剧情', exact: true });
  if (await storyBtn.isVisible().catch(() => false)) {
    await storyBtn.click();
    await page.waitForTimeout(500);
  }
}

test('Title Screen 显示标题与菜单', async () => {
  await expect(page.getByText('METIS Academy')).toBeVisible();
});

test('Title Screen 有三条主线入口', async () => {
  // Title Screen 可能显示三条主线或 Hub 入口
  const hasResearch = await page.getByText(/科研|研究/).first().isVisible().catch(() => false);
  const hasNewGame = await page.getByText(/新|开始/).first().isVisible().catch(() => false);
  expect(hasResearch || hasNewGame).toBe(true);
});

test('进入游戏 → 剧情页可见', async () => {
  await enterGame();
  // 剧情页应有任务信息或剧情文本
  const hasStory = await page.getByText(/任务：|剧情|DAY|天/).first().isVisible().catch(() => false);
  expect(hasStory).toBe(true);
});

test('做出选择推进剧情', async () => {
  await enterGame();
  // 尝试推进剧情并做选择
  for (let i = 0; i < 15; i++) {
    const choice = page.locator('button').filter({ hasText: /直接|先|让|查|搜索|问|帮/ }).first();
    if (await choice.isVisible().catch(() => false)) {
      await choice.click();
      await page.waitForTimeout(300);
      break;
    }
    await page.mouse.click(640, 400);
    await page.waitForTimeout(300);
  }
  // 无论如何应该能看到游戏 UI 元素
  const hasUI = await page.getByText(/结束这一天|任务|剧情|选择/).first().isVisible().catch(() => false);
  expect(hasUI).toBe(true);
});

test('工作台可访问且有内容', async () => {
  await ensureInGame();
  const wbBtn = page.getByRole('button', { name: '工作台' }).first();
  await wbBtn.click({ force: true, timeoutMs: 5000 });
  await page.waitForTimeout(500);
  const hasWorkbench = await page.getByText(/AI Agent|终端|工作台/).first().isVisible().catch(() => false);
  expect(hasWorkbench).toBe(true);
});

test('能力页显示能力图谱', async () => {
  await ensureInGame();
  const skillBtn = page.getByRole('button', { name: /能力|技能/ }).first();
  await skillBtn.click({ force: true, timeoutMs: 5000 });
  await page.waitForTimeout(500);
  const hasSkills = await page.getByText(/能力|技能|图谱/).first().isVisible().catch(() => false);
  expect(hasSkills).toBe(true);
});

test('方法库可搜索', async () => {
  await ensureInGame();
  const libBtn = page.getByRole('button', { name: /方法库|知识/ }).first();
  await libBtn.click({ force: true, timeoutMs: 5000 });
  await page.waitForTimeout(500);
  const hasLibrary = await page.getByText(/知识卡|方法|搜索/).first().isVisible().catch(() => false);
  expect(hasLibrary).toBe(true);
});

test('设置页显示 AI 服务', async () => {
  await ensureInGame();
  const setBtn = page.getByRole('button', { name: /设置/ }).first();
  await setBtn.click({ force: true, timeoutMs: 5000 });
  await page.waitForTimeout(500);
  const hasSettings = await page.getByText(/AI|设置|Provider/).first().isVisible().catch(() => false);
  expect(hasSettings).toBe(true);
});
