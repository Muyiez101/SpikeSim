import { en } from '../shared/strings/en';
import { obstacleRobot } from './obstacles2';
import { designRobot } from '../sim/custom-design';
import { literal, visualProgramSchema, type BlockState } from '../editor/program';
import { fieldGoalSchema } from './schemas';

export const lineCourseRobot = { ...obstacleRobot, name: en.field.lineRobot };
export const lineCourseDesign = designRobot(lineCourseRobot);
export const lineCourseReferences = [
  { id: 'line-simple', scene: 'world:lineFollowing:simple', name: en.field.lineProjects.simple, distanceCm: 220 },
  { id: 'line-gaps1', scene: 'world:lineFollowing:gaps1', name: en.field.lineProjects.gaps1, distanceCm: 179 },
].map(entry => ({ ...entry, goal: fieldGoalSchema.parse({ scene: entry.scene, target: 'robot', action: 'reach', amount: 8, destination: { x: 0, y: 88 } }) }));

const input = (block: BlockState) => ({ block });
const num = (n: number) => literal(n).shadow!;
const calc = (op: string, a: BlockState, b: BlockState): BlockState => ({ type: 'math_arithmetic', fields: { OP: op }, inputs: { A: input(a), B: input(b) } });
const sensor = (type: BlockState['type'], port: string): BlockState => ({ type, fields: { PORT: port } });
const value = (id: string): BlockState => ({ type: 'variables_get', fields: { VAR: { id } } });
function chain(...blocks: BlockState[]) {
  for (let i = 0; i < blocks.length - 1; i++) {
    let last = blocks[i]; while (last.next?.block) last = last.next.block;
    last.next = input(blocks[i + 1]);
  }
  return blocks[0];
}

/** Two reflected-light readings steer continuously; encoder distance ends the
 * measured course. These distances are calibrated for this robot and these mats. */
export function lineCourseProgram(distanceCm: number) {
  const main = chain(
    { type: 'spike_motor_reset', fields: { PORT: 'A' }, inputs: { POSITION: literal(0) } },
    { type: 'spike_motor_reset', fields: { PORT: 'B' }, inputs: { POSITION: literal(0) } },
    { type: 'controls_whileUntil', fields: { MODE: 'UNTIL' }, inputs: {
      BOOL: input({ type: 'logic_compare', fields: { OP: 'GTE' }, inputs: {
        A: input(calc('ADD', sensor('spike_motor_position', 'A'), sensor('spike_motor_position', 'B'))),
        B: literal(distanceCm / (5.6 * Math.PI) * 720),
      } }),
      DO: input(chain(
        { type: 'variables_set', fields: { VAR: { id: 'correction' } }, inputs: { VALUE: input(calc('MULTIPLY', calc('MINUS', sensor('spike_reflection', 'D'), sensor('spike_reflection', 'F')), num(.22))) } },
        { type: 'spike_start_tank', inputs: { LEFT: input(calc('ADD', num(18), value('correction'))), RIGHT: input(calc('MINUS', num(18), value('correction'))) } },
        { type: 'spike_wait', inputs: { TIME: literal(.02) } },
      )),
    } },
    { type: 'spike_stop_move' }, { type: 'spike_wait', inputs: { TIME: literal(2) } }, { type: 'spike_image', fields: { IMAGE: 'check' } },
  );
  let id = 0;
  function identify(block: BlockState) {
    block.id = `line-${++id}`;
    for (const child of Object.values(block.inputs ?? {})) { if (child.block) identify(child.block); if (child.shadow) identify(child.shadow); }
    if (block.next?.block) identify(block.next.block);
  }
  const start = chain({ type: 'spike_start', x: 30, y: 30 }, main); identify(start);
  return visualProgramSchema.parse({ blocks: { languageVersion: 0, blocks: [start] }, variables: [{ id: 'correction', name: en.field.lineCorrection }] });
}
