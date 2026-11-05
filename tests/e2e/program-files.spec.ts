import { expect, test } from '@playwright/test';

// These regressions cover the deterministic 2D replay; unified.spec.ts covers the default 3D view.
test.beforeEach(async ({context})=>{await context.addInitScript(()=>{try{localStorage.setItem('spikesim.renderer','2d');}catch{/* Storage-denial coverage. */}});});

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => { try { localStorage.setItem('spikesim.editor-mode', 'steps'); } catch { /* Storage-denial test. */ } });
});

test('a named program exports and reopens with its exact commands and mission', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('58');
  await page.getByRole('button', { name: 'Export program', exact: true }).click();
  await page.getByLabel('Program name', { exact: true }).fill('My first route');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save file', exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('spikesim-My-first-route.rlproj');
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.getByRole('button', { name: 'Clear program', exact: true }).click();
  await page.getByLabel('Choose a world').selectOption('loops');
  await page.getByRole('button', { name: 'Wait 1 s', exact: true }).click();
  await page.getByLabel('Choose a program file').setInputFiles(path!);
  const dialog = page.getByRole('dialog', { name: 'Open this program?' });
  await expect(dialog.getByText('My first route', { exact: true })).toBeVisible();
  await expect(dialog.getByText('First steps · 1 step', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Open program', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'First steps', exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('58');
  await expect(page.locator('.sim-stage')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('.pg-outcome')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('58');
  await page.getByRole('button', { name: 'Export program', exact: true }).click();
  await expect(page.getByLabel('Program name', { exact: true })).toHaveValue('My first route');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Choose a world').selectOption('loops');
  await expect(page.getByRole('spinbutton', { name: 'Time (s), step 1', exact: true })).toHaveValue('1');
});

test('import previews a replacement and cancel leaves the current program intact', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  const file = { name: 'route.rlproj', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({
    schemaVersion: 1, kind: 'spikesim-program', name: 'Replacement route', missionId: 'basics-1',
    steps: [{ id: 'wait', command: { type: 'wait', durationMs: 1500 } }], outcome: { stars: 3, goals: [] },
  })) };
  await page.getByLabel('Choose a program file').setInputFiles(file);
  await expect(page.getByRole('dialog')).toContainText('This replaces the saved program');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('30');
  await page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true }).fill('');
  await expect(page.getByRole('button', { name: 'Export program', exact: true })).toBeDisabled();
  await page.getByLabel('Choose a program file').setInputFiles(file);
  await page.getByRole('button', { name: 'Replace and open', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Time (s), step 1', exact: true })).toHaveValue('1.5');
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Export program', exact: true })).toBeEnabled();
  await expect(page.locator('.pg-outcome')).toHaveCount(0);
});

test('bad and oversized files report errors without changing the program', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await page.getByLabel('Choose a program file').setInputFiles({ name: 'bad.rlproj', mimeType: 'application/json', buffer: Buffer.from('{bad json') });
  await expect(page.getByRole('alert')).toContainText('not a supported SpikeSim program');
  await page.getByLabel('Choose a program file').setInputFiles({ name: 'big.rlproj', mimeType: 'application/json', buffer: Buffer.alloc(256001, ' ') });
  await expect(page.getByRole('alert')).toContainText('too large');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('30');
});

test('desktop bridge save cancellation and errors keep the program and dialog available', async ({ page }) => {
  await page.addInitScript(() => {
    window.desktop = {
      openFile: async () => null,
      saveFile: async () => false,
      getAppDataPath: async () => '',
      getGearsUrl: async () => './gears/',
      hostSumo: async () => {},
      joinSumo: async () => {},
      hostCompetition: async () => {},
      joinCompetition: async () => {},
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Move 30 cm', exact: true }).click();
  await page.getByRole('button', { name: 'Export program', exact: true }).click();
  await page.getByLabel('Program name', { exact: true }).fill('Desktop route');
  await page.getByRole('button', { name: 'Save file', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => { window.desktop!.saveFile = async () => { throw new Error('Write denied'); }; });
  await page.getByRole('button', { name: 'Save file', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('could not be saved');
  await page.evaluate(() => {
    window.desktop!.saveFile = async (name, content) => {
      sessionStorage.setItem('test-export', JSON.stringify({ name, content }));
      return true;
    };
  });
  await page.getByRole('button', { name: 'Save file', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const exported = await page.evaluate(() => JSON.parse(sessionStorage.getItem('test-export') ?? '{}'));
  expect(exported.name).toBe('spikesim-Desktop-route.rlproj');
  expect(JSON.parse(exported.content).steps[0].command.distanceMm).toBe(300);
  await page.getByRole('button', { name: 'Import program', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('spinbutton', { name: 'Distance (cm), step 1', exact: true })).toHaveValue('30');
});
