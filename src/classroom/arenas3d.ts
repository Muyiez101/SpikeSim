import { z } from 'zod';
import { competitionFields, practiceWorlds, templateRobot } from '../sim/gears-catalog';
import { customKit, challengeGuide } from '../challenges/catalog';
import { practiceIds, practiceTasks, practiceWorld } from '../challenges/practice';
import { designRobot } from '../sim/custom-design';
import { en } from '../shared/strings/en';

const c = en.classroom;
export const arena3dCatalog = [
  ...practiceIds.map(id => ({ id: `task:${id}`, title: c.fllTask(en.field.tasks[id].title), group: c.arenaGroups.tasks, automatic: true })),
  ...practiceWorlds.map(world => ({ id: world.id, title: world.name, group: world.worldName === 'maze' ? c.arenaGroups.maze : world.worldName === 'fireRescue' ? c.arenaGroups.rescue : c.arenaGroups.practice, automatic: world.worldName === 'maze' || world.worldName === 'fireRescue' })),
  ...competitionFields.map(field => ({ id: field.file, title: field.name + (field.content === 'mat-only' ? en.unified.matOnlySuffix : ''), group: field.file.includes('/FLL/') ? c.arenaGroups.fll : c.arenaGroups.wro, automatic: false })),
];
export const arena3dSchema = z.string().refine(id => id === '' || arena3dCatalog.some(a => a.id === id));
export function arena3dEquipment(id: string) {
  const taskId = practiceIds.find(task => id === `task:${task}`);
  const preset = practiceWorlds.find(world => world.id === id);
  const field = competitionFields.find(world => world.file === id);
  const kit = taskId ? practiceTasks[taskId].kit : challengeGuide(id).kit;
  const customRobot = customKit(kit);
  const robot = customRobot ? designRobot(customRobot) : templateRobot(kit);
  const fieldGoal = taskId ? practiceTasks[taskId].goal
    : preset?.worldName === 'maze' ? { scene: id, target: 'robot', action: 'reach' as const, amount: 12, destination: { x: 80, y: 80 } }
      : preset?.worldName === 'fireRescue' ? { scene: id, target: 'robot', action: 'score' as const, amount: 5 } : undefined;
  return {
    robot, template: kit, customRobot, fieldGoal,
    customWorld: taskId ? practiceWorld(taskId, 'worlds/missions/FLL/FLL2021.json') : undefined,
    worldFile: taskId ? null : id,
    // Everyone receives the same layout, including worlds with random defaults.
    worldOptions: preset ? { ...preset.options, seed: 42, random: 'fixed', ...(preset.worldName === 'maze' ? { columns: 5, rows: 5, size: 40 } : {}) } : undefined,
    title: arena3dCatalog.find(a => a.id === id)?.title ?? '',
    brief: taskId ? en.field.tasks[taskId].brief : preset?.worldName === 'maze' ? c.mazeGoal : preset?.worldName === 'fireRescue' ? c.rescueGoal : field?.content === 'mat-only' ? `${en.unified.matOnlyBrief} ${c.refereeHelp}` : c.refereeHelp,
    goalLabel: taskId ? en.field.tasks[taskId].brief : preset?.worldName === 'maze' ? c.mazeGoal : c.rescueGoal,
  };
}

// Local mesh transforms keep viewers in the same 3D scene without sharing code.
const vector = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
export const arenaPoseSchema = z.object({
  meshes: z.array(z.object({ i: z.number().int().min(0).max(10000), p: vector, r: z.tuple([z.number().finite(), z.number().finite(), z.number().finite(), z.number().finite()]), enabled: z.boolean() })).max(600),
});
export type ArenaPose = z.infer<typeof arenaPoseSchema>;
