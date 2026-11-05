import { z } from 'zod';
import { en } from '../shared/strings/en';
import { missionsById, missionWorldMap } from '../missions/content';
import { fromCommands, visualProgramSchema } from '../editor/program';
import { robotPresets } from '../sim/presets';
import { defaultMap } from '../sim/maps';
import { customKit } from '../challenges/catalog';
import { practiceWorld, practiceTasks } from '../challenges/practice';
import { designRobot } from '../sim/custom-design';
import {
  lineCourseReferences,
  lineCourseRobot,
  lineCourseDesign,
  lineCourseProgram,
} from '../challenges/line-courses';
import type { CustomRobot, CustomWorld } from '../sim/custom-design';
import type { FieldGoal } from '../challenges/schemas';
import type { MapFile, RobotDesign } from '../sim/schemas';
import type { VisualProgram } from '../editor/program';
import type { MissionFile } from '../missions/schemas';
import { gyroTurnProgram } from './gyro-turn';

export type LessonId = keyof typeof en.learning.content;
export const lessonIds: LessonId[] = [
  'move',
  'turn',
  'events',
  'loops',
  'distance',
  'colour',
  'decisions',
  'variables',
  'functions',
  'parameters',
  'yaw',
  'gyroturn',
  'conversions',
  'attachments',
  'debugging',
  'line',
  'python',
];
export const lessonIdSchema = z.enum(lessonIds as [LessonId, ...LessonId[]]);
const questionSchema = z.object({
  prompt: z.string().min(10),
  options: z.array(z.string().min(1)).length(3),
  correct: z.number().int().min(0).max(2),
  feedback: z.array(z.string().min(10)).length(3),
});
export const lessonTextSchema = z.object({
  title: z.string(),
  tag: z.string(),
  summary: z.string(),
  objective: z.string(),
  story: z.string(),
  explanation: z.array(z.string()).min(3),
  steps: z.array(z.string()).length(3),
  prediction: questionSchema,
  experiment: z.string(),
  compare: z.string(),
  mistakes: z.array(z.tuple([z.string(), z.string()])),
  quiz: questionSchema,
  physical: z.string(),
  terms: z.array(z.string().refine((term) => term in en.learning.glossaryEntries)),
  codeSteps: z.array(z.object({ code: z.string(), meaning: z.string() })).optional(),
});
const bindings = {
  python: { recording: 'basics-1', minutes: 8 },
  yaw: { recording: 'sensors-4', minutes: 8 },
  parameters: { recording: 'functions-3', minutes: 8 },
  gyroturn: { recording: 'sensors-4', minutes: 10 },
  conversions: { recording: 'basics-1', minutes: 8 },
  move: { recording: 'basics-1', minutes: 5 },
  turn: { recording: 'basics-2', minutes: 6 },
  events: { recording: 'basics-5', minutes: 5 },
  loops: { recording: 'patterns-1', minutes: 7 },
  distance: { recording: 'sensors-1', minutes: 8 },
  colour: { recording: 'sensors-2', minutes: 7 },
  decisions: { recording: 'conditions-5', minutes: 8 },
  variables: { recording: 'functions-4', minutes: 8 },
  functions: { recording: 'functions-1', minutes: 8 },
  attachments: { recording: 'practice-lift', minutes: 8 },
  debugging: { recording: 'champions-3', minutes: 7 },
  line: { recording: 'line-simple', minutes: 10 },
} satisfies Record<LessonId, { recording: string; minutes: number }>;
export const lessons = lessonIds.map((id, index) => ({
  id,
  number: index + 1,
  ...bindings[id],
  ...lessonTextSchema.parse(en.learning.content[id]),
}));
export type Lesson = (typeof lessons)[number];
export type LessonQuestion = Lesson['quiz'];
export type LessonExperiment = {
  map: MapFile;
  robot: RobotDesign;
  program: VisualProgram;
  template: string;
  scene: string | null;
  customRobot?: CustomRobot;
  customWorld?: CustomWorld;
  fieldGoal?: FieldGoal;
  mission?: MissionFile;
};
export function lessonExperiment(id: LessonId): LessonExperiment {
  if (id === 'attachments') {
    const task = practiceTasks.lift,
      customRobot = customKit('forklift')!;
    return {
      map: defaultMap,
      robot: designRobot(customRobot),
      customRobot,
      customWorld: practiceWorld('lift'),
      fieldGoal: task.goal,
      program: fromCommands(task.reference),
      template: 'custom',
      scene: 'custom',
    };
  }
  if (id === 'line') {
    const course = lineCourseReferences[0];
    return {
      map: defaultMap,
      robot: lineCourseDesign,
      customRobot: lineCourseRobot,
      fieldGoal: course.goal,
      program: lineCourseProgram(course.distanceCm),
      template: 'custom',
      scene: course.scene,
    };
  }
  const mission = missionsById[bindings[id].recording];
  if (!mission) throw Error(en.learning.loadError);
  return {
    map: missionWorldMap(mission),
    robot: robotPresets[mission.robotPreset],
    mission,
    program:
      id === 'gyroturn'
        ? gyroTurnProgram(mission.visualReference!)
        : visualProgramSchema.parse(
            structuredClone(mission.visualReference ?? fromCommands(mission.reference)),
          ),
    template: 'singleFollower',
    scene: null,
  };
}
export const lessonMedia = (id: LessonId) => ({
  video: `learn/${id}/example.mp4`,
  captions: `learn/${id}/captions.vtt`,
  stills: [0, 1, 2].map((index) => `learn/${id}/step-${index + 1}.png`),
});
