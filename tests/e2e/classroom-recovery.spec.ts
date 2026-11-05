import { test, expect } from '@playwright/test';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { startLanServer } from '../../src/lan/server';
import { authSchema, defaultSettings, responseSchema, type CompetitionAction } from '../../src/classroom/protocol';
import { challengeEquipment } from '../../src/classroom/challenges';
import { fromCommands } from '../../src/editor/program';

test('a saved 3D result restores its finishing pose after host restart and the next attempt starts fresh', async ({ page }) => {
  test.setTimeout(120000);
  await mkdir('.local', { recursive: true });
  const directory = await mkdtemp(resolve('.local/classroom-recovery-'));
  const options = {
    root: resolve('dist'), workerPath: resolve('dist-electron/match-worker.js'),
    bind: '127.0.0.1', discovery: false, competitionFile: join(directory, 'sessions.json'),
  };
  let host = await startLanServer(options);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    const api = async (path: string, data: unknown, token?: string) => {
      const response = await page.request.post(host.origin + '/api/classroom' + path, {
        data, headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      expect(response.ok()).toBe(true);
      return response.json();
    };
    const teacher = authSchema.parse(await api('/sessions', {
      version: 1, opId: randomUUID(), pin: '123456',
      settings: { ...defaultSettings, title: 'Saved arena review', kind: 'challenge', roundSeconds: 20 },
    }));
    const code = teacher.view.code;
    const student = authSchema.parse(await api(`/sessions/${code}/join`, { version: 1, name: 'Ada', pin: '1122' }));
    const act = async (token: string, action: CompetitionAction) => responseSchema.parse(await api(
      `/sessions/${code}/actions`, { version: 1, opId: randomUUID(), action }, token,
    ));
    await act(teacher.token, { type: 'approve', memberId: student.view.memberId! });
    await act(teacher.token, { type: 'prepare' });
    const taken = await act(student.token, { type: 'take' });
    const entryId = taken.view!.ownEntry!.id;
    await act(student.token, { type: 'save', baseRevision: 0, program: fromCommands(challengeEquipment('basics-4').mission.reference) });
    await act(student.token, { type: 'submit', revision: 1, round: 1 });
    await act(teacher.token, { type: 'lock' });
    const signIn = async () => {
      await page.goto(host.origin + '/?competition=host');
      await page.getByRole('combobox', { name: 'Saved sessions', exact: true }).selectOption(code);
      await page.locator('.class-login-column').getByLabel('Teacher PIN (6 digits)', { exact: true }).fill('123456');
      await page.getByRole('button', { name: 'Teacher sign in', exact: true }).click();
      // Readiness includes a rendered frame; Chromium throttles offscreen iframes.
      await page.locator('.class-solo-arena iframe').scrollIntoViewIfNeeded();
      await expect(page.locator('.class-solo-arena .class-3d-stage')).toHaveAttribute('data-ready', 'true', { timeout: 45000 });
    };
    const position = () => page.frameLocator('.class-solo-arena iframe').locator('body').evaluate(() => {
      const state = window as unknown as {
        robot: { body: { position: { x: number; y: number; z: number } } };
        babylon: { scene: { physicsEnabled: boolean } };
      };
      const { x, y, z } = state.robot.body.position;
      return { x, y, z, physics: state.babylon.scene.physicsEnabled };
    });
    const start = async () => {
      await page.getByRole('combobox', { name: 'Entry to run', exact: true }).selectOption(entryId);
      await page.getByRole('button', { name: 'Start selected attempt', exact: true }).click({ noWaitAfter: true });
    };
    await signIn();
    const initial = await position();
    await start();
    await expect(page.locator('.class-solo-result')).toContainText('Ada · Completed', { timeout: 30000 });
    const finished = await position();
    expect(Math.hypot(finished.x - initial.x, finished.z - initial.z)).toBeGreaterThan(30);
    const best = await page.locator('.class-solo-scoreboard tbody tr').first().locator('td').last().innerText();
    await page.goto('about:blank');
    const port = Number(new URL(host.origin).port);
    await host.close();
    host = await startLanServer({ ...options, port });
    await signIn();
    await expect.poll(async () => {
      const restored = await position();
      return Math.hypot(restored.x - finished.x, restored.y - finished.y, restored.z - finished.z);
    }).toBeLessThan(1);
    expect((await position()).physics).toBe(false);
    await expect(page.locator('.class-solo-result')).toContainText('Ada · Completed');
    await expect(page.locator('.class-solo-scoreboard tbody tr').first().locator('td').last()).toHaveText(best);
    await start();
    await expect(page.locator('.class-result-list li')).toHaveCount(2, { timeout: 30000 });
    await expect(page.locator('.class-solo-result')).toContainText('Ada · Completed');
    expect(errors).toEqual([]);
  } finally {
    await page.goto('about:blank');
    await host.close();
  }
});
