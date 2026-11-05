import { expect, test } from '@playwright/test';

// These regressions cover the deterministic 2D replay; unified.spec.ts covers the default 3D view.
test.beforeEach(async ({context})=>{await context.addInitScript(()=>{try{localStorage.setItem('spikesim.renderer','2d');}catch{/* Storage-denial coverage. */}});});

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => { try { localStorage.setItem('spikesim.editor-mode', 'steps'); } catch { /* Storage-denial test. */ } });
});

test('opens the playground and visits every screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your program' })).toBeVisible();
  for (const label of ['Missions', 'Learn', 'Build robot', 'Free play', 'My projects', 'Settings', 'Home']) {
    await page.getByRole('navigation').getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByRole('main')).toBeVisible();
    if(label==='Build robot')await page.getByRole('button',{name:'Cancel builder',exact:true}).click();
  }
});

test('runs a student program, awards stars, and clears results on edits', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const stage = page.locator('.sim-stage');
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeDisabled();
  await expect(stage.getByText('77 cm', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  const before = await page.getByTestId('sim-robot').boundingBox();
  const canvas = await page.getByRole('img', { name: 'Robot simulation stage' }).boundingBox();
  expect(before?.width).toBeLessThan((canvas?.width ?? 0) * 0.3);
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(stage).toHaveAttribute('data-status', 'complete', { timeout: 15000 });
  await expect(page.getByLabel('3 of 3 stars')).toBeVisible();
  await expect(stage.getByText('17 cm', { exact: true })).toBeVisible();
  const after = await page.getByTestId('sim-robot').boundingBox();
  expect(after?.x).toBeGreaterThan(before?.x ?? 0);
  await page.getByRole('button', { name: 'Remove step 2' }).click();
  await expect(page.locator('.pg-outcome')).toHaveCount(0);
  await expect(stage).toHaveAttribute('data-status', 'ready');
  await expect(stage.getByText('77 cm', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(stage).toHaveAttribute('data-status', 'running');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(stage).toHaveAttribute('data-status', 'ready');
  await expect(stage.locator('.sim-time')).toHaveText('0.0 s');
  expect(errors).toEqual([]);
});

test('changing worlds cancels playback and Free play has no mission', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await page.getByLabel('Choose a world').selectOption('conditions');
  await expect(page.getByRole('heading', { name: 'Green means go', exact: true })).toBeVisible();
  await expect(page.locator('.sim-stage')).toHaveAttribute('data-status', 'ready');
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeDisabled();
  await page.getByLabel('Choose a world').selectOption('loops');
  await expect(page.getByRole('heading', { name: 'Token collector' })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Free play', exact: true }).click();
  await expect(page.getByLabel('Choose a world')).toHaveValue('');
  await expect(page.getByText('No goals. Build a program and see what the robot does.')).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Missions', exact: true }).click();
  await page.getByRole('button', { name: 'Continue First steps', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'First steps' })).toBeVisible();
});

test('learning cards and theme settings respond to input', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await page.getByRole('button', { name: 'Open lesson: Repeat a useful pattern' }).click();
  await expect(page.getByText(/A repeat block runs the blocks inside its opening/)).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Night lab' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await page.getByRole('button', { name: 'Turn left 90°', exact: true }).click();
  await page.getByRole('button', { name: 'Wait 1 s', exact: true }).click();
  await page.setViewportSize({ width: 1024, height: 640 });
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
});

test('robot builder opens the editable competition robot', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Build robot', exact: true }).click();
  await expect(page.getByLabel('Start from a robot')).toHaveValue('fll');
  await expect(page.getByRole('button',{name:'Use this robot',exact:true})).toBeEnabled({timeout:45000});
});

