import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { missions, missionWorldMap } from '../src/missions/content';
import { LiveRun } from '../src/runtime/live-run';
import { checkMission } from '../src/missions/engine';
import { parseProgramFile } from '../src/progress/program-file';
import type { SimSnapshot } from '../src/sim/types';

// One real WebGL simulation at a time. Never substitute a 2D prediction.
const requested = process.argv.slice(2);
const selected = requested.length ? missions.filter(m => requested.includes(m.id)) : missions;
if (requested.some(id => !missions.some(m => m.id === id))) throw Error('Unknown classroom mission ID');
const root = resolve('recordings');
await mkdir(resolve(root, 'regressions'), { recursive: true });
const browser = await chromium.launch({ headless: true });
let failures = 0;
try {
  for (const mission of selected) {
    console.log(`Starting ${mission.id}`);
    const content = await readFile(resolve(root, `projects/${mission.id}.rlproj`), 'utf8');
    const parsed = parseProgramFile(content, missions.map(m => m.id));
    if (!parsed.ok || !parsed.program.visualProgram) throw Error(`Invalid project: ${mission.id}`);
    const project = parsed.program, map = missionWorldMap(mission);
    const run = new LiveRun(map, project.visualProgram!);
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors: string[] = [];
    let active = false;
    await page.exposeFunction('observeMission', (data: Record<string, unknown>) => {
      if (!active || data.channel !== 'spikesim-3d') return;
      if (data.type === 'frame' && data.running) {
        const f = data as unknown as { t: number; x: number; y: number; yaw: number; wheels: number[]; sensors: SimSnapshot['sensors']; hub: SimSnapshot['hub']; objects: { id: string; x: number; y: number }[] };
        run.frame({ t: f.t, robot: { x: f.x * 10 + map.size.width / 2, y: map.size.height / 2 - f.y * 10, heading: (f.yaw - 90) * Math.PI / 180, wheels: f.wheels, arms: [] }, objects: f.objects.map(o => ({ id: o.id, x: o.x * 10 + map.size.width / 2, y: map.size.height / 2 - o.y * 10, heading: 0 })), hub: f.hub, sensors: f.sensors, events: [] });
      }
      if (data.type === 'block') run.mark(String(data.id));
      if (data.type === 'variables') run.variables = data.values as typeof run.variables;
      if (data.type === 'sound') run.events.push({ type: 'sound', data: { t: run.snapshots.at(-1)?.t ?? 0, frequency: Number(data.frequency), durationMs: Number(data.durationMs) } });
      if (data.type === 'collision') run.events.push({ type: 'collision', data: { wall: '3d obstacle' } });
      if (data.type === 'error') errors.push(String(data.message));
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(project => {
      if (window.top !== window) return;
      localStorage.setItem('spikesim.playground.v1', JSON.stringify({ schemaVersion: 1, selected: { home: project.missionId, play: null }, drafts: [{ ...project, outcome: null }] }));
      localStorage.setItem('spikesim.renderer', '3d');
      window.addEventListener('message', event => {
        void (window as unknown as { observeMission: (data: unknown) => Promise<void> }).observeMission(event.data);
      });
    }, project);
    let status = 'loading';
    try {
      await page.goto('http://127.0.0.1:5173/');
      await page.waitForFunction(() => document.querySelector<HTMLElement>('.unified-stage')?.dataset.status === 'ready', { }, { timeout: 45000 });
      await page.getByRole('button', { name: 'Top view', exact: true }).click();
      active = true;
      await page.getByRole('button', { name: 'Run program', exact: true }).click();
      await page.waitForFunction(() => ['complete', 'error'].includes(document.querySelector<HTMLElement>('.unified-stage')?.dataset.status ?? ''), { }, { timeout: 80000 });
      status = await page.locator('.unified-stage').getAttribute('data-status') ?? 'unknown';
    } catch (error) { errors.push(String(error)); status = 'timeout'; }
    active = false;
    const execution = run.finish();
    const verdict = execution ? checkMission(mission, execution.result, map, execution) : null;
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('spikesim.playground.v1') ?? '{}').drafts?.[0]?.outcome).catch(() => null);
    const result = { id: mission.id, name: mission.title, checkedAt: new Date().toISOString(), status, verdict, uiOutcome: saved, errors, end: execution?.result.end, events: run.events, usedBlocks: [...run.usedBlocks], variables: run.variables };
    // Keep fresh regressions separate from the evidence paired with saved videos.
    await writeFile(resolve(root, `regressions/${mission.id}.json`), JSON.stringify(result, null, 2) + '\n');
    if (status !== 'complete' || verdict?.stars !== 3 || errors.length) failures++;
    console.log(JSON.stringify({ id: mission.id, status, stars: verdict?.stars, seconds: verdict?.runSeconds, failed: verdict?.goals.filter(g => !g.passed).map(g => g.label), errors }));
    await context.close();
  }
} finally { await browser.close(); }
if (failures) process.exitCode = 1;
