import { describe, expect, it } from 'vitest';
import { DeterministicSimulator } from './engine';
import { mapFiles } from './maps';
import { robotPresets } from './presets';
import type { SimCommand } from './types';

const simulator = (map = 'open-floor', robot = 'driving-base') => new DeterministicSimulator({ map: mapFiles[map], robot: robotPresets[robot], seed: 42 });

describe('deterministic simulator', () => {
  it('does not jump through an internal wall when its requested end point is clear', () => {
    const map = structuredClone(mapFiles['open-floor']);
    map.walls.push({ points: [[500, 0], [500, 600]], thickness: 20, height: 100 });
    const result = new DeterministicSimulator({ map, robot: robotPresets['driving-base'] }).run([{ type: 'move', distanceMm: 600, speedPercent: 60 }]);
    expect(result.end.robot.x).toBeLessThan(450);
    expect(result.events.some(event => event.type === 'collision')).toBe(true);
  });
  it('drives the requested distance on an open floor', () => {
    const result = simulator().run([{ type: 'move', distanceMm: 300, speedPercent: 60 }]);
    expect(result.end.robot.x).toBeCloseTo(440, 0);
    expect(result.end.robot.y).toBeCloseTo(300, 0);
  });

  it('turns in place by the requested angle', () => {
    const result = simulator().run([{ type: 'turn', degrees: 90, speedPercent: 60 }]);
    expect(result.end.robot.heading * 180 / Math.PI).toBeCloseTo(90, 0);
    expect(result.end.robot.x).toBeCloseTo(140, 0);
    expect(result.end.robot.y).toBeCloseTo(300, 0);
  });

  it('returns color, distance, force, and gyro readings', () => {
    const line = simulator('line-track', 'line-follower');
    expect(line.readSensor('D')).toBe('black');
    expect(line.readSensor('F')).toBe(0);
    const open = simulator();
    expect(open.readSensor('F')).toBe(0);
    expect(open.readSensor('E')).toBeGreaterThan(700);
  });

  it('does not pass through the boundary', () => {
    const result = simulator().run([{ type: 'move', distanceMm: 2000, speedPercent: 100 }]);
    expect(result.end.robot.x).toBeLessThan(900);
    expect(result.events.some((event) => event.type === 'collision')).toBe(true);
  });

  it('records sensor readings at each replay pose without adding read events', () => {
    const sim = simulator();
    const initial = sim.snapshot();
    const result = sim.run([{ type: 'move', distanceMm: 300, speedPercent: 60 }]);
    expect(initial.sensors.E).toBe(774);
    expect(result.end.sensors.E).toBe(474);
    for (const frame of result.snapshots) {
      expect(frame.sensors.E).toBe(Math.round(1000 - frame.robot.x - 86));
    }
    expect(initial.sensors.E).toBe(774);
    expect(result.events.some((event) => event.type === 'sensor')).toBe(false);
    expect(sim.readSensor('E')).toBe(result.end.sensors.E);
  });

  it('is deterministic across repeated runs', () => {
    const commands: SimCommand[] = [
      { type: 'move', distanceMm: 250, speedPercent: 55 },
      { type: 'turn', degrees: -35, speedPercent: 40 },
      { type: 'tank', leftPercent: 45, rightPercent: 60, durationMs: 700 },
    ];
    const first = JSON.stringify(simulator().run(commands));
    for (let index = 0; index < 100; index += 1) expect(JSON.stringify(simulator().run(commands))).toBe(first);
  });
});
