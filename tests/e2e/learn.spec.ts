import { test, expect } from '@playwright/test';
const open = async (page: import('@playwright/test').Page, title = 'Give clear directions') => {
  await page.getByRole('navigation').getByRole('button', { name: 'Learn', exact: true }).click();
  await page.getByRole('button', { name: `Open lesson: ${title}`, exact: true }).click();
};

test('lesson filters combine with search and keep glossary results independent', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.addInitScript(() => {
    localStorage.setItem(
      'spikesim.learning.v1',
      JSON.stringify({
        schemaVersion: 1,
        completed: ['move'],
        runs: ['move', 'turn'],
        drafts: [],
        last: 'turn',
      }),
    );
  });
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Learn', exact: true }).click();
  const filter = page.getByRole('combobox', { name: 'Show lessons', exact: true });
  const search = page.getByRole('searchbox', { name: 'Find a lesson or term' });
  await expect(page.getByText('17 lessons shown', { exact: true })).toBeVisible();
  await filter.selectOption('completed');
  await expect(page.locator('.learn-card')).toHaveCount(1);
  await expect(page.locator('.learn-card')).toContainText('Give clear directions');
  await expect(page.getByText('1 lesson shown', { exact: true })).toBeVisible();
  await search.fill('threshold');
  await expect(page.getByText('0 lessons shown', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Glossary', exact: true }).click();
  await expect(filter).toHaveCount(0);
  await expect(page.locator('.learn-glossary dt')).toHaveText(['Threshold']);
  await expect(page.getByText('1 term shown', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lessons', exact: true }).click();
  await page.getByRole('button', { name: 'Show all lessons', exact: true }).click();
  await expect(search).toHaveValue('');
  await filter.selectOption('unfinished');
  await expect(page.locator('.learn-card')).toHaveCount(16);
  await expect(
    page.getByRole('button', { name: 'Open lesson: Give clear directions', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Open lesson: Turn before the next street', exact: true }),
  ).toBeVisible();
  await filter.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(filter).toHaveValue('all');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('spikesim.learning.v1')!).completed),
  ).toEqual(['move']);
});
test('Python is explained line by line and the yaw and wheel tools respond to student input', async ({
  page,
}) => {
  await page.goto('/');
  await open(page, 'Python, one instruction at a time');
  await expect(page.locator('.learn-code-walk')).toContainText('await robot.move_cm(58, speed=70)');
  await page.getByLabel('Lessons', { exact: true }).selectOption('conversions');
  await expect(page.locator('.learn-explorer')).toContainText('(30 ÷ (π × 5.6)) × 360 ≈ 613.88°');
  await page.getByLabel('Travel distance (cm)', { exact: true }).fill('0.1');
  const metres = page.locator('.learn-conversions > div').filter({
    has: page.locator('dt', { hasText: /^Metres$/ }),
  });
  await expect(metres.locator('dd')).toHaveText('0.001 m');
  await page.getByLabel('Travel distance (cm)', { exact: true }).fill('25');
  await expect(page.locator('.learn-conversions')).toContainText('250 mm');
  await page.getByLabel('Wheel diameter (cm)', { exact: true }).fill('0');
  await expect(page.getByText(/Enter a distance from 0 to 1,000 cm/)).toBeVisible();
  await page.getByLabel('Lessons', { exact: true }).selectOption('yaw');
  const current = page.getByRole('slider', { name: 'Current yaw (°)', exact: true });
  await current.focus();
  await page.keyboard.press('Home');
  for (let n = 0; n < 25; n++) await page.keyboard.press('ArrowRight');
  await expect(current).toHaveValue('-155');
  await expect(page.locator('.learn-calculated')).toContainText('Turn left 115°');
});
test('the new gyro My Block runs in 3D and its Python shows the parameter', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/');
  await open(page, 'Make a My Block that faces a direction');
  await expect(page.getByText(/recording shows the original gyro turn/)).toBeVisible();
  await page.getByRole('button', { name: 'Try this example', exact: true }).click();
  const stage = page.locator('.learn-experiment .unified-stage');
  await expect(stage).toHaveAttribute('data-status', 'ready', { timeout: 30000 });
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(stage).toHaveAttribute('data-status', 'complete', { timeout: 25000 });
  await expect(page.getByText('Example goal reached', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'See Python', exact: true }).click();
  await expect(page.locator('.learn-python pre')).toContainText('face_target(target)');
  await page.getByRole('button', { name: 'Blocks', exact: true }).click();
  await page
    .locator('.learn-blocks .blocklyBlockCanvas text')
    .filter({ hasText: /^90$/ })
    .first()
    .dblclick();
  await page.locator('.blocklyHtmlInput').fill('45');
  await page.keyboard.press('Enter');
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.stringify(JSON.parse(localStorage.getItem('spikesim.learning.v1')!).drafts),
      ),
    )
    .toContain('45');
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(stage).toHaveAttribute('data-status', 'complete', { timeout: 25000 });
  const yaw = page
    .locator('.learn-live dl>div')
    .filter({ has: page.locator('dt').filter({ hasText: 'Current yaw' }) });
  await expect
    .poll(async () => Math.abs(parseFloat(await yaw.locator('dd').innerText()) - 45))
    .toBeLessThan(1.1);
});
test('lesson library, searchable glossary and existing accessible media work without loading an experiment', async ({
  page,
}) => {
  await page.goto('/');
  await open(page);
  await expect(page.locator('.learn-reader iframe')).toHaveCount(0);
  await expect
    .poll(() => page.locator('.learn-media video').evaluate((v: HTMLVideoElement) => v.readyState))
    .toBeGreaterThanOrEqual(2);
  await page.getByLabel('Video speed', { exact: true }).selectOption('0.5');
  expect(await page.locator('video').evaluate((v: HTMLVideoElement) => v.playbackRate)).toBe(0.5);
  await page.getByRole('button', { name: 'Jump to near the finish', exact: true }).click();
  await expect
    .poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(5);
  const screenshot = page.getByRole('button', { name: /Open a larger screenshot/ }).first();
  await screenshot.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(screenshot).toBeFocused();
  await page.getByRole('button', { name: '← All lessons', exact: true }).click();
  await expect(page.locator('.learn-card')).toHaveCount(17);
  await page.getByRole('button', { name: 'Glossary', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Find a lesson or term' }).fill('threshold');
  await expect(page.locator('.learn-glossary dt')).toContainText(['Threshold']);
});
test('a real lesson experiment completes, exports, and keeps its edits separate from Home', async ({
  page,
}) => {
  test.setTimeout(70000);
  await page.goto('/');
  const before = await page.evaluate(() => localStorage.getItem('spikesim.playground.v1'));
  await open(page);
  await page.getByRole('button', { name: 'Try this example', exact: true }).click();
  const stage = page.locator('.learn-experiment .unified-stage');
  await expect(stage).toHaveAttribute('data-status', 'ready', { timeout: 30000 });
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(stage).toHaveAttribute('data-status', 'complete', { timeout: 20000 });
  await expect(page.getByText('Example goal reached', { exact: true })).toBeVisible();
  await expect(page.getByText('0 of 17 lessons completed', { exact: true })).toBeVisible();
  const quiz = page
    .locator('.learn-question')
    .filter({ has: page.getByRole('heading', { name: 'Check your understanding', exact: true }) });
  await quiz.getByRole('radio', { name: 'Move −10 cm.', exact: true }).check();
  await quiz.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByText('1 of 17 lessons completed', { exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download experiment', exact: true }).click();
  expect((await download).suggestedFilename()).toContain('Give-clear-directions.rlproj');
  // Use the editor's actual keyboard-accessible quick-add path.
  await page.locator('.learn-experiment .block-quick-add select').selectOption('spike_wait');
  await page.locator('.learn-experiment .block-quick-add button').click();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('spikesim.learning.v1')!).drafts.length),
    )
    .toBe(1);
  const saved = await page.evaluate(() => localStorage.getItem('spikesim.learning.v1'));
  expect(JSON.parse(saved!).drafts[0].program).toBeTruthy();
  expect(await page.evaluate(() => localStorage.getItem('spikesim.playground.v1'))).toBe(before);
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await open(page);
  await expect(page.getByText('1 of 17 lessons completed', { exact: true })).toBeVisible();
  await page.reload();
  await open(page);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('spikesim.learning.v1')!).drafts[0].program,
    ),
  ).toEqual(JSON.parse(saved!).drafts[0].program);
});
test('malformed progress is preserved and save denial keeps session work recoverable', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('spikesim.learning.v1', '{unread'));
  await page.reload();
  await open(page);
  await expect(page.getByText(/Saved lesson progress could not be read/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('spikesim.learning.v1'))).toBe('{unread');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Start new lesson progress', exact: true }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'spikesim.learning.v1') throw Error('Denied');
      return original.call(this, key, value);
    };
    Object.assign(window, { restoreLearning: () => (Storage.prototype.setItem = original) });
  });
  await page.getByLabel('Lessons', { exact: true }).selectOption('turn');
  await expect(page.getByText(/Lesson progress could not be saved/)).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Learn', exact: true }).click();
  await page.getByRole('button', { name: 'Continue learning', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Turn before the next street');
  await page.evaluate(() => {
    (window as unknown as { restoreLearning: () => void }).restoreLearning();
  });
  await page.getByRole('button', { name: 'Try saving lesson progress again', exact: true }).click();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('spikesim.learning.v1')!).last),
  ).toBe('turn');
});
test('another window cannot silently overwrite progress, with keyboard access on a small dark display', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.goto('/');
  await open(page);
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.dataset.textSize = 'large';
  });
  const other = await context.newPage();
  await other.goto('/');
  await open(other, 'Repeat a useful pattern');
  await expect(page.getByText(/Lesson progress changed in another window/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Use progress from the other window', exact: true })
    .click();
  await page.getByRole('button', { name: '← All lessons', exact: true }).click();
  await page.getByRole('button', { name: 'Continue learning', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Repeat a useful pattern');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await other.close();
});
