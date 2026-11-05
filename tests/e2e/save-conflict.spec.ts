import { expect, test } from '@playwright/test';

// These regressions cover the deterministic 2D replay; unified.spec.ts covers the default 3D view.
test.beforeEach(async ({context})=>{await context.addInitScript(()=>{try{localStorage.setItem('spikesim.renderer','2d');}catch{/* Storage-denial coverage. */}});});

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => { try { localStorage.setItem('spikesim.editor-mode', 'steps'); } catch { /* Storage-denial test. */ } });
});

test('two tabs retain their edits until a saved version is explicitly chosen', async ({ page, context }) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.goto('/');
  const other = await context.newPage();
  await other.goto('/');
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('42');
  await expect(other.getByRole('heading', { name: 'Saved programs changed in another tab' })).toBeVisible();
  await expect(other.getByRole('spinbutton')).toHaveCount(0);
  await other.getByRole('button', { name: 'Use saved version', exact: true }).click();
  await expect(other.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('42');
  await other.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('');
  await page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('58');
  await expect(other.getByRole('heading', { name: 'Saved programs changed in another tab' })).toBeVisible();
  await expect(other.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('');
  await other.getByRole('button', { name: 'Use saved version', exact: true }).click();
  await expect(other.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('58');
  await expect(other.getByRole('button', { name: 'Run program', exact: true })).toBeEnabled();
  await expect(other.locator('.sim-stage')).toHaveAttribute('data-status', 'ready');
  await expect(other.getByRole('main')).toBeFocused();
  await other.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('61');
  await expect(page.getByRole('heading', { name: 'Saved programs changed in another tab' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeInViewport();
  await page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('60');
  const storedDistance = () => other.evaluate(() => JSON.parse(localStorage.getItem('spikesim.playground.v1') ?? '{}').drafts[0].steps[0].command.distanceMm);
  expect(await storedDistance()).toBe(610);
  await page.getByRole('button', { name: 'Keep this tab’s programs', exact: true }).click();
  expect(await storedDistance()).toBe(600);
  await expect(other.getByRole('heading', { name: 'Saved programs changed in another tab' })).toBeVisible();
  await expect(other.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('61');
  await other.getByRole('button', { name: 'Use saved version', exact: true }).click();
  await expect(other.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('60');
  await other.close();
});

test('clearing saved programs elsewhere leaves the current tab intact until recovery is chosen', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  const other = await context.newPage();
  await other.goto('/');
  await other.evaluate(() => localStorage.removeItem('spikesim.playground.v1'));
  await expect(page.getByRole('heading', { name: 'Saved programs changed in another tab' })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('30');
  await page.getByRole('button', { name: 'Keep this tab’s programs', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('30');
  await other.close();
});