test('edited mission programs and results survive world changes, navigation, and reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('58');
  await page.getByRole('spinbutton', { name: 'Speed (%), step 1', exact: true }).fill('70');
  await expect(page.getByText('Program saved on this device', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.getByLabel('3 of 3 stars')).toBeVisible({ timeout: 15000 });
  await page.getByLabel('Choose a world').selectOption('conditions');
  await page.getByRole('button', { name: 'Wait 1 s', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Time (s), step 1', exact: true }).fill('2.2');
  await page.getByRole('navigation').getByRole('button', { name: 'Learn', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Green means go', exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Time (s), step 1', exact: true })).toHaveValue('2.2');
  await page.getByLabel('Choose a world').selectOption('basics');
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('58');
  await expect(page.getByLabel('3 of 3 stars')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('58');
  await expect(page.getByRole('spinbutton', { name: 'Speed (%), step 1', exact: true })).toHaveValue('70');
  await expect(page.getByRole('heading', { name: 'Last run', exact: true })).toBeVisible();
  await expect(page.getByLabel('3 of 3 stars')).toBeVisible();
  await expect(page.locator('.sim-stage')).toHaveAttribute('data-status', 'ready');
  await page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('40');
  await expect(page.locator('.pg-outcome')).toHaveCount(0);
});

test('blank and out-of-range fields cannot run, and removing a step preserves the other editor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Distance (cm), step 2', exact: true }).fill('42');
  await page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('');
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeDisabled();
  await page.keyboard.press('F5');
  await expect(page.locator('.sim-stage')).toHaveAttribute('data-status', 'ready');
  await page.getByRole('button', { name: 'Remove step 1' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('42');
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeEnabled();
  await page.getByRole('spinbutton', { name: 'Speed (%), step 1', exact: true }).fill('0');
  await expect(page.getByText('Enter a number from 1 to 100.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeDisabled();
  await page.getByRole('spinbutton', { name: 'Speed (%), step 1', exact: true }).fill('50');
  await page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('301');
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('42');
  await expect(page.getByRole('spinbutton', { name: 'Speed (%), step 1', exact: true })).toHaveValue('50');
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeEnabled();
});

test('Free play edits keep their own saved program and support negative angles and decimal waits', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Free play', exact: true }).click();
  await page.getByRole('button', { name: 'Turn left 90°', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Angle (°), step 1', exact: true }).fill('-45');
  await page.getByRole('button', { name: 'Wait 1 s', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Time (s), step 2', exact: true }).fill('1.5');
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.locator('.sim-stage')).toHaveAttribute('data-status', 'complete', { timeout: 15000 });
  await expect(page.locator('.sim-hud-right').getByText('-45°', { exact: true })).toBeVisible();
  await expect(page.locator('.pg-outcome')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('30');
  await page.getByRole('navigation').getByRole('button', { name: 'Free play', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Angle (°), step 1', exact: true })).toHaveValue('-45');
  await expect(page.getByRole('spinbutton', { name: 'Time (s), step 2', exact: true })).toHaveValue('1.5');
});

test('failed saves retain edits through navigation and can be retried', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'spikesim.playground.v1') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    };
    Object.assign(window, { restorePlaygroundStorage: () => { Storage.prototype.setItem = original; } });
  });
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('58');
  await expect(page.getByRole('button', { name: 'Try saving again', exact: true })).toBeVisible();
  await expect(page.getByText('Program saved on this device', { exact: true })).toHaveCount(0);
  await page.getByRole('navigation').getByRole('button', { name: 'Learn', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('58');
  await page.evaluate(() => { (window as unknown as { restorePlaygroundStorage: () => void }).restorePlaygroundStorage(); });
  await page.getByRole('button', { name: 'Try saving again', exact: true }).click();
  await expect(page.getByText('Program saved on this device', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('58');
});

test('a malformed save shows a recovery message and a working empty editor', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('spikesim.playground.v1', '{bad json'));
  await page.reload();
  await expect(page.getByText('Some saved work could not be restored. Check your program before running it.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('spikesim.playground.v1'))).toBe('{bad json');
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await expect(page.getByText('Program saved on this device', { exact: true })).toBeVisible();
});

test('the app still opens and retains session edits when browser storage is disabled', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage disabled', 'SecurityError'); } });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your program' })).toBeVisible();
  await page.getByRole('tab', { name: 'Steps', exact: true }).click();
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('58');
  await page.getByRole('navigation').getByRole('button', { name: 'Learn', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('58');
  await expect(page.getByRole('button', { name: 'Try saving again', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
