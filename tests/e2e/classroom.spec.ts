import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { competitionFields } from '../../src/sim/gears-catalog';
import { startLanServer } from '../../src/lan/server';
import { fromCommands } from '../../src/editor/program';
import { challengeEquipment, challengeIds, type ChallengeId } from '../../src/classroom/challenges';
test.use({ actionTimeout: 10000 });

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
async function create(page: Page, teams = false, challenge?: ChallengeId | string) {
  await page.goto(host.origin + '/?competition=host');
  page.on('dialog', (d) => d.accept());
  const setup = page.locator('.class-setup');
  await setup
    .getByLabel('Competition name', { exact: true })
    .fill(teams ? 'Team cup' : 'Friday robotics cup');
  if (teams) await setup.getByRole('combobox', { name: 'Compete as', exact: true }).selectOption('team');
  if (challenge) {
    await setup.getByRole('radio', { name: /Timed arena challenge/ }).check();
    for (const id of challengeIds) {
      await expect(setup.getByRole('combobox', { name: 'Challenge arena', exact: true }).locator(`option[value="${id}"]`)).toHaveText(challengeEquipment(id).mission.title);
    }
    await setup.getByRole('combobox', { name: 'Challenge arena', exact: true }).selectOption(challenge);
    if (challenge.startsWith('worlds/')) await setup.getByLabel('Task to complete', { exact: true }).fill('Stay parked at the starting point for at least one second.');
    await setup.getByLabel('Run limit (seconds)', { exact: true }).fill('10');
  } else {
    await setup.getByLabel('Compact ring · 160 cm', { exact: true }).check();
    await setup.getByLabel('Round limit (seconds)', { exact: true }).fill('10');
  }
  await setup.getByLabel('Teacher PIN (6 digits)', { exact: true }).fill('123456');
  await setup.getByRole('button', { name: 'Host a competition', exact: true }).click();
  await expect(page.locator('.class-code')).toBeVisible();
  if (!challenge) await expect(page.locator('.class-arena-scene')).toContainText('160 cm ring');
  return (await page.locator('.class-code').innerText()).trim();
}
async function join(page: Page, code: string, name: string) {
  await page.goto(`${host.origin}/?competition=${code}`);
  page.on('dialog', (d) => d.accept());
  await page.getByLabel('Your name', { exact: true }).fill(name);
  await page.getByLabel('Student PIN (4 digits)', { exact: true }).fill('1122');
  await page.getByRole('button', { name: 'Join a competition', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
}
async function showReadyArena(page: Page) {
  // A first rendered frame needs the iframe in view on smaller test windows.
  await page.locator('.class-solo-arena iframe').scrollIntoViewIfNeeded();
  await expect(page.locator('.class-solo-arena .class-3d-stage')).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
}
async function approve(teacher: Page, name: string, team?: string) {
  const row = teacher
    .locator('.class-teacher .class-roster li')
    .filter({ has: teacher.getByText(name, { exact: true }) })
    .first();
  if (team) {
    const option = await row.locator('option').filter({ hasText: team }).getAttribute('value');
    await row.getByRole('combobox').selectOption(option!);
  }
  await row
    .getByRole('button', { name: team ? 'Assign team' : 'Approve entry', exact: true })
    .click();
}
async function importTank(page: Page, speed: number) {
  await page
    .locator('.class-file-button input')
    .setInputFiles({
      name: 'strategy.rlproj',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          kind: 'spikesim-competition',
          version: 1,
          program: fromCommands([
            { type: 'tank', leftPercent: speed, rightPercent: speed, durationMs: 60000 },
          ]),
        }),
      ),
    });
  await expect(
    page.getByRole('button', { name: 'Save shared program', exact: true }),
  ).toBeEnabled();
}

test('classroom stays disconnected until a deliberate connection', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/classroom')) requests.push(r.url());
  });
  await page.goto('/');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Class competitions', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Connect to classroom host', exact: true }),
  ).toBeVisible();
  await page.getByText('Your classroom data', { exact: true }).click();
  await expect(page.getByText(/Names, PIN hashes/)).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  expect(requests).toEqual([]);
});

