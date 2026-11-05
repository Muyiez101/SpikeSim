import { z } from 'zod';
import { programNameSchema, programStepsSchema, type PlaygroundDraft } from './playground';
import { visualProgramSchema } from '../editor/program';
import { robotSchema } from '../sim/schemas';
import { sceneSchema, robotTemplateSchema } from '../sim/gears-catalog';
import {customRobotSchema,customWorldSchema} from '../sim/custom-design';
import {fieldGoalSchema} from '../challenges/schemas';
import {kitSchema} from '../challenges/catalog';

export const maxProgramFileBytes = 256_000;
export const programFileSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal('spikesim-program'),
  name: programNameSchema,
  missionId: z.string().min(1).max(80).nullable(),
  steps: programStepsSchema,
  visualProgram: visualProgramSchema.optional(),
  robot: robotSchema.optional(),
  scene: sceneSchema.optional(),
  robotTemplate: robotTemplateSchema.optional(),
  customRobot: customRobotSchema.optional(),
  customWorld: customWorldSchema.optional(),
  fieldGoal:fieldGoalSchema.optional(),
  robotKit:kitSchema.optional(),
});
export type ProgramFile = z.infer<typeof programFileSchema>;
export type ProgramFileError = 'tooLarge' | 'invalid' | 'unknownMission';
export type ProgramFileResult = { ok: true; program: ProgramFile } | { ok: false; error: ProgramFileError };

export function parseProgramFile(content: string, missionIds: readonly string[]): ProgramFileResult {
  if (content.length > maxProgramFileBytes || new TextEncoder().encode(content).length > maxProgramFileBytes) {
    return { ok: false, error: 'tooLarge' };
  }
  try {
    const parsed = programFileSchema.safeParse(JSON.parse(content));
    if (!parsed.success) return { ok: false, error: 'invalid' };
    if (parsed.data.missionId !== null && !missionIds.includes(parsed.data.missionId)) {
      return { ok: false, error: 'unknownMission' };
    }
    return { ok: true, program: parsed.data };
  } catch {
    return { ok: false, error: 'invalid' };
  }
}

export function exportProgramFile(name: string, draft: PlaygroundDraft) {
  const program = programFileSchema.parse({ schemaVersion: 1, kind: 'spikesim-program', name, missionId: draft.missionId, steps: draft.steps, visualProgram: draft.visualProgram, robot: draft.robot, scene: draft.scene, robotTemplate: draft.robotTemplate, customRobot:draft.customRobot,customWorld:draft.customWorld,fieldGoal:draft.fieldGoal,robotKit:draft.robotKit });
  const slug = program.name.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'untitled';
  // Compact JSON keeps deep Blockly stacks within the same import-size limit.
  const content = JSON.stringify(program);
  if (new TextEncoder().encode(content).length > maxProgramFileBytes) throw new RangeError('Program file exceeds the supported size');
  return { name: `spikesim-${slug}.rlproj`, content };
}
