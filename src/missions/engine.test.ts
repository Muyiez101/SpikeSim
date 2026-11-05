import { describe, expect, it } from 'vitest';
import { DeterministicSimulator } from '../sim/engine';
import { robotPresets } from '../sim/presets';
import { missions, missionsById, missionWorldMap, worlds } from './content';
import { checkMission } from './engine';
import { mapFiles } from '../sim/maps';
import type { MissionFile } from './schemas';
import { executeVisualProgram } from '../runtime/visual-runtime';

describe('mission content', () => {
  it('has all 41 challenges across eight worlds', () => {
    expect(missions).toHaveLength(41); expect(worlds).toHaveLength(8);
  });
  it('has unique mission ids', () => {
    const ids = missions.map((mission) => mission.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists every mission exactly once in its own world', () => {
    const worldIds = worlds.map((world) => world.id);
    expect(new Set(worldIds).size).toBe(worldIds.length);
    const listedIds = worlds.flatMap((world) => world.missionIds);
    expect([...listedIds].sort()).toEqual(missions.map((mission) => mission.id).sort());
    for (const world of worlds) {
      for (const id of world.missionIds) {
        expect(missionsById[id]?.worldId, `${world.id}: ${id}`).toBe(world.id);
      }
    }
  });

  it('every mission references a robot preset and map that exist', () => {
    for (const mission of missions) {
      expect(robotPresets[mission.robotPreset], mission.id).toBeDefined();
      expect(missionWorldMap(mission).id).toBeTruthy();
    }
  });
});

describe('mission reference solutions', () => {
  for (const mission of missions) {
    it(`${mission.id} reaches all goals`, () => {
      const map = missionWorldMap(mission);
      const robot = robotPresets[mission.robotPreset];
      const simulator = new DeterministicSimulator({ map, robot, seed: 1 });
      const execution = mission.visualReference ? executeVisualProgram(mission.visualReference, map, robot) : undefined;
      expect(execution?.error, mission.id).toBeUndefined();
      const result = execution?.result ?? simulator.run(mission.reference);
      const verdict = checkMission(mission, result, map, execution);
      const failed = verdict.goals.filter((goal) => !goal.passed).map((goal) => goal.label);
      expect(failed, `${mission.id} failed: ${failed.join('; ')}`).toEqual([]);
      expect(verdict.passed).toBe(true);
      expect(verdict.stars).toBe(3);
    });
  }
});

describe('stayInZone scoring', () => {
  const stayMission = (durationMs: number): MissionFile => ({
    schemaVersion: 1,
    id: 'stay-test',
    worldId: 'basics',
    title: 'Stay test',
    brief: 'Stay in the pad.',
    robotPreset: 'driving-base',
    goals: [{ type: 'stayInZone', zone: 'landing-pad', durationMs }],
    timeLimits: { twoStars: 60, threeStars: 60 },
    hints: [{ level: 1, text: 'Stay on the pad.' }],
    reference: [],
  });

  it('rewards continuous dwell inside the zone', () => {
    const map = missionWorldMap(missions[0]);
    const result = new DeterministicSimulator({ map, robot: robotPresets['driving-base'], seed: 1 })
      .run([
        { type: 'move', distanceMm: 580, speedPercent: 70 },
        { type: 'wait', durationMs: 2200 },
      ]);
    const verdict = checkMission(stayMission(2000), result, map);
    expect(verdict.goals[0].passed).toBe(true);
  });

  it('does not credit time spent outside the zone between visits', () => {
    const map = missionWorldMap(missions[0]);
    const result = new DeterministicSimulator({ map, robot: robotPresets['driving-base'], seed: 1 })
      .run([
        { type: 'move', distanceMm: 580, speedPercent: 70 },
        { type: 'wait', durationMs: 900 },
        { type: 'move', distanceMm: -580, speedPercent: 70 },
        { type: 'wait', durationMs: 900 },
        { type: 'move', distanceMm: 580, speedPercent: 70 },
        { type: 'wait', durationMs: 900 },
      ]);
    const verdict = checkMission(stayMission(2000), result, map);
    expect(verdict.goals[0].passed).toBe(false);
    expect(result.end.t).toBeGreaterThan(4);
  });

  it('fails when the zone does not exist on the map', () => {
    const map = missionWorldMap(missions[0]);
    const result = new DeterministicSimulator({ map, robot: robotPresets['driving-base'], seed: 1 }).run([]);
    const verdict = checkMission(
      { ...stayMission(0), goals: [{ type: 'stayInZone', zone: 'missing-zone', durationMs: 0 }] },
      result,
      map,
    );
    expect(verdict.goals[0].passed).toBe(false);
  });

  it('stays compatible with the open-floor map', () => {
    expect(mapFiles['open-floor'].zones.some((zone) => zone.id === 'finish')).toBe(true);
  });
});
