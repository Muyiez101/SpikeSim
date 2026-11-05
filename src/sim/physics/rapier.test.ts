import { describe, expect, it } from 'vitest';
import { defaultMap } from '../maps';
import { defaultRobot } from '../presets';
import { createRapierSimulation } from './rapier';

describe('Rapier simulation backend', () => {
  it('creates a deterministic static world and robot body', async () => {
    const simulation = await createRapierSimulation(defaultMap, defaultRobot.width, defaultRobot.length, defaultMap.spawn.x, defaultMap.spawn.y);
    expect(simulation.robot.translation().x).toBe(defaultMap.spawn.x);
    expect(simulation.robot.translation().y).toBe(defaultMap.spawn.y);
    simulation.world.step();
    simulation.dispose();
  });
});
