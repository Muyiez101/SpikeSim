import { z } from 'zod';
import { fromCommands, visualProgramSchema, type VisualProgram } from '../editor/program';
import { en } from '../shared/strings/en';
import { validateMatchProgram } from '../lan/program';
import { operationSchema, type CompetitionView } from './protocol';
import { challengeEquipment, validateSoloProgram } from './challenges';
import { programFileSchema } from '../progress/program-file';
import { arena3dCatalog } from './arenas3d';

export const draftSchema = z.object({
  version: z.literal(1),
  program: visualProgramSchema,
  baseRevision: z.number().int().nonnegative(),
  dirty: z.boolean(),
  pending: z
    .array(operationSchema)
    .max(2)
    .refine((ops) => ops.every((op) => ['save', 'submit'].includes(op.action.type))),
});
export type LocalDraft = z.infer<typeof draftSchema>;
const fileSchema = z.object({
  kind: z.literal('spikesim-competition'),
  version: z.literal(1),
  program: visualProgramSchema,
});
export function download(content: string, filename: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadProgram(program: VisualProgram, filename = 'competition.rlproj') {
  download(
    JSON.stringify({ kind: 'spikesim-competition', version: 1, program }, null, 2),
    filename,
  );
}
export async function importProgram(file: File, kind: 'sumo' | 'challenge' = 'sumo') {
  if (!file.name.toLowerCase().endsWith('.rlproj') || file.size > 150_000)
    throw Error(en.classroom.errors.invalid);
  const content: unknown = JSON.parse(await file.text());
  const parsed = fileSchema.safeParse(content);
  const regular = parsed.success ? null : programFileSchema.safeParse(content);
  const program = parsed.success ? parsed.data.program : regular?.success
    ? regular.data.visualProgram ?? fromCommands(regular.data.steps.map(step => step.command)) : null;
  if (!program) throw Error(en.classroom.errors.invalid);
  return kind === 'challenge' ? validateSoloProgram(program) : validateMatchProgram(program);
}
// Prevent names beginning with spreadsheet formulas from executing on CSV import.
export function csvCell(value: string | number) {
  const text = String(value);
  return `"${(/^[\s]*[=+@-]/.test(text) ? "'" : '') + text.replace(/"/g, '""')}"`;
}
export function scoreboardCsv(view: CompetitionView) {
  const c = en.classroom;
  const rows: (string | number)[][] = view.settings.kind === 'challenge' ? [
    [view.settings.title, view.code],
    [view.settings.scene ? arena3dCatalog.find(a => a.id === view.settings.scene)?.title ?? view.settings.scene : challengeEquipment(view.settings.challenge).mission.title, c.seconds(view.settings.roundSeconds)],
    ...(view.settings.taskBrief ? [[c.taskBrief, view.settings.taskBrief]] : []),
    [c.rank, c.entry, c.attempts, c.result, c.goals, c.bestTime],
    ...view.soloStandings.map(r => [r.rank, r.name, r.attempts, r.completed ? c.completed : r.attempts ? c.incomplete : c.notRun, `${r.goals}/${r.total}`, r.seconds ?? '']),
    [], [c.soloResults],
    [c.roundLabel, c.entry, c.result, c.goals, c.durationLabel, c.revisionLabel],
    ...view.attempts.map(r => [r.round, r.entryName, r.void ? c.void : r.verdict.completed ? c.completed : c.incomplete, `${r.verdict.goals.filter(g => g.passed).length}/${r.verdict.goals.length}`, r.verdict.seconds, r.revision]),
  ] : [
    [view.settings.title, view.code],
    [c.arenaNames[view.settings.arena], c.seconds(view.settings.roundSeconds)],
    [c.rank, c.entry, c.played, c.wins, c.draws, c.points],
    ...view.standings.map((r) => [r.rank, r.name, r.played, r.wins, r.draws, r.points]),
    [],
    [c.results],
    [c.roundLabel, c.firstEntry, c.secondEntry, c.result, c.durationLabel, c.revisionLabel],
    ...view.results.map((r) => [
      r.round,
      ...r.entryNames,
      r.void ? c.void : r.frame.winner === null ? c.draw : c.winner(r.entryNames[r.frame.winner]),
      r.frame.time,
      r.revisions.join(' / '),
    ]),
  ];
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
export function exportScoreboard(view: CompetitionView) {
  download(
    scoreboardCsv(view),
    `competition-${view.code}.csv`,
    'text/csv;charset=utf-8',
  );
}
