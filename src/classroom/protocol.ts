import { z } from 'zod';
import { visualProgramSchema } from '../editor/program';
import { sumoRulesSchema } from '../lan/rules';
import { attemptSchema, attemptResultSchema, challengeIdSchema, soloFrameSchema, soloStandingSchema } from './challenges';
import { arena3dSchema } from './arenas3d';

export const arenas = { compact: 80, standard: 100, wide: 120 } as const;
const id = z.string().uuid();
const name = z.string().trim().min(1).max(48);
export const codeSchema = z.string().regex(/^[A-HJ-NP-Z2-9]{6}$/);
export const settingsSchema = z.object({
  title: z.string().trim().min(1).max(80),
  kind: z.enum(['sumo','challenge']).default('sumo'),
  challenge: challengeIdSchema.default('basics-4'),
  engine: z.enum(['planar', 'gears']).default('planar'),
  scene: arena3dSchema.default(''),
  taskBrief: z.string().trim().max(600).default(''),
  mode: z.enum(['individual', 'team']),
  teamSize: z.number().int().min(2).max(6),
  arena: z.enum(['compact', 'standard', 'wide']),
  preparationMinutes: z.number().int().min(1).max(60),
  roundSeconds: z.number().int().min(10).max(600),
});
export type CompetitionSettings = z.infer<typeof settingsSchema>;
export const defaultSettings: CompetitionSettings = {
  title: '',
  kind: 'sumo',
  challenge: 'basics-4',
  engine: 'gears',
  scene: '',
  taskBrief: '',
  mode: 'individual',
  teamSize: 3,
  arena: 'standard',
  preparationMinutes: 10,
  roundSeconds: 60,
};
export const frameSchema = z.object({
  time: z.number().finite().min(0).max(121),
  robots: z
    .array(
      z.object({
        x: z.number().finite(),
        y: z.number().finite(),
        heading: z.number().finite(),
        activeId: z.string().optional(),
        error: z.string().optional(),
      }),
    )
    .length(2),
  winner: z.number().int().min(0).max(1).nullable(),
  reason: z.enum(['ring-out', 'time', 'program-error', 'disconnect', 'cancelled']).nullable(),
  finished: z.boolean(),
});
const versionSchema = z.object({
  revision: z.number().int().nonnegative(),
  authorId: z.string(),
  savedAt: z.number(),
  program: visualProgramSchema,
});
const memberSchema = z.object({
  id,
  name,
  pinHash: z.string().regex(/^[a-f0-9]{32}:[a-f0-9]{64}$/),
  approved: z.boolean(),
  entryId: id.nullable(),
});
const entrySchema = z.object({
  id,
  name,
  memberIds: z.array(id).max(6),
  revision: z.number().int().nonnegative(),
  program: visualProgramSchema,
  history: z.array(versionSchema).max(20),
  lock: z.object({ memberId: id, expiresAt: z.number() }).nullable(),
  submission: z
    .object({ round: z.number().int(), revision: z.number().int(), program: visualProgramSchema })
    .nullable(),
});
const matchSchema = z.object({
  id,
  round: z.number().int(),
  entryIds: z.tuple([id, id]),
  entryNames: z.tuple([name, name]),
  revisions: z.tuple([z.number().int(), z.number().int()]),
  programs: z.tuple([visualProgramSchema, visualProgramSchema]),
  rules: sumoRulesSchema,
  startedAt: z.number(),
});
const resultSchema = matchSchema.extend({
  finishedAt: z.number(),
  frame: frameSchema,
  void: z.boolean(),
});
export const sessionSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  code: codeSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
  creationId: id,
  teacherPinHash: z.string().regex(/^[a-f0-9]{32}:[a-f0-9]{64}$/),
  settings: settingsSchema,
  phase: z.enum(['lobby', 'preparing', 'locked', 'running', 'ended']),
  joiningOpen: z.boolean(),
  round: z.number().int().nonnegative(),
  deadline: z.number().nullable(),
  remainingMs: z.number().nonnegative().nullable(),
  members: z.array(memberSchema).max(32),
  entries: z.array(entrySchema).max(16),
  active: matchSchema.nullable(),
  results: z.array(resultSchema).max(200),
  activeAttempt: attemptSchema.nullable().default(null),
  attempts: z.array(attemptResultSchema).max(200).default([]),
  operations: z.array(z.object({ id, actor: z.string() })).max(500),
  audit: z.array(z.object({ at: z.number(), actor: z.string(), action: z.string() })).max(500),
});
export const storeSchema = z.object({
  schemaVersion: z.literal(1),
  sessions: z.array(sessionSchema).max(8),
});
export type CompetitionStore = z.infer<typeof storeSchema>;
export type CompetitionSession = z.infer<typeof sessionSchema>;
export type CompetitionEntry = CompetitionSession['entries'][number];

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('team'), name }),
  z.object({ type: z.literal('approve'), memberId: id, entryId: id.optional() }),
  z.object({ type: z.literal('remove'), memberId: id }),
  z.object({ type: z.literal('reset-pin'), memberId: id, pin: z.string().regex(/^\d{4}$/) }),
  z.object({ type: z.literal('joining'), open: z.boolean() }),
  z.object({
    type: z.enum(['prepare', 'pause', 'resume', 'lock', 'stop', 'end', 'delete', 'retry-save']),
  }),
  z.object({ type: z.literal('start'), entryIds: z.tuple([id, id]) }),
  z.object({ type: z.literal('start-attempt'), entryId: id }),
  z.object({ type: z.literal('judge-attempt'), completed: z.boolean() }),
  z.object({ type: z.enum(['take', 'release', 'withdraw', 'leave']) }),
  z.object({ type: z.literal('release-entry'), entryId: id }),
  z.object({
    type: z.literal('save'),
    baseRevision: z.number().int().nonnegative(),
    program: visualProgramSchema,
  }),
  z.object({
    type: z.literal('submit'),
    revision: z.number().int().nonnegative(),
    round: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('restore'),
    revision: z.number().int().nonnegative(),
    baseRevision: z.number().int().nonnegative(),
  }),
]);
export type CompetitionAction = z.infer<typeof actionSchema>;
export const operationSchema = z.object({ version: z.literal(1), opId: id, action: actionSchema });
export type CompetitionOperation = z.infer<typeof operationSchema>;
export const createSchema = z.object({
  version: z.literal(1),
  opId: id,
  settings: settingsSchema,
  pin: z.string().regex(/^\d{6}$/),
});
export const joinSchema = z.object({
  version: z.literal(1),
  name,
  pin: z.string().regex(/^\d{4}$/),
});
export const teacherLoginSchema = z.object({
  version: z.literal(1),
  pin: z.string().regex(/^\d{6}$/),
});

