// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { lessons, lessonExperiment, lessonMedia } from './catalog';
import media from './media.json';
import { generateGearsPython } from '../editor/gears-python';
import { programFileSchema } from '../progress/program-file';
import { mapSchema, robotSchema } from '../sim/schemas';
import { fromCommands, visualProgramSchema, type BlockState } from '../editor/program';
import { generatePython } from '../editor/python';
import {
  completeLesson,
  emptyLearning,
  learningProgressSchema,
  readLearning,
  recordLessonRun,
  saveLessonDraft,
} from './progress';
import { en } from '../shared/strings/en';

describe('lesson examples and evidence', () => {
  it.each(lessons)(
    '$id keeps its taught logic and hardware aligned with the recorded reference',
    (lesson) => {
      const setup = lessonExperiment(lesson.id),
        file = programFileSchema.parse(
          JSON.parse(readFileSync(`recordings/projects/${lesson.recording}.rlproj`, 'utf8')),
        );
      const logic = (program: typeof setup.program) =>
        generateGearsPython(program)
          .split('\n')
          .filter((line) => !line.includes('runloop.mark('))
          .join('\n');
      let compared = setup.program;
      if (lesson.id === 'gyroturn') {
        const body = structuredClone(setup.program.blocks.blocks[1].inputs!.STACK.block!);
        const substitute = (b: BlockState) => {
          if (b.type === 'variables_get') {
            b.type = 'math_number';
            b.fields = { NUM: 90 };
          } else if (b.type === 'math_number' && Number(b.fields?.NUM) === 1)
            b.fields = { NUM: 0.5 };
          for (const c of Object.values(b.inputs ?? {})) {
            if (c.block) substitute(c.block);
            if (c.shadow) substitute(c.shadow);
          }
          if (b.next?.block) substitute(b.next.block);
        };
        substitute(body);
        compared = {
          blocks: { languageVersion: 0, blocks: [{ type: 'spike_start', next: { block: body } }] },
        };
      }
      expect(logic(compared)).toBe(
        logic(file.visualProgram ?? fromCommands(file.steps.map((step) => step.command))),
      );
      lesson.codeSteps?.forEach((step) =>
        expect(generatePython(setup.program).some((line) => line.text === step.code)).toBe(true),
      );
      expect(robotSchema.safeParse(setup.robot).success).toBe(true);
      expect(mapSchema.safeParse(setup.map).success).toBe(true);
      if (file.robot) expect(setup.robot).toEqual(file.robot);
      expect(setup.customRobot).toEqual(file.customRobot);
      expect(setup.customWorld).toEqual(file.customWorld);
      expect(setup.fieldGoal).toEqual(file.fieldGoal);
      const evidence = JSON.parse(
        readFileSync(`recordings/results/${lesson.recording}.json`, 'utf8'),
      );
      expect(evidence.verdict?.passed ?? evidence.goal?.passed).toBe(true);
      const assets = lessonMedia(lesson.id),
        entry = media.find((item) => item.id === lesson.id)!;
      expect(
        createHash('sha256')
          .update(readFileSync(`public/${assets.video}`))
          .digest('hex'),
      ).toBe(entry.sha256);
      for (const still of assets.stills) expect(existsSync(`public/${still}`)).toBe(true);
      const captions = readFileSync(`public/${assets.captions}`, 'utf8');
      expect(captions.startsWith('WEBVTT')).toBe(true);
      en.learning.mediaNotes[lesson.id].forEach((step) => expect(captions).toContain(step));
      expect(
        entry.times.every(
          (time, index) =>
            time >= 0 && time < entry.duration && (index === 0 || time > entry.times[index - 1]),
        ),
      ).toBe(true);
    },
  );
  it('requires a completed experiment and a correct answer, with isolated validated drafts', () => {
    const original = emptyLearning(),
      program = lessonExperiment('move').program;
    expect(completeLesson(original, 'move', true).completed).toEqual([]);
    const draft = saveLessonDraft(original, 'move', program),
      run = recordLessonRun(draft, 'move');
    expect(completeLesson(run, 'move', false).completed).toEqual([]);
    const finished = completeLesson(run, 'move', true);
    expect(finished.completed).toEqual(['move']);
    expect(completeLesson(finished, 'move', true).completed).toEqual(['move']);
    expect(original.drafts).toEqual([]);
    expect(
      visualProgramSchema.parse(readLearning(JSON.stringify(finished)).value.drafts[0].program),
    ).toEqual(program);
    expect(learningProgressSchema.safeParse({ ...finished, runs: [] }).success).toBe(false);
    expect(
      learningProgressSchema.safeParse({
        ...finished,
        drafts: [...finished.drafts, ...finished.drafts],
      }).success,
    ).toBe(false);
    expect(readLearning('{bad').invalid).toBe(true);
    expect(readLearning(null).invalid).toBe(false);
  });
});