test('a teacher times a full FLL field in 3D and confirms the published task', async ({ page }) => {
  test.setTimeout(120000);
  const field = competitionFields.find(f => f.file.includes('FLL2025'))!;
  const code = await create(page, false, field.file);
  const student = await (await page.request.post(`${host.origin}/api/classroom/sessions/${code}/join`, { data: { version: 1, name: 'Ada', pin: '1122' } })).json();
  await approve(page, 'Ada');
  await page.getByRole('button', { name: 'Start preparation', exact: true }).click();
  const act = (action: unknown) => page.request.post(`${host.origin}/api/classroom/sessions/${code}/actions`, { data: { version: 1, opId: randomUUID(), action }, headers: { Authorization: `Bearer ${student.token}` } });
  await act({ type: 'take' });
  await act({ type: 'save', baseRevision: 0, program: fromCommands([{ type: 'wait', durationMs: 1200 }]) });
  await act({ type: 'submit', revision: 1, round: 1 });
  await page.getByRole('button', { name: 'Lock submissions', exact: true }).click();
  await page.getByRole('combobox', { name: 'Entry to run', exact: true }).selectOption({ label: 'Ada' });
  await page.getByRole('button', { name: 'Start selected attempt', exact: true }).click({ noWaitAfter: true });
  await expect(page.locator('.class-arena-status')).toContainText('The program has ended', { timeout: 60000 });
  await expect(page.locator('.class-solo-result')).toHaveCount(0);
  await page.getByRole('button', { name: 'Confirm task complete', exact: true }).click();
  await expect(page.locator('.class-solo-result')).toContainText('Ada · Completed');
  await expect(page.locator('.class-solo-result')).toContainText('Stay parked at the starting point');
  await expect(page.locator('.class-solo-scoreboard tbody tr')).toContainText('Completed');
  await expect(page.locator('.class-solo-arena iframe')).toBeVisible();
});

test('maze, fire rescue and FLL practice previews load as real 3D worlds', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(host.origin + '/?competition=host');
  await page.getByRole('radio', { name: /Timed arena challenge/ }).check();
  const picker = page.getByRole('combobox', { name: 'Challenge arena', exact: true });
  for (const [id, name] of [['world:maze:perfect', 'maze'], ['world:fireRescue:grocers', 'fireRescue'], ['task:push', 'custom']]) {
    await picker.selectOption(id);
    await expect(page.locator('.class-setup .class-3d-stage')).toHaveAttribute('data-ready', 'true', { timeout: 45000 });
    const actual = await page.frameLocator('.class-setup iframe').locator('body').evaluate(() => {
      const state = window as unknown as { babylon: { world: { name: string }; scene: { meshes: unknown[] } }; robot: { body: unknown } };
      return { world: state.babylon.world.name, meshes: state.babylon.scene.meshes.length, robot: Boolean(state.robot.body) };
    });
    expect(actual.world).toBe(name); expect(actual.meshes).toBeGreaterThan(10); expect(actual.robot).toBe(true);
    await expect(page.locator('.class-solo-brief')).toContainText('Automatic goal checks');
  }
});

