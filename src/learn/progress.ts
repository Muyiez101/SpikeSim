import { z } from 'zod';
import { lessonIdSchema, lessonIds, type LessonId } from './catalog';
import { visualProgramSchema, type VisualProgram } from '../editor/program';
export const learningKey = 'spikesim.learning.v1';
export const learningProgressSchema = z
  .object({
    schemaVersion: z.literal(1),
    completed: z.array(lessonIdSchema).max(lessonIds.length),
    runs: z.array(lessonIdSchema).max(lessonIds.length),
    drafts: z
      .array(z.object({ id: lessonIdSchema, program: visualProgramSchema }))
      .max(lessonIds.length),
    last: lessonIdSchema.optional(),
  })
  .refine(
    (value) =>
      new Set(value.completed).size === value.completed.length &&
      new Set(value.runs).size === value.runs.length &&
      new Set(value.drafts.map((d) => d.id)).size === value.drafts.length &&
      value.completed.every((id) => value.runs.includes(id)),
  );
export type LearningProgress = z.infer<typeof learningProgressSchema>;
export const emptyLearning = (): LearningProgress => ({
  schemaVersion: 1,
  completed: [],
  runs: [],
  drafts: [],
});
export function readLearning(raw: string | null): { value: LearningProgress; invalid: boolean } {
  if (!raw) return { value: emptyLearning(), invalid: false };
  if (raw.length > 2_000_000) return { value: emptyLearning(), invalid: true };
  try {
    return { value: learningProgressSchema.parse(JSON.parse(raw)), invalid: false };
  } catch {
    return { value: emptyLearning(), invalid: true };
  }
}
export function saveLessonDraft(
  state: LearningProgress,
  id: LessonId,
  program: VisualProgram,
): LearningProgress {
  return {
    ...state,
    last: id,
    drafts: [
      ...state.drafts.filter((d) => d.id !== id),
      { id, program: visualProgramSchema.parse(program) },
    ],
  };
}
export function recordLessonRun(state: LearningProgress, id: LessonId): LearningProgress {
  return { ...state, runs: [...new Set([...state.runs, id])] };
}
export function completeLesson(
  state: LearningProgress,
  id: LessonId,
  correct: boolean,
): LearningProgress {
  return correct && state.runs.includes(id)
    ? { ...state, completed: [...new Set([...state.completed, id])] }
    : state;
}