const publicMemberSchema = memberSchema.omit({ pinHash: true }).extend({ connected: z.boolean() });
const publicEntrySchema = entrySchema
  .pick({ id: true, name: true, memberIds: true, revision: true, lock: true })
  .extend({ submittedRevision: z.number().nullable() });
export const viewSchema = z.object({
  code: codeSchema,
  settings: settingsSchema,
  phase: sessionSchema.shape.phase,
  joiningOpen: z.boolean(),
  round: z.number(),
  serverTime: z.number(),
  deadline: z.number().nullable(),
  remainingMs: z.number().nullable(),
  role: z.enum(['teacher', 'student']),
  memberId: id.nullable(),
  storage: z.enum(['saved', 'error', 'memory']),
  links: z.array(z.string().url()),
  members: z.array(publicMemberSchema),
  entries: z.array(publicEntrySchema),
  ownEntry: publicEntrySchema
    .extend({
      program: visualProgramSchema,
      history: z.array(versionSchema.omit({ program: true })),
    })
    .nullable(),
  active: matchSchema.omit({ programs: true }).extend({ frame: frameSchema }).nullable(),
  results: z.array(resultSchema.omit({ programs: true })),
  activeAttempt: attemptSchema.omit({program:true}).extend({frame:soloFrameSchema}).nullable(),
  attempts: z.array(attemptResultSchema.omit({program:true})),
  soloStandings: z.array(soloStandingSchema),
  standings: z.array(
    z.object({
      entryId: id,
      name,
      played: z.number(),
      wins: z.number(),
      draws: z.number(),
      points: z.number(),
      rank: z.number(),
    }),
  ),
});
export type CompetitionView = z.infer<typeof viewSchema>;
export const authSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  view: viewSchema,
});
export type CompetitionAuth = z.infer<typeof authSchema>;
export const responseSchema = z.object({ view: viewSchema.nullable() });
export const infoSchema = z.object({
  available: z.literal(true),
  canHost: z.boolean(),
  sessions: z.array(
    z.object({ code: codeSchema, title: z.string(), phase: sessionSchema.shape.phase }),
  ),
  loadError: z.boolean(),
});
export type CompetitionInfo = z.infer<typeof infoSchema>;
export const programResponseSchema = z.object({
  program: visualProgramSchema,
  revision: z.number().int(),
});

/** The same session/submission contracts can be carried by another transport. */
export interface CompetitionTransport {
  info(): Promise<CompetitionInfo>;
  create(settings: CompetitionSettings, pin: string, opId: string): Promise<CompetitionAuth>;
  join(code: string, name: string, pin: string): Promise<CompetitionAuth>;
  teacher(code: string, pin: string): Promise<CompetitionAuth>;
  read(code: string, token: string): Promise<CompetitionView>;
  act(
    code: string,
    token: string,
    operation: CompetitionOperation,
  ): Promise<CompetitionView | null>;
}

export function standings(session: CompetitionSession) {
  const rows = session.entries
    .map((entry) => {
      let played = 0,
        wins = 0,
        draws = 0;
      for (const result of session.results) {
        const index = result.entryIds.indexOf(entry.id);
        if (index < 0 || result.void) continue;
        played++;
        if (result.frame.winner === null) draws++;
        else if (result.frame.winner === index) wins++;
      }
      return {
        entryId: entry.id,
        name: entry.name,
        played,
        wins,
        draws,
        points: wins * 3 + draws,
        rank: 0,
      };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  rows.forEach((row, index) => {
    row.rank =
      index > 0 && rows[index - 1].points === row.points ? rows[index - 1].rank : index + 1;
  });
  return rows;
}
