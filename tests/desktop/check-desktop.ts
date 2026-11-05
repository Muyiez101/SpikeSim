import { _electron, expect, type ElectronApplication, type Page } from '@playwright/test';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fromCommands } from '../../src/editor/program';
import { authSchema, responseSchema, type CompetitionAction } from '../../src/classroom/protocol';

// Run against the built checkout, or pass a packaged executable as the first argument.
await mkdir('.local', { recursive: true });
const directory = await mkdtemp(resolve('.local/desktop-check-'));
const profile = join(directory, 'profile');
await mkdir(profile);
const packaged = process.argv[2];
const executable = packaged ? resolve(packaged) : resolve('node_modules/electron/dist',
  process.platform === 'win32' ? 'electron.exe' : process.platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron' : 'electron');
const env: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined && !['ELECTRON_RUN_AS_NODE', 'VITE_DEV_SERVER_URL'].includes(key)) env[key] = value;
}
const errors: string[] = [], external: string[] = [];
let application: ElectronApplication | undefined;
async function launch() {
  const app = await _electron.launch({ executablePath: executable, args: [...(packaged ? [] : [resolve('.')]), `--user-data-dir=${profile}`], env, chromiumSandbox: true, timeout: 60000 });
  application = app;
  app.context().setDefaultTimeout(15000);
  await app.context().route(/^https?:\/\//, route => {
    if (['127.0.0.1', 'localhost', '[::1]'].includes(new URL(route.request().url()).hostname)) return route.continue();
    external.push(route.request().url());
    return route.abort();
  });
  app.on('window', page => page.on('pageerror', error => errors.push(error.message)));
  const page = await app.firstWindow();
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  expect(await app.evaluate(({ app }) => app.getPath('userData'))).toBe(profile);
  expect(page.url()).toMatch(/^file:/);
  expect(await page.evaluate(() => ({ bridge: Boolean(window.desktop), require: typeof Reflect.get(window, 'require') }))).toEqual({ bridge: true, require: 'undefined' });
  const sandboxed = await app.evaluate(({ app, BrowserWindow }) => {
    const pid = BrowserWindow.getAllWindows()[0].webContents.getOSProcessId();
    return app.getAppMetrics().find(metric => metric.pid === pid)?.sandboxed;
  });
  if (process.platform === 'win32' || process.platform === 'darwin') expect(sandboxed).toBe(true);
  return { app, page };
}
async function ready(page: Page) {
  await page.locator('.unified-stage iframe').scrollIntoViewIfNeeded();
  await expect(page.locator('.unified-stage')).toHaveAttribute('data-status', 'ready', { timeout: 60000 });
}
async function close(app: ElectronApplication) {
  // On Windows Playwright launches through cmd.exe. Wait for the actual Electron
  // processes as well before reusing the profile or uninstalling their binaries.
  const pids = await app.evaluate(({ app }) => app.getAppMetrics().map(metric => metric.pid));
  await app.close();
  await expect.poll(() => pids.filter(pid => {
    try { process.kill(pid, 0); return true; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
      throw error;
    }
  }), { timeout: 30000 }).toEqual([]);
}
try {
  let opened = await launch();
  application = opened.app;
  let page = opened.page;
  await ready(page);
  const simulator = page.frameLocator('.unified-stage iframe');
  expect(await simulator.locator('body').evaluate(() => {
    // Gears bundles a browser module loader named require; it must not expose Node.
    let nodeFiles = false;
    try {
      const loader: unknown = Reflect.get(window, 'require');
      if (typeof loader === 'function') nodeFiles = Boolean(loader('node:fs')?.readFileSync);
    } catch { /* A browser loader may reject unknown modules. */ }
    return { bridge: Boolean(window.desktop), process: typeof Reflect.get(window, 'process'), nodeFiles };
  })).toEqual({ bridge: false, process: 'undefined', nodeFiles: false });
  await page.getByRole('button', { name: 'Add block', exact: true }).click();
  await page.getByRole('button', { name: 'Add block', exact: true }).click();
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.locator('.unified-stage')).toHaveAttribute('data-status', 'complete', { timeout: 30000 });
  await page.getByRole('tab', { name: 'Mission', exact: true }).click();
  await expect(page.getByLabel('3 of 3 stars', { exact: true })).toBeVisible();
  console.log('Built desktop: real 3D run and isolated preload passed');
  await page.getByRole('button', { name: '2D replay', exact: true }).click();
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.locator('.sim-stage')).toHaveAttribute('data-status', 'complete', { timeout: 30000 });
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await ready(page);
  console.log('Desktop 2D worker and replay passed');

  // Supply native dialog selections while exercising the real preload, IPC and disk I/O.
  const programFile = join(directory, 'desktop-route.rlproj');
  await application.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, programFile);
  await page.getByRole('button', { name: 'Export program', exact: true }).click();
  await page.getByLabel('Program name', { exact: true }).fill('Desktop route');
  await page.getByRole('button', { name: 'Save file', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const saved = JSON.parse(await readFile(programFile, 'utf8'));
  expect(saved).toMatchObject({ kind: 'spikesim-program', name: 'Desktop route' });
  expect(saved.visualProgram.blocks.blocks.length).toBeGreaterThan(0);
  const invalidFile = join(directory, 'invalid.rlproj');
  await writeFile(invalidFile, '{invalid');
  await application.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] });
  }, invalidFile);
  await page.getByRole('button', { name: 'Import program', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('not a supported SpikeSim program');
  await application.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] });
  }, programFile);
  await page.getByRole('button', { name: 'Import program', exact: true }).click();
  await page.getByRole('button', { name: 'Replace and open', exact: true }).click();
  await ready(page);
  await page.screenshot({ path: join(directory, 'desktop-workspace.png') });
  console.log('Desktop file export, validation and import passed');
  for (const [kind, label] of [['robot', 'robot'], ['world', 'ground']]) {
    await page.getByRole('button', { name: `Build a ${label}`, exact: true }).click();
    const builder = page.getByRole('dialog', { name: `Build a ${label}`, exact: true });
    const use = builder.getByRole('button', { name: `Use this ${label}`, exact: true });
    await expect(use).toBeEnabled({ timeout: 60000 });
    await builder.getByLabel('Design name', { exact: true }).fill(`Desktop ${kind}`);
    await use.click();
    await expect(builder).toHaveCount(0);
    await ready(page);
  }
  console.log('Desktop robot and ground design bridges passed');
  const savedDrafts = await page.evaluate(() => localStorage.getItem('spikesim.playground.v1'));
  expect(savedDrafts).toContain('Desktop robot');
  expect(savedDrafts).toContain('Desktop world');
  expect(savedDrafts).toContain('spike_move');
  await writeFile(join(directory, 'before-restart.json'), JSON.stringify({ url: page.url(), savedDrafts }));

  await page.getByRole('navigation').getByRole('button', { name: 'Learn', exact: true }).click();
  await page.getByRole('button', { name: 'Open lesson: Give clear directions', exact: true }).click();
  const video = page.locator('video');
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState), { timeout: 20000 }).toBeGreaterThanOrEqual(2);
  await video.evaluate((element: HTMLVideoElement) => { element.currentTime = 3; });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.seeking && element.currentTime >= 3)).toBe(true);
  console.log('Desktop lesson video decoding and seeking passed');

  await page.getByRole('navigation').getByRole('button', { name: 'Class competitions', exact: true }).click();
  const hostWindow = application.waitForEvent('window');
  await page.getByRole('button', { name: 'Start classroom host', exact: true }).click();
  const teacher = await hostWindow;
  teacher.on('dialog', dialog => dialog.accept());
  expect(await teacher.evaluate(() => Boolean(window.desktop))).toBe(false);
  const setup = teacher.locator('.class-setup');
  await setup.getByLabel('Competition name', { exact: true }).fill('Desktop acceptance');
  await setup.getByLabel('Round limit (seconds)', { exact: true }).fill('10');
  await setup.getByLabel('Teacher PIN (6 digits)', { exact: true }).fill('123456');
  await setup.getByRole('button', { name: 'Host a competition', exact: true }).click();
  const code = (await teacher.locator('.class-code').innerText()).trim();
  const origin = new URL(teacher.url()).origin;
  const videoRange = await teacher.request.get(`${origin}/learn/move/example.mp4`, { headers: { Range: 'bytes=16-47' } });
  expect(videoRange.status()).toBe(206);
  expect((await videoRange.body()).length).toBe(32);
  const api = async (path: string, data: unknown, token?: string) => {
    const response = await teacher.request.post(`${origin}/api/classroom${path}`, { data, headers: token ? { Authorization: `Bearer ${token}` } : {} });
    expect(response.ok()).toBe(true);
    return response.json();
  };
  const teacherAuth = authSchema.parse(await api(`/sessions/${code}/teacher`, { version: 1, pin: '123456' }));
  const act = async (token: string, action: CompetitionAction) => responseSchema.parse(await api(`/sessions/${code}/actions`, { version: 1, opId: randomUUID(), action }, token));
  const students = [];
  for (const name of ['Ada', 'Ben']) {
    const student = authSchema.parse(await api(`/sessions/${code}/join`, { version: 1, name, pin: '1122' }));
    await act(teacherAuth.token, { type: 'approve', memberId: student.view.memberId! });
    students.push(student);
  }
  await act(teacherAuth.token, { type: 'prepare' });
  for (const [i, student] of students.entries()) {
    await act(student.token, { type: 'take' });
    await act(student.token, { type: 'save', baseRevision: 0, program: fromCommands([{ type: 'tank', leftPercent: i ? 20 : 80, rightPercent: i ? 20 : 80, durationMs: 60000 }]) });
    await act(student.token, { type: 'submit', revision: 1, round: 1 });
  }
  await act(teacherAuth.token, { type: 'lock' });
  await teacher.getByRole('combobox', { name: 'First entry', exact: true }).selectOption({ label: 'Ada' });
  await teacher.getByRole('combobox', { name: 'Second entry', exact: true }).selectOption({ label: 'Ben' });
  await teacher.getByRole('button', { name: 'Start selected match', exact: true }).click();
  await expect(teacher.locator('.class-result')).toContainText('Ada wins', { timeout: 20000 });
  await teacher.screenshot({ path: join(directory, 'desktop-host.png') });
  console.log('Desktop classroom window and authoritative worker passed');
  let closing = application;
  application = undefined;
  await close(closing);
  const stored = JSON.parse(await readFile(join(profile, 'classroom', 'sessions.json'), 'utf8'));
  expect(stored.sessions.find((session: { code: string }) => session.code === code).results).toHaveLength(1);
  opened = await launch();
  application = opened.app;
  page = opened.page;
  await ready(page);
  const restoredDrafts = await page.evaluate(() => localStorage.getItem('spikesim.playground.v1'));
  await writeFile(join(directory, 'after-restart.json'), JSON.stringify({ url: page.url(), savedDrafts: restoredDrafts }));
  expect(restoredDrafts).toBe(savedDrafts);
  await expect(page.locator('.blocklyWorkspace').first()).toContainText('move');
  await page.screenshot({ path: join(directory, 'desktop-restored.png') });
  closing = application;
  application = undefined;
  await close(closing);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  await writeFile(join(directory, 'report.json'), JSON.stringify({ passed: true, executable, packaged: Boolean(packaged), profile, external, errors, nativeDialogSelection: 'controlled test paths; actual IPC and disk I/O', checks: ['3D mission', '2D worker', 'preload isolation', 'program files', 'robot and ground builders', 'lesson video decoding and seeking', 'hosted video byte range', 'classroom worker', 'session persistence', 'draft restart', 'external network blocked'] }, null, 2));
  console.log('Desktop acceptance passed:', directory);
} catch (error) {
  await writeFile(join(directory, 'report.json'), JSON.stringify({ passed: false, executable, errors, external, error: String(error) }, null, 2));
  console.error('Desktop acceptance failed:', directory);
  throw error;
} finally {
  if (application) await close(application);
}
