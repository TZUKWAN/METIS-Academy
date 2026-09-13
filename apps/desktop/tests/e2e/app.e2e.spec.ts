// E2E（TASK-R007）：Electron 应用启动与核心流程
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
});

test.afterAll(async () => { await electronApp.close(); });

test('应用启动并渲染主界面', async () => {
  await expect(page.locator('nav')).toBeVisible();
  await expect(page.getByRole('heading', { name: /METIS Academy/ }).first()).toBeVisible();
});

test('新手引导可跳过', async () => {
  const skip = page.getByRole('button', { name: '跳过' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
});

test('首页显示三条主线', async () => {
  await expect(page.getByText('科研主线')).toBeVisible();
  await expect(page.getByText('竞赛主线')).toBeVisible();
  await expect(page.getByText('创业主线')).toBeVisible();
});

test('新游戏 → 剧情页 → 做出选择 → 结束一天', async () => {
  await page.getByRole('button', { name: /新周目/ }).first().click();
  await page.getByPlaceholder(/角色名/).fill('E2E测试员');
  await page.getByRole('button', { name: '开始', exact: true }).click();
  await expect(page.getByText(/任务：/).first()).toBeVisible();
  for (let i = 0; i < 40; i++) {
    const endBtn = page.getByRole('button', { name: /结束这一天/ });
    if (await endBtn.isVisible().catch(() => false)) break;
    const choice = page.locator('button', { hasText: /直接让AI|先写下|先去问问/ }).first();
    if (await choice.isVisible().catch(() => false)) { await choice.click(); }
    else { await page.mouse.click(640, 320); }
    await page.waitForTimeout(250);
  }
  await expect(page.getByRole('button', { name: /结束这一天/ })).toBeVisible({ timeout: 10000 });
});

test('工作台与能力页可导航', async () => {
  await page.getByRole('button', { name: '工作台', exact: true }).click({ force: true });
  await expect(page.getByText(/AI Agent/).first()).toBeVisible();
  await page.getByRole('button', { name: '能力', exact: true }).click({ force: true });
  await expect(page.getByText(/能力图谱/)).toBeVisible();
});

test('方法库可搜索知识卡', async () => {
  await page.getByRole('button', { name: '方法库', exact: true }).click({ force: true });
  await expect(page.getByText(/张知识卡/)).toBeVisible();
  await page.getByPlaceholder(/用你遇到的问题来搜/).fill('文献');
  await expect(page.getByText(/AI会编造文献/).first()).toBeVisible();
});

test('快捷保存流程（存档槽位写入）', async () => {
  await page.getByRole('button', { name: '剧情', exact: true }).click({ force: true });
  await page.locator('button[title="快捷保存"]').click();
  await page.getByRole('button', { name: /^保存$/ }).last().click();
  await expect(page.getByText(/已保存到槽位/)).toBeVisible({ timeout: 8000 });
});

test('设置页显示 AI 服务与存储后端', async () => {
  await page.getByRole('button', { name: '设置', exact: true }).click({ force: true });
  await expect(page.getByText('AI 服务（Provider）')).toBeVisible();
  await expect(page.getByText(/存储后端/)).toBeVisible();
});

test('键盘可访问性（G011）：Tab 可达主导航按钮', async () => {
  await page.getByRole('button', { name: '首页', exact: true }).click({ force: true });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focused);
});

test('1366x768 最低分辨率无横向溢出（G012）', async () => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('button', { name: '首页', exact: true }).click({ force: true });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  await expect(page.locator('nav')).toBeVisible();
  await page.setViewportSize({ width: 1920, height: 1080 });
});
