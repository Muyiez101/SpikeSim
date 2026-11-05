import { test, expect } from '@playwright/test';
import { missionsById } from '../../src/missions/content';
import { fromCommands } from '../../src/editor/program';
import { robotPresets } from '../../src/sim/presets';

for (const id of ['loops-5', 'patterns-4', 'sensors-1', 'sensors-3']) {
  test(`${id}: the block reference earns three stars using actual 3D physics`, async ({ page }) => {
    test.setTimeout(90000);
    const mission = missionsById[id];
    const draft = { missionId: id, steps: [], outcome: null, visualProgram: mission.visualReference ?? fromCommands(mission.reference), robot: robotPresets[mission.robotPreset], robotTemplate: 'singleFollower' };
    await page.addInitScript(draft => {
      if (window.top !== window) return;
      localStorage.setItem('spikesim.playground.v1', JSON.stringify({ schemaVersion: 1, selected: { home: draft.missionId, play: null }, drafts: [draft] }));
    }, draft);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    const stage = page.locator('.unified-stage');
    await expect(stage).toHaveAttribute('data-status', 'ready', { timeout: 45000 });
    const wheel = await page.frameLocator('iframe[title="3D robot simulator"]').locator('body').evaluate(() => {
      const { robot } = window as unknown as { robot: { leftWheel: { maxAcceleration: number; stopActionHoldForce: number; TIRE_DOWNWARDS_FORCE: { y: number } } } };
      return { acceleration: robot.leftWheel.maxAcceleration, brake: robot.leftWheel.stopActionHoldForce, load: robot.leftWheel.TIRE_DOWNWARDS_FORCE.y };
    });
    expect(wheel.acceleration).toBeGreaterThan(0);
    expect(wheel.brake).toBeGreaterThan(0);
    expect(wheel.load).toBeLessThan(0);
    await page.getByRole('button', { name: 'Top view', exact: true }).click();
    await page.getByRole('button', { name: 'Run program', exact: true }).click();
    await expect(stage).toHaveAttribute('data-status', 'complete', { timeout: 35000 });
    const outcome = await page.evaluate(() => JSON.parse(localStorage.getItem('spikesim.playground.v1')!).drafts[0].outcome);
    expect(outcome?.stars).toBe(3);
    expect(outcome.goals.every((goal: { passed: boolean }) => goal.passed)).toBe(true);
    expect(errors).toEqual([]);
  });
}