test('a teacher chooses a non-sumo arena and runs one student with a real deadline and ranked history', async ({ browser, page }) => {
  test.setTimeout(180000);
  const code = await create(page, false, 'basics-4');
  const restoreTeacher = async () => {
    await page.reload();
    await page.getByRole('combobox', { name: 'Saved sessions', exact: true }).selectOption(code);
    await page.locator('.class-login-column').getByLabel('Teacher PIN (6 digits)', { exact: true }).fill('123456');
    await page.getByRole('button', { name: 'Teacher sign in', exact: true }).click();
  };
  const context = await browser.newContext();
  const student = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  student.on('pageerror', e => errors.push(e.message));
  try {
    await join(student, code, 'Ada');
    await approve(page, 'Ada');
    const submit = async (program: ReturnType<typeof fromCommands>) => {
      await student.getByRole('button', { name: 'Take editing turn', exact: true }).click();
      await student.locator('.class-file-button input').setInputFiles({
        name: 'arena-route.rlproj', mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, kind: 'spikesim-program', name: 'My route', missionId: 'basics-4', steps: [], visualProgram: program })),
      });
      await student.getByRole('button', { name: 'Submit program', exact: true }).click();
    };
    await page.getByRole('button', { name: 'Start preparation', exact: true }).click();
    const reference = fromCommands(challengeEquipment('basics-4').mission.reference);
    await submit(reference);
    await expect(student.locator('.class-workbench')).toContainText('Version 1 submitted');
    await page.getByRole('button', { name: 'Lock submissions', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Second entry', exact: true })).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Entry to run', exact: true }).selectOption({ label: 'Ada' });
    await page.getByRole('button', { name: 'Start selected attempt', exact: true }).click({ noWaitAfter: true });
    await expect(page.locator('.class-arena-status')).toContainText('Attempt running');
    await showReadyArena(page);
    await expect(page.locator('.class-solo-result')).toContainText('Ada · Completed', { timeout: 20000 });
    await expect(student.locator('.class-solo-result')).toContainText('Ada · Completed');
    await showReadyArena(student);
    const robotPosition = (client: Page) => client.frameLocator('.class-solo-arena iframe').locator('body').evaluate(() => {
      const state = window as unknown as { robot: { body: { position: { x: number; z: number } } } };
      return { x: state.robot.body.position.x, z: state.robot.body.position.z };
    });
    const teacherPosition = await robotPosition(page);
    await expect.poll(async () => { const shown = await robotPosition(student); return Math.hypot(shown.x - teacherPosition.x, shown.z - teacherPosition.z); }, { timeout: 15000 }).toBeLessThan(1);
    const row = page.locator('.class-solo-scoreboard tbody tr').first();
    await expect(row).toContainText('Completed');
    await expect(row.locator('td').last()).not.toHaveText('—');
    const best = await row.locator('td').last().innerText();
    const csvEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export scoreboard', exact: true }).click();
    const csv = await readFile((await (await csvEvent).path())!, 'utf8');
    expect(csv).toContain('Precision stop');
    expect(csv).toContain('"Ada","1","Completed","2/2"');
    const programEvent = page.waitForEvent('download');
    await page.locator('.class-result-list').getByRole('button', { name: 'Download program: Ada', exact: true }).click();
    expect(JSON.parse(await readFile((await (await programEvent).path())!, 'utf8')).program).toEqual(reference);
    await page.setViewportSize({ width: 1024, height: 640 });
    const projector = page.getByRole('button', { name: 'Project arena', exact: true });
    await projector.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Project arena', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog').locator('.class-3d-stage iframe')).toHaveCount(1);
    await page.keyboard.press('Escape'); await expect(projector).toBeFocused();
    await restoreTeacher();
    await showReadyArena(page);
    await expect.poll(async () => { const shown = await robotPosition(page); return Math.hypot(shown.x - teacherPosition.x, shown.z - teacherPosition.z); }, { timeout: 15000 }).toBeLessThan(1);
    await page.getByRole('button', { name: 'New preparation round', exact: true }).click();
    await submit(fromCommands([{ type: 'wait', durationMs: 60000 }]));
    await expect(student.locator('.class-workbench')).toContainText('Version 2 submitted');
    await page.getByRole('button', { name: 'Lock submissions', exact: true }).click();
    await page.getByRole('combobox', { name: 'Entry to run', exact: true }).selectOption({ label: 'Ada' });
    await page.getByRole('button', { name: 'Start selected attempt', exact: true }).click({ noWaitAfter: true });
    await showReadyArena(page);
    await expect(page.locator('.class-solo-result')).toContainText('Ada · Incomplete', { timeout: 20000 });
    await expect(page.locator('.class-solo-clock [role="timer"]')).toHaveText('0:00');
    await expect(page.locator('.class-solo-result')).toContainText('10.00 s');
    await expect(page.locator('.class-solo-result')).toContainText('The run timer reached its limit');
    await expect(row.locator('td').last()).toHaveText(best);
    await expect(row).toContainText('Completed');
    await restoreTeacher();
    await expect(page.locator('.class-result-list li')).toHaveCount(2);
    await expect(page.locator('.class-solo-scoreboard tbody tr').first().locator('td').last()).toHaveText(best);
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('teacher runs an individual competition, exports the real result and signs back in', async ({
  browser,
  page,
}) => {
  test.setTimeout(70000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const code = await create(page);
  const a = await browser.newContext(),
    b = await browser.newContext();
  try {
    const ada = await a.newPage(),
      ben = await b.newPage();
    await join(ada, code, 'Ada');
    await join(ben, code, 'Ben');
    await approve(page, 'Ada');
    await approve(page, 'Ben');
    await page.getByRole('button', { name: 'Start preparation', exact: true }).click();
    await page.getByRole('button', { name: 'Pause preparation timer', exact: true }).click();
    await expect(page.getByText('Preparation timer paused', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Resume preparation timer', exact: true }).click();
    for (const [student, speed] of [
      [ada, 80],
      [ben, 20],
    ] as const) {
      await student.getByRole('button', { name: 'Take editing turn', exact: true }).click();
      await importTank(student, speed);
      await student.getByRole('button', { name: 'Submit program', exact: true }).click();
      await expect(student.locator('.class-workbench')).toContainText('Version 1 submitted');
    }
    await page.getByRole('button', { name: 'Lock submissions', exact: true }).click();
    await page.getByRole('combobox', { name: 'First entry', exact: true }).selectOption({ label: 'Ada' });
    await page.getByRole('combobox', { name: 'Second entry', exact: true }).selectOption({ label: 'Ben' });
    await page.getByRole('button', { name: 'Start selected match', exact: true }).click();
    await expect(page.locator('.class-arena-status')).toContainText('Match running');
    await expect(page.locator('.class-result')).toContainText('Ada wins', { timeout: 20000 });
    await expect(ada.locator('.class-result')).toContainText('Ada wins');
    await expect(ben.locator('.class-result')).toContainText('Ada wins');
    await expect(page.locator('.class-scoreboard tbody tr').first()).toContainText('Ada');
    await expect(
      page.locator('.class-scoreboard tbody tr').first().locator('td').last(),
    ).toHaveText('3');
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export scoreboard', exact: true }).click();
    const file = await downloadEvent;
    expect(await readFile((await file.path())!, 'utf8')).toContain('Ada wins');
    await page.setViewportSize({ width: 1024, height: 640 });
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
    });
    const projector = page.getByRole('button', { name: 'Project arena', exact: true });
    await projector.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Project arena', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(projector).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.reload();
    await page.getByRole('combobox', { name: 'Saved sessions', exact: true }).selectOption(code);
    await page
      .locator('.class-login-column')
      .getByLabel('Teacher PIN (6 digits)', { exact: true })
      .fill('123456');
    await page.getByRole('button', { name: 'Teacher sign in', exact: true }).click();
    await expect(page.locator('.class-result')).toContainText('Ada wins');
    expect(errors).toEqual([]);
  } finally {
    await a.close();
    await b.close();
  }
});

test('team handover and a lost save acknowledgement preserve a single shared version', async ({
  browser,
  page,
}) => {
  test.setTimeout(60000);
  const code = await create(page, true);
  await page.getByLabel('Team name', { exact: true }).fill('Comets');
  await page.getByRole('button', { name: 'Create team', exact: true }).click();
  const a = await browser.newContext(),
    b = await browser.newContext();
  try {
    const ada = await a.newPage(),
      ben = await b.newPage();
    await join(ada, code, 'Ada');
    await join(ben, code, 'Ben');
    await approve(page, 'Ada', 'Comets');
    await approve(page, 'Ben', 'Comets');
    await ada.getByRole('button', { name: 'Take editing turn', exact: true }).click();
    await expect(
      ben.getByRole('button', { name: 'Take editing turn', exact: true }),
    ).toBeDisabled();
    await importTank(ada, 70);
    let dropped = false, committed = false;
    await ada.route('**/api/classroom/**', async (route) => {
      const request = route.request();
      if (dropped && request.method() === 'GET') {
        // Hold reconnection until the test has observed the persisted outbox.
        await route.abort();
      } else if (!dropped && request.method() === 'POST' && request.postDataJSON().action?.type === 'save') {
        dropped = true;
        const headers = await request.allHeaders(), data = request.postDataJSON();
        // Drop the browser response, then commit that exact operation separately.
        // route.fetch() races the client's request timeout and may already be
        // handled before abort() runs on a slower machine.
        await route.abort();
        const response = await ada.request.post(request.url(), { headers, data });
        expect(response.ok()).toBe(true);
        committed = true;
      } else await route.continue();
    });
    await ada.getByRole('button', { name: 'Save shared program', exact: true }).click();
    await expect.poll(() => committed).toBe(true);
    await expect(ada.getByText('Waiting to send (1)', { exact: true })).toBeVisible();
    await ada.unrouteAll({ behavior: 'wait' });
    // It may already retry on the first successful poll. Either path must deduplicate.
    await expect(ada.getByText('Waiting to send (1)', { exact: true })).toHaveCount(0, {
      timeout: 12000,
    });
    await expect(ada.locator('.class-workbench .class-pill').first()).toHaveText('Version 1');
    await ada.getByRole('button', { name: 'Hand over editing', exact: true }).click();
    await ben.getByRole('button', { name: 'Take editing turn', exact: true }).click();
    await expect(ben.locator('.class-workbench .class-pill').first()).toHaveText('Version 1');
    await importTank(ben, 65);
    await ben.getByRole('button', { name: 'Save shared program', exact: true }).click();
    await expect(ben.locator('.class-workbench .class-pill').first()).toHaveText('Version 2');
    await ben.reload();
    await ben.getByLabel('Your name', { exact: true }).fill('Ben');
    await ben.getByLabel('Student PIN (4 digits)', { exact: true }).fill('1122');
    await ben.getByRole('button', { name: 'Join a competition', exact: true }).click();
    await expect(ben.locator('.class-workbench .class-pill').first()).toHaveText('Version 2');
    const storage = await ben.evaluate(() => ({
      local: Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]),
      session: Object.keys(sessionStorage).map((k) => [k, sessionStorage.getItem(k)]),
    }));
    expect(JSON.stringify(storage)).not.toMatch(/"token"|1122|123456/);
  } finally {
    await a.close();
    await b.close();
  }
});
