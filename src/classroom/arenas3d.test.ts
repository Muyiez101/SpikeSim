// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { arena3dCatalog, arena3dEquipment, arena3dSchema, arenaPoseSchema } from './arenas3d';
import { competitionFields } from '../sim/gears-catalog';
import { fieldGoalSchema } from '../challenges/schemas';
import { customWorldSchema } from '../sim/custom-design';
import { robotSchema } from '../sim/schemas';

describe('fixed 3D competition arenas', () => {
  it('resolves all bundled fields and never advertises official automatic scoring', async () => {
    expect(new Set(arena3dCatalog.map(a => a.id)).size).toBe(arena3dCatalog.length);
    for (const arena of arena3dCatalog) {
      expect(arena3dSchema.safeParse(arena.id).success).toBe(true);
      const equipment = arena3dEquipment(arena.id);
      expect(robotSchema.safeParse(equipment.robot).success, arena.title).toBe(true);
      if (arena.automatic) expect(fieldGoalSchema.safeParse(equipment.fieldGoal).success, arena.title).toBe(true);
      if (equipment.customWorld) expect(customWorldSchema.safeParse(equipment.customWorld).success).toBe(true);
    }
    for (const field of competitionFields) {
      expect(arena3dCatalog.find(a => a.id === field.file)?.automatic).toBe(false);
      const data = JSON.parse(await readFile(`public/gears/${field.file.split('?')[0]}`, 'utf8'));
      expect(data.worldName).toBeTruthy();
      expect(data.options).toBeTruthy();
    }
    expect(arena3dSchema.safeParse('https://external.invalid/arena').success).toBe(false);
  });
  it('fixes maze layouts and gives them the same reachable finish rule', () => {
    for (const id of ['world:maze:perfect', 'world:maze:imperfect']) {
      expect(arena3dEquipment(id).worldOptions).toMatchObject({ seed: 42, rows: 5, columns: 5, size: 40 });
      expect(arena3dEquipment(id).fieldGoal).toMatchObject({ action: 'reach', destination: { x: 80, y: 80 } });
    }
  });
  it('rejects unbounded and nonfinite spectator poses', () => {
    const mesh = { i: 0, p: [1, 2, 3], r: [0, 0, 0, 1], enabled: true };
    expect(arenaPoseSchema.safeParse({ meshes: [mesh] }).success).toBe(true);
    expect(arenaPoseSchema.safeParse({ meshes: [{ ...mesh, p: [NaN, 0, 0] }] }).success).toBe(false);
    expect(arenaPoseSchema.safeParse({ meshes: Array(601).fill(mesh) }).success).toBe(false);
  });
});
