import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { startLanServer } from '../../src/lan/server';
import { fromCommands } from '../../src/editor/program';
let host: Awaited<ReturnType<typeof startLanServer>>;
test.beforeAll(async () => {
  host = await startLanServer({
    root: resolve('dist'),
    workerPath: resolve('dist-electron/match-worker.js'),
    bind: '127.0.0.1',
    discovery: false,
  });
});
test.afterAll(async () => {
  await host.close();
});
test('the arena expands with keyboard access and the room fits a small laptop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.goto(host.origin + '/?sumo=host');
  await page.getByLabel('Your name', { exact: true }).fill('Ada');
  await page.getByRole('button', { name: 'Host a match', exact: true }).click();
  await expect(page.locator('.sumo-player-0')).toContainText('Ada');
  await expect(page.locator('.sumo-player-0')).toContainText('You');
  await expect(page.getByRole('timer')).toHaveText('1:00');
  const expand = page.getByRole('button', { name: 'Expand arena', exact: true });
  await expand.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'The sumo arena', exact: true })).toBeVisible();
  await expect(page.locator('.sumo-ring')).toHaveCount(1);
  await expect(page.locator('.sumo-editor .blocklySvg')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(expand).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Close room', exact: true }).click();
});
test('the Wi-Fi host serves Learn media and a working 3D experiment', async ({ page }) => {
  test.setTimeout(70000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(host.origin + '/');
  await page.getByRole('navigation').getByRole('button', { name: 'Learn', exact: true }).click();
  await page
    .getByRole('button', { name: 'Open lesson: Give clear directions', exact: true })
    .click();
  const video = page.locator('.learn-media video');
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
    .toBeGreaterThanOrEqual(2);
  await expect
    .poll(() => video.locator('track').evaluate((element: HTMLTrackElement) => element.readyState))
    .toBe(2);
  await page.getByRole('button', { name: 'Jump to near the finish', exact: true }).click();
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThan(5);
  await page.getByRole('button', { name: 'Try this example', exact: true }).click();
  const stage = page.locator('.learn-experiment .unified-stage');
  await expect(stage).toHaveAttribute('data-status', 'ready', { timeout: 30000 });
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(stage).toHaveAttribute('data-status', 'complete', { timeout: 20000 });
  await expect(page.getByText('Example goal reached', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('two isolated students share a result, restore their seat and start a fresh round', async ({
  browser,
}) => {
  test.setTimeout(70000);
  const a = await browser.newContext(),
    b = await browser.newContext(),
    pa = await a.newPage(),
    pb = await b.newPage();
  const errors: string[] = [];
  pa.on('pageerror', (e) => errors.push(e.message));
  pb.on('pageerror', (e) => errors.push(e.message));
  try {
    await pa.goto(host.origin + '/?sumo=host');
    await pa.getByLabel('Your name', { exact: true }).fill('Ada');
    await pa.getByRole('button', { name: 'Host a match', exact: true }).click();
    const code = await pa.locator('.sumo-code').innerText();
    await expect(pa.getByRole('button', { name: 'Start match', exact: true })).toBeDisabled();
    await pb.goto(host.origin + '/?sumo=' + code);
    await pb.getByLabel('Your name', { exact: true }).fill('Ben');
    await pb.getByRole('button', { name: 'Join a match', exact: true }).click();
    await pb
      .getByLabel('Open sumo blocks', { exact: true })
      .setInputFiles({
        name: 'drive.json',
        mimeType: 'application/json',
        buffer: Buffer.from(
          JSON.stringify({
            program: fromCommands([
              { type: 'tank', leftPercent: 20, rightPercent: 20, durationMs: 60000 },
            ]),
          }),
        ),
      });
    await pa.getByRole('button', { name: 'Ready to compete', exact: true }).click();
    await pb.getByRole('button', { name: 'Ready to compete', exact: true }).click();
    await pa.reload();
    await expect(pa.getByRole('button', { name: 'Start match', exact: true })).toBeEnabled();
    await pa.getByRole('button', { name: 'Start match', exact: true }).click();
    await expect(pa.locator('.sumo-result')).toContainText('Ada wins', { timeout: 20000 });
    await expect(pb.locator('.sumo-result')).toHaveText(
      await pa.locator('.sumo-result').innerText(),
      { useInnerText: true },
    );
    const poses = async (page: typeof pa) =>
      page
        .locator('.sumo-ring > g')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('transform')));
    expect(await poses(pa)).toEqual(await poses(pb));
    await pa.getByRole('button', { name: 'New round', exact: true }).click();
    await expect(pb.getByRole('button', { name: 'Ready to compete', exact: true })).toBeVisible();
    await expect(pa.getByRole('button', { name: 'Start match', exact: true })).toBeDisabled();
    await pa.getByRole('button', { name: 'Close room', exact: true }).click();
    await expect(pb.getByRole('alert')).toContainText('closed');
    await pb.getByRole('button', { name: 'Leave room', exact: true }).click();
    await expect(pb.getByRole('button', { name: 'Join a match', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await a.close();
    await b.close();
  }
});
