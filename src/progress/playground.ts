import { z } from 'zod';
import { simCommandSchema, robotSchema } from '../sim/schemas';
import { visualProgramSchema, countProgramBlocks } from '../editor/program';
import { sceneSchema, robotTemplateSchema } from '../sim/gears-catalog';
import {customRobotSchema,customWorldSchema} from '../sim/custom-design';
import {fieldGoalSchema} from '../challenges/schemas';
import {kitSchema} from '../challenges/catalog';

export const playgroundKey = 'spikesim.playground.v1';
export const maxProgramSteps = 60;
const maxSavedCharacters = 1_000_000;
const missionIdSchema = z.string().min(1).max(80).nullable();
export const programNameSchema = z.string().trim().min(1).max(80);

/** Bound saved commands to the same limits offered by the playground editor. */
export const playgroundCommandSchema = simCommandSchema.refine((command) => {
  switch (command.type) {
    case 'move':
      return Math.abs(command.distanceMm) <= 3000 && command.speedPercent >= 1;
    case 'turn':
      return Math.abs(command.degrees) <= 360 && command.speedPercent >= 1;
    case 'wait':
    case 'tank':
      return command.durationMs <= 60_000;
    case 'stop':
      return true;
    default:
      return true;
  }
}, { message: 'Command exceeds playground limits' });

export const programStepsSchema = z.array(z.object({
  id: z.string().min(1).max(80),
  command: playgroundCommandSchema,
})).max(maxProgramSteps).refine(
  (steps) => new Set(steps.map((step) => step.id)).size === steps.length,
  { message: 'Step IDs must be unique' },
);

export const missionOutcomeSchema = z.object({
  stars: z.number().int().min(0).max(3),
  goals: z.array(z.object({ label: z.string().min(1).max(500), passed: z.boolean() })).max(10),
});

export const playgroundDraftSchema = z.object({
  missionId: missionIdSchema,
  name: programNameSchema.optional(),
  visualProgram: visualProgramSchema.optional(),
  robot: robotSchema.optional(),
  scene: sceneSchema.optional(),
  robotTemplate: robotTemplateSchema.optional(),
  customRobot: customRobotSchema.optional(),
  customWorld: customWorldSchema.optional(),
  fieldGoal:fieldGoalSchema.optional(),
  robotKit:kitSchema.optional(),
  steps: programStepsSchema,
  outcome: missionOutcomeSchema.nullable(),
});

export const playgroundStateSchema = z.object({
  schemaVersion: z.literal(1),
  selected: z.object({ home: missionIdSchema, play: missionIdSchema }),
  drafts: z.array(playgroundDraftSchema).max(100),
}).refine(
  (state) => new Set(state.drafts.map((draft) => draft.missionId)).size === state.drafts.length,
  { message: 'Each mission has one draft' },
);

export type WorkspaceId = 'home' | 'play';
export type ProgramStep = z.infer<typeof programStepsSchema>[number];
export type MissionOutcome = z.infer<typeof missionOutcomeSchema>;
export type PlaygroundDraft = z.infer<typeof playgroundDraftSchema>;
export type PlaygroundState = z.infer<typeof playgroundStateSchema>;
export type SaveStatus = 'ready' | 'saved' | 'error' | 'recovered' | 'conflict';
export type PlaygroundLoad = { state: PlaygroundState; saveStatus: SaveStatus };
export const draftSize = (draft: Pick<PlaygroundDraft, 'visualProgram' | 'steps'>) => draft.visualProgram ? countProgramBlocks(draft.visualProgram) : draft.steps.length;

export function emptyPlayground(missionIds: readonly string[]): PlaygroundState {
  return {
    schemaVersion: 1,
    selected: { home: missionIds.includes('basics-1') ? 'basics-1' : missionIds[0] ?? null, play: null },
    drafts: [],
  };
}

/** Reading never overwrites a malformed save; recovery only writes on a later edit. */
export function readPlayground(
  storage: Pick<Storage, 'getItem'> | null,
  missionIds: readonly string[],
): PlaygroundLoad {
  const fallback = emptyPlayground(missionIds);
  if (!storage) return { state: fallback, saveStatus: 'error' };
  let raw: string | null;
  try { raw = storage.getItem(playgroundKey); }
  catch { return { state: fallback, saveStatus: 'error' }; }
  if (raw === null) return { state: fallback, saveStatus: 'ready' };
  if (raw.length > maxSavedCharacters) return { state: fallback, saveStatus: 'recovered' };

  try {
    const parsed = playgroundStateSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return { state: fallback, saveStatus: 'recovered' };
    const validMission = (id: string | null) => id === null || missionIds.includes(id);
    const selected = {
      home: validMission(parsed.data.selected.home) ? parsed.data.selected.home : fallback.selected.home,
      play: validMission(parsed.data.selected.play) ? parsed.data.selected.play : null,
    };
    const drafts = parsed.data.drafts.filter((draft) => validMission(draft.missionId));
    const recovered = selected.home !== parsed.data.selected.home || selected.play !== parsed.data.selected.play
      || drafts.length !== parsed.data.drafts.length;
    return { state: { ...parsed.data, selected, drafts }, saveStatus: recovered ? 'recovered' : 'saved' };
  } catch { return { state: fallback, saveStatus: 'recovered' }; }
}

export function writePlayground(storage: Pick<Storage, 'setItem'> | null, state: PlaygroundState): boolean {
  if (!storage) return false;
  try {
    const content = JSON.stringify(playgroundStateSchema.parse(state));
    if (content.length > maxSavedCharacters) return false;
    storage.setItem(playgroundKey, content);
    return true;
  } catch { return false; }
}

export function getPlaygroundDraft(state: PlaygroundState, missionId: string | null): PlaygroundDraft {
  return state.drafts.find((draft) => draft.missionId === missionId) ?? { missionId, steps: [], outcome: null };
}

export function replacePlaygroundDraft(state: PlaygroundState, draft: PlaygroundDraft): PlaygroundState {
  return { ...state, drafts: [...state.drafts.filter((item) => item.missionId !== draft.missionId), draft] };
}
