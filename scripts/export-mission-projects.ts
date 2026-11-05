import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { missions } from '../src/missions/content';
import { fromCommands } from '../src/editor/program';
import { robotPresets } from '../src/sim/presets';
import { exportProgramFile, parseProgramFile } from '../src/progress/program-file';
import { competitionFields, practiceWorlds, templateRobot } from '../src/sim/gears-catalog';
import { customKit } from '../src/challenges/catalog';
import { practiceIds, practiceTasks, practiceWorld } from '../src/challenges/practice';
import { designRobot } from '../src/sim/custom-design';
import { en } from '../src/shared/strings/en';
import type { PlaygroundDraft } from '../src/progress/playground';
import { lineCourseReferences, lineCourseRobot, lineCourseDesign, lineCourseProgram } from '../src/challenges/line-courses';

const root = resolve('recordings');
await mkdir(resolve(root, 'projects'), { recursive: true });
const ids = missions.map(mission => mission.id);
async function save(id: string, name: string, draft: PlaygroundDraft) {
  const { content } = exportProgramFile(name, draft);
  const parsed = parseProgramFile(content, ids);
  if (!parsed.ok) throw Error(`${id}: ${parsed.error}`);
  const file = `projects/${id}.rlproj`;
  await writeFile(resolve(root, file), content);
  return file;
}
const classroom = [];
for (const mission of missions) {
  const project = await save(mission.id, mission.title, {
    missionId: mission.id, steps: [], outcome: null,
    visualProgram: mission.visualReference ?? fromCommands(mission.reference),
    robot: robotPresets[mission.robotPreset], robotTemplate: 'singleFollower',
  });
  classroom.push({ id: mission.id, name: mission.title, robot: mission.robotPreset, project, checks: mission.goals });
}
const attachmentPractice = [];
for (const id of practiceIds) {
  const task = practiceTasks[id], customRobot = customKit(task.kit);
  const project = await save(`practice-${id}`, en.field.tasks[id].title, {
    missionId: null, steps: [], outcome: null, scene: 'custom',
    visualProgram: fromCommands(task.reference), robotKit: task.kit,
    robot: customRobot ? designRobot(customRobot) : templateRobot(task.kit),
    robotTemplate: customRobot ? 'custom' : task.kit, customRobot,
    customWorld: practiceWorld(id), fieldGoal: task.goal,
  });
  attachmentPractice.push({ id: `practice-${id}`, name: en.field.tasks[id].title, robot: task.kit, project });
}
const courseProjects = new Map<string, string>();
for (const reference of lineCourseReferences) {
  const project = await save(reference.id, reference.name, { missionId: null, steps: [], outcome: null,
    scene: reference.scene, visualProgram: lineCourseProgram(reference.distanceCm), robotTemplate: 'custom',
    customRobot: lineCourseRobot, robot: lineCourseDesign, fieldGoal: reference.goal,
  });
  courseProjects.set(reference.scene, project);
}
await writeFile(resolve(root, 'inventory.json'), JSON.stringify({
  schemaVersion: 1,
  note: 'Project availability does not prove a successful live run. See results for measured outcomes and videos.',
  classroom, attachmentPractice,
  practice: practiceWorlds.map(world => {
    const reference = lineCourseReferences.find(entry => entry.scene === world.id);
    return { id: world.id, name: world.name, ...(reference ? { project: courseProjects.get(world.id), resultId: reference.id, scope: 'Default course recorded' } : {}),
      ...(world.id === 'world:lineFollowing:obstacles2' ? { project: 'Obstacle-2-line-follower.rlproj', resultId: 'obstacles-2', scope: 'Left–right–left layout recorded' } : {}),
    };
  }),
  competition: competitionFields.map(field => ({ id: field.file, name: field.name, content: field.content, status: field.content === 'mat-only' ? 'needs-mission-models' : 'needs-live-solution-and-scoring' })),
}, null, 2) + '\n');
console.log(`Exported ${classroom.length} classroom, ${attachmentPractice.length} attachment and ${courseProjects.size} line-course projects; inventoried ${practiceWorlds.length} practice variants and ${competitionFields.length} competition fields.`);
