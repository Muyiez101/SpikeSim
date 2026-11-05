import { expect, test } from '@playwright/test';

// These regressions cover the deterministic 2D replay; unified.spec.ts covers the default 3D view.
test.beforeEach(async ({context})=>{await context.addInitScript(()=>{try{localStorage.setItem('spikesim.renderer','2d');}catch{/* Storage-denial coverage. */}});});
import { missionsById } from '../../src/missions/content';
import { exportProgramFile } from '../../src/progress/program-file';

test('drags a movement block out of the toolbox, connects it, and runs it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('tab', { name: 'Blocks', exact: true })).toHaveAttribute('aria-selected', 'true');
  const start = page.locator('.blocklyWorkspace .blocklyBlockCanvas > .blocklyDraggable').first();
  const startBox = await start.boundingBox();
  expect(startBox).toBeTruthy();
  await page.locator('.blocklyTreeRow').filter({ hasText: /^Movement$/ }).click();
  const source = page.locator('.blocklyFlyout .blocklyBlockCanvas > .blocklyDraggable').first();
  const box = await source.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + 35, box!.y + 18);
  await page.mouse.down();
  await page.mouse.move(box!.x + 80, box!.y + 18, { steps: 5 });
  await page.mouse.move(startBox!.x + 35, startBox!.y + startBox!.height + 12, { steps: 22 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => {
    const draft = JSON.parse(localStorage.getItem('spikesim.playground.v1') ?? '{}').drafts?.[0];
    return draft?.visualProgram?.blocks.blocks.find((block: { type: string }) => block.type === 'spike_start')?.next?.block?.type;
  })).toBe('spike_move');
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.locator('.sim-stage')).toHaveAttribute('data-status', 'complete');
  await expect(page.locator('.sim-time')).not.toHaveText('0.0 s');
  await page.reload();
  await expect(page.getByText('1 block', { exact: false }).first()).toBeVisible();
  await expect(page.locator('.sim-stage')).toHaveAttribute('data-status', 'ready');
  expect(errors).toEqual([]);
});

test('loops run with highlighting, Python preview, replay, and export/import', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Examples', exact: true }).selectOption('square');
  await page.getByRole('tab', { name: 'Python', exact: true }).click();
  await expect(page.locator('.workspace-python')).toContainText('for _ in range(int(4))');
  await page.getByRole('tab', { name: 'Blocks', exact: true }).click();
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.locator('.spikesim-active-block')).toHaveCount(1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('.sim-stage')).toHaveAttribute('data-status', 'paused');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.locator('.sim-stage')).toHaveAttribute('data-status', 'stopped');
  await page.getByRole('slider', { name: 'Replay position' }).fill('0');
  await expect(page.locator('.sim-time')).toHaveText('0.0 s');
  await page.getByRole('button', { name: 'Export program', exact: true }).click();
  await page.getByLabel('Program name', { exact: true }).fill('Block square');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save file', exact: true }).click();
  const path = await (await downloading).path();
  await page.getByRole('button', { name: 'Clear blocks', exact: true }).click();
  await page.getByLabel('Choose a program file').setInputFiles(path!);
  await expect(page.getByRole('dialog')).toContainText('3 blocks');
  await page.getByRole('button', { name: 'Open program', exact: true }).click();
  await page.getByRole('tab', { name: 'Python', exact: true }).click();
  await expect(page.locator('.workspace-python')).toContainText('for _ in range(int(4))');
});

test('small dark workspace keeps run controls visible and resizes by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Night lab', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  const separator = page.getByRole('separator');
  await separator.focus(); await page.keyboard.press('ArrowRight');
  await expect(separator).toHaveAttribute('aria-valuenow', '48');
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
  await page.getByRole('button', { name: 'Add block', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeDisabled();
});

test('a custom-block mission imports, earns stars, and reopens from My projects', async ({ page }) => {
  const mission = missionsById['functions-4'];
  const file = exportProgramFile('Three deliveries', { missionId: mission.id, steps: [], outcome: null, visualProgram: mission.visualReference });
  await page.goto('/');
  await page.getByLabel('Choose a program file').setInputFiles({ name: file.name, mimeType: 'application/json', buffer: Buffer.from(file.content) });
  await page.getByRole('button', { name: 'Open program', exact: true }).click();
  await page.getByRole('button', { name: '4×', exact: true }).click();
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.getByLabel('3 of 3 stars')).toBeVisible();
  await page.getByRole('tab', { name: 'Sensors', exact: true }).click();
  await expect(page.getByText('deliveries: 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'My projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Three deliveries' })).toBeVisible();
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Delivery counter', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Blocks', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('an invalid speed highlights its block, explains the error, and can be corrected', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Add block', exact: true }).click();
  await page.locator('.blocklyBlockCanvas text').filter({ hasText: /^60$/ }).last().dblclick();
  await page.locator('.blocklyHtmlInput').fill('0');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.locator('.sim-run-error')).toContainText('outside this block');
  await expect(page.getByRole('tab', { name: 'Console', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.spikesim-active-block')).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.locator('.sim-stage')).toHaveAttribute('data-status', 'complete');
  await expect(page.locator('.sim-run-error')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('sound follows playback and the simulator expands without losing the program', async ({ page }) => {
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createOscillator;
    Object.assign(window, { tonesPlayed: 0 });
    AudioContext.prototype.createOscillator = function () {
      const counter = window as unknown as { tonesPlayed: number };
      counter.tonesPlayed++;
      return original.call(this);
    };
  });
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Examples', exact: true }).selectOption('hello');
  await page.getByRole('button', { name: 'Sound', exact: true }).click();
  await page.getByRole('button', { name: 'Expand simulator', exact: true }).click();
  await expect(page.locator('.sim-stage-expanded')).toBeVisible();
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.locator('.sim-stage')).toHaveAttribute('data-status', 'complete');
  expect(await page.evaluate(() => (window as unknown as { tonesPlayed: number }).tonesPlayed)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Restore split view', exact: true }).click();
  await expect(page.locator('.blockly-host')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sound', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
