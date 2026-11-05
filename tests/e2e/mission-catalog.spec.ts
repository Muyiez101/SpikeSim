import { expect, test, type Page } from '@playwright/test';

// These regressions cover the deterministic 2D replay; unified.spec.ts covers the default 3D view.
test.beforeEach(async ({context})=>{await context.addInitScript(()=>{try{localStorage.setItem('spikesim.renderer','2d');}catch{/* Storage-denial coverage. */}});});
import { missions, worlds } from '../../src/missions/content';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => { try { localStorage.setItem('spikesim.editor-mode', 'steps'); } catch { /* Storage-denial test. */ } });
});

const openCatalog = async (page: Page) => {
  await page.getByRole('navigation').getByRole('button', { name: 'Missions', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose your next mission' })).toBeVisible();
};

const catalogWorlds = worlds.map(world => ({ ...world, missions: world.missionIds.map(id => missions.find(mission => mission.id === id)!.title) }));

test('catalog filters the real worlds and every card opens its own mission', async ({ page }) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await openCatalog(page);
  const results = page.getByRole('region', { name: 'Available missions' });
  const filters = page.getByRole('navigation', { name: 'Filter missions by world' });
  await expect(results.getByRole('article')).toHaveCount(41);
  await expect(page.getByText('8 worlds · 41 missions', { exact: true })).toBeVisible();
  await expect(page.getByText('0 programs started', { exact: true })).toBeVisible();

  for (const world of catalogWorlds) {
    const filter = filters.getByRole('button', { name: world.title, exact: true });
    await filter.click();
    await expect(filter).toHaveAttribute('aria-pressed', 'true');
    await expect(results.getByRole('heading', { level: 2 })).toHaveText(world.title);
    await expect(results.getByRole('heading', { level: 3 })).toHaveText(world.missions);
    await expect(page.getByText(`Showing ${world.missions.length} of 41 missions`, { exact: true })).toBeVisible();
  }
  await filters.getByRole('button', { name: 'All worlds', exact: true }).click();
  await expect(results.getByRole('article')).toHaveCount(41);

  for (const world of catalogWorlds) {
    for (const title of world.missions) {
      await page.getByRole('button', { name: `Start ${title}`, exact: true }).click();
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expect(page.getByLabel('Choose a world')).toHaveValue(world.id);
      await expect(page.getByRole('main')).toBeFocused();
      await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeInViewport();
      await expect(page.locator('.sim-stage')).toHaveAttribute('data-status', 'ready');
      await openCatalog(page);
    }
  }
  expect(errors).toEqual([]);
});

test('catalog resumes the selected program and shows only its current last run', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('58');
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.getByLabel('3 of 3 stars')).toBeVisible({ timeout: 15000 });
  await openCatalog(page);
  const firstSteps = page.getByRole('article', { name: 'First steps', exact: true });
  const turnAndGo = page.getByRole('article', { name: 'Turn and go', exact: true });
  await expect(firstSteps.getByText('1 step in your program', { exact: true })).toBeVisible();
  await expect(firstSteps.getByText('Last run: 3 of 3 stars', { exact: true })).toBeVisible();
  await expect(turnAndGo.getByText('No program yet', { exact: true })).toBeVisible();
  await turnAndGo.getByRole('button', { name: 'Start Turn and go', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Wait 1 s', exact: true }).click();
  await openCatalog(page);
  await expect(page.getByText('2 programs started', { exact: true })).toBeVisible();
  await expect(turnAndGo.getByText('Ready for a run', { exact: true })).toBeVisible();
  await page.reload();
  await openCatalog(page);
  await expect(firstSteps.getByText('Last run: 3 of 3 stars', { exact: true })).toBeVisible();
  await firstSteps.getByRole('button', { name: 'Continue First steps', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('58');
  await expect(page.getByLabel('3 of 3 stars')).toBeVisible();
  await expect(page.locator('.sim-stage')).toHaveAttribute('data-status', 'ready');

  await page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('1');
  await openCatalog(page);
  await expect(firstSteps.getByText('Ready for a run', { exact: true })).toBeVisible();
  await expect(firstSteps.getByText(/Last run:/)).toHaveCount(0);
  await firstSteps.getByRole('button', { name: 'Continue First steps', exact: true }).click();
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.getByLabel('0 of 3 stars')).toBeVisible();
  await openCatalog(page);
  await expect(firstSteps.getByText('Last run: 0 of 3 stars', { exact: true })).toBeVisible();
  await firstSteps.getByRole('button', { name: 'Continue First steps', exact: true }).click();
  await page.getByRole('button', { name: 'Clear program', exact: true }).click();
  await openCatalog(page);
  await expect(firstSteps.getByText('No program yet', { exact: true })).toBeVisible();
  await expect(firstSteps.getByRole('button', { name: 'Start First steps', exact: true })).toBeVisible();
  await expect(firstSteps.getByText(/Last run:/)).toHaveCount(0);
  await expect(page.getByText('1 program started', { exact: true })).toBeVisible();
});

test('catalog Free play restores its own draft even when that workspace had a mission selected', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Free play', exact: true }).click();
  await page.getByRole('button', { name: 'Wait 1 s', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Time (s), step 1', exact: true }).fill('1.5');
  await page.getByLabel('Choose a world').selectOption('loops');
  await openCatalog(page);
  await expect(page.getByText('1 program started', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open free play', exact: true }).click();
  await expect(page.getByLabel('Choose a world')).toHaveValue('');
  await expect(page.getByRole('spinbutton', { name: 'Time (s), step 1', exact: true })).toHaveValue('1.5');
  await expect(page.getByText('No goals. Build a program and see what the robot does.')).toBeVisible();
  await expect(page.locator('.sim-stage')).toHaveAttribute('data-status', 'ready');
  await expect(page.getByRole('main')).toBeFocused();
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'First steps', exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('30');
});

test('catalog retains session programs when storage fails and retries saving directly', async ({ page }) => {
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
  await page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('42');
  await openCatalog(page);
  await expect(page.getByRole('alert')).toContainText('Your changes are only in this session.');
  await expect(page.getByRole('article', { name: 'First steps', exact: true }).getByText('1 step in your program', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Try saving again', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.evaluate(() => { (window as unknown as { restorePlaygroundStorage: () => void }).restorePlaygroundStorage(); });
  await page.getByRole('button', { name: 'Try saving again', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.reload();
  await openCatalog(page);
  await page.getByRole('button', { name: 'Continue First steps', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('42');
});

test('catalog keeps malformed-save recovery visible without overwriting the saved data', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('spikesim.playground.v1', '{bad json'));
  await page.reload();
  await openCatalog(page);
  await expect(page.getByText('Some saved work could not be restored. Check your program before running it.', { exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(41);
  await page.getByRole('navigation', { name: 'Filter missions by world' }).getByRole('button', { name: 'World 3: Loops', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('spikesim.playground.v1'))).toBe('{bad json');
});

test('catalog works with keyboard navigation at the minimum window size in the dark theme', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Night lab', exact: true }).click();
  await page.getByRole('button', { name: 'Large', exact: true }).click();
  await openCatalog(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('main')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Open free play', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'All worlds', exact: true })).toBeFocused();
  for (let index = 0; index < 3; index++) await page.keyboard.press('Tab');
  const loops = page.getByRole('navigation', { name: 'Filter missions by world' }).getByRole('button', { name: 'World 3: Loops', exact: true });
  await expect(loops).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(loops).toHaveAttribute('aria-pressed', 'true');
  for (let index = 0; index < 6; index++) await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Start Token collector', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  const cleanSweep = page.getByRole('button', { name: 'Start Clean sweep', exact: true });
  await expect(cleanSweep).toBeFocused();
  await expect(cleanSweep).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Clean sweep', exact: true })).toBeVisible();
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
