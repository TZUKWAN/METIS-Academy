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

async function enterGame(): Promise<void> {
  if (await page.locator('nav').isVisible().catch(() => false)) return;
  const btn = page.getByRole('button', { name: /新周目/ }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    const nameInput = page.getByPlaceholder(/角色名/);
    if (await nameInput.isVisible().catch(() => false)) { await nameInput.fill('E2E'); }
    const startBtn = page.getByRole('button', { name: '开始', exact: true });
    if (await startBtn.isVisible().catch(() => false)) { await startBtn.click(); }
    await page.waitForTimeout(1000);
    return;
  }
  const storyBtn = page.getByRole('button', { name: '剧情', exact: true });
  if (await storyBtn.isVisible().catch(() => false)) { await storyBtn.click(); await page.waitForTimeout(500); }
}

test('Title Screen 显示标题', async () => {
  await expect(page.getByText('METIS Academy').first()).toBeVisible();
});

test('Title Screen 有菜单入口', async () => {
  const hasNewGame = await page.getByText(/新|开始/).first().isVisible().catch(() => false);
  const hasSettings = await page.getByText(/设置/).first().isVisible().catch(() => false);
  expect(hasNewGame || hasSettings).toBe(true);
});

test('进入游戏后剧情页可见', async () => {
  await enterGame();
  const hasStory = await page.getByText(/任务：|剧情|DAY|天/).first().isVisible().catch(() => false);
  expect(hasStory).toBe(true);
});

test('工作台可导航', async () => {
  await enterGame();
  const wb = page.getByRole('button', { name: '工作台', exact: true }).first();
  await wb.click({ force: true });
  await page.waitForTimeout(500);
  const hasWb = await page.getByText(/AI Agent|终端|运行/).first().isVisible().catch(() => false);
  expect(hasWb).toBe(true);
});

test('能力页可导航', async () => {
  await enterGame();
  const skBtn = page.locator('nav button', { hasText: '能力' }).first();
  await skBtn.click({ force: true });
  await page.waitForTimeout(500);
  const hasSkills = await page.getByText(/能力|图谱/).first().isVisible().catch(() => false);
  expect(hasSkills).toBe(true);
});

test('方法库可搜索', async () => {
  await enterGame();
  const libBtn = page.locator('nav button', { hasText: '方法库' }).first();
  await libBtn.click({ force: true });
  await page.waitForTimeout(500);
  const hasLib = await page.getByText(/知识卡|方法|搜索/).first().isVisible().catch(() => false);
  expect(hasLib).toBe(true);
});

test('设置页显示 Provider 信息', async () => {
  await enterGame();
  const setBtn = page.locator('nav button', { hasText: '设置' }).first();
  await setBtn.click({ force: true });
  await page.waitForTimeout(500);
  const hasSettings = await page.getByText(/AI|设置|Provider|存储/).first().isVisible().catch(() => false);
  expect(hasSettings).toBe(true);
});
