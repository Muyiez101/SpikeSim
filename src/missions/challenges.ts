import { en } from '../shared/strings/en';
import { bounds } from '../sim/maps';
import { mapSchema } from '../sim/schemas';
import type { MapFile } from '../sim/map-types';
import type { SimCommand } from '../sim/types';
import { fromCommands, literal, type BlockState, type VisualProgram } from '../editor/program';
import { missionSchema, worldSchema, type MissionFile, type MissionGoal } from './schemas';

const copy = en.challenges;
export const challengeMaps: Record<string, MapFile> = {};
export const challengeMissions: MissionFile[] = [];
export const challengeWorlds = copy.worlds.map(([id, title, description]) => worldSchema.parse({ schemaVersion: 1, id, title, description, missionIds: ['pending'] }));
type Point = [number, number];
const move = (cm: number, speedPercent = 60): SimCommand => ({ type: 'move', distanceMm: cm * 10, speedPercent });
const turn = (degrees: number): SimCommand => ({ type: 'turn', degrees, speedPercent: 40 });
const wait = (seconds: number): SimCommand => ({ type: 'wait', durationMs: seconds * 1000 });
const image: SimCommand = { type: 'matrix', image: 'heart' };
const beep: SimCommand = { type: 'beep', frequency: 440, durationMs: 300 };
const chain = (...blocks: BlockState[]) => {
  for (let i = 0; i < blocks.length - 1; i++) {
    let tail = blocks[i];
    while (tail.next?.block) tail = tail.next.block;
    tail.next = { block: blocks[i + 1] };
  }
  return blocks[0];
};
const commands = (...items: SimCommand[]) => fromCommands(items).blocks.blocks[0].next!.block!;
const repeat = (count: number, body: BlockState): BlockState => ({ type: 'controls_repeat_ext', inputs: { TIMES: literal(count), DO: { block: body } } });
const program = (body: BlockState, definitions: BlockState[] = [], variables?: VisualProgram['variables']): VisualProgram => ({ blocks: { languageVersion: 0, blocks: [{ type: 'spike_start', next: { block: body } }, ...definitions] }, ...(variables ? { variables } : {}) });
const compare = (left: BlockState, op: string, right: number | string): BlockState => ({ type: 'logic_compare', fields: { OP: op }, inputs: { A: { block: left }, B: typeof right === 'number' ? literal(right) : { shadow: { type: 'text', fields: { TEXT: right } } } } });
const sensor = (type: 'spike_color' | 'spike_force' | 'spike_distance', port: string): BlockState => ({ type, fields: { PORT: port } });
const loop = (condition: BlockState, body: BlockState, until = false): BlockState => ({ type: 'controls_whileUntil', fields: { MODE: until ? 'UNTIL' : 'WHILE' }, inputs: { BOOL: { block: condition }, DO: { block: body } } });
const uses = (block: string): MissionGoal => ({ type: 'usesBlock', block });
const stop: MissionGoal = { type: 'stopInZone', zone: copy.finish };
const safe: MissionGoal = { type: 'avoidCollisions' };
const signals: MissionGoal[] = [{ type: 'matrixLit' }, { type: 'soundPlayed' }];
const distanceBelow = (cm: number): BlockState => ({ type: 'spike_distance_compare', fields: { PORT: 'E', OP: 'LT' }, inputs: { DISTANCE: literal(cm) } });
const driveUntil = (speed: number, condition: BlockState) => chain(
  { type: 'spike_speed', inputs: { SPEED: literal(speed) } },
  { type: 'spike_start_move', fields: { DIRECTION: 'forward' } },
  { type: 'spike_wait_until', inputs: { CONDITION: { block: condition } } },
  { type: 'spike_stop_move' },
);

function field(id: string, spawn: Point = [140, 300], finish: Point = [790, 300], size: Point = [1200, 1000]): MapFile {
  const map = mapSchema.parse({ schemaVersion: 1, id, size: { width: size[0], height: size[1] }, surface: { base: '#ffffff', layers: [] }, walls: bounds(...size), objects: [], zones: [{ id: copy.finish, shape: 'circle', x: finish[0], y: finish[1], r: 40, tags: ['finish'], color: '#88c843' }], friction: [], spawn: { x: spawn[0], y: spawn[1], heading: 0 } });
  challengeMaps[id] = map;
  return map;
}
function add(id: string, map: MapFile | string, goals: MissionGoal[], reference: VisualProgram, content?: readonly string[], seconds = 40) {
  const text = content ?? copy.extras[id as keyof typeof copy.extras];
  const visual = structuredClone(reference);
  let index = 0;
  const identify = (block: BlockState) => {
    block.id = `${id}-${index++}`;
    for (const input of Object.values(block.inputs ?? {})) { if (input.block) identify(input.block); if (input.shadow) identify(input.shadow); }
    if (block.next?.block) identify(block.next.block);
  };
  visual.blocks.blocks.forEach(identify);
  challengeMissions.push(missionSchema.parse({ schemaVersion: 1, id, worldId: id.split('-')[0], title: text[0], brief: text[1], robotPreset: 'driving-base', mapId: typeof map === 'string' ? map : map.id, goals, timeLimits: { threeStars: seconds, twoStars: seconds * 1.5 }, hints: text.slice(2).map((text, index) => ({ level: index + 1, text })), reference: [], visualReference: visual }));
}

add('basics-5', 'basics-field', [...signals, { type: 'stopInZone', zone: 'landing-pad' }], program(commands(image, beep, move(58, 70))), undefined, 6);
add('conditions-4', 'conditions-field', [{ type: 'sensorAtEnd', port: 'D', value: 'yellow' }, { type: 'matrixLit' }], program(commands(turn(-90), move(15), turn(90), move(28), image)), undefined, 8);
add('conditions-5', field('choose-lane', [140, 300], [440, 300]), [uses('controls_if'), uses('spike_color'), stop], program({ type: 'controls_if', inputs: { IF0: { block: compare(sensor('spike_color', 'D'), 'EQ', 'white') }, DO0: { block: commands(move(30)) } } }), undefined, 5);
add('loops-3', 'loops-field', [uses('controls_repeat_ext'), { type: 'pushObjectToZone', object: 'token-1', zone: 'home' }], program(repeat(3, commands(move(20, 50)))), undefined, 8);
add('loops-4', field('rhythm'), [uses('controls_repeat_ext'), ...signals, { type: 'minTime', seconds: 4 }], program(repeat(4, commands(image, beep, wait(0.7)))), undefined, 5);
add('loops-5', field('five-steps', [140, 300], [640, 300]), [uses('controls_for'), stop], program({ type: 'controls_for', fields: { VAR: { id: 'i' } }, inputs: { FROM: literal(1), TO: literal(5), BY: literal(1), DO: { block: commands(move(10, 30)) } } }, [], [{ id: 'i', name: 'i' }]), undefined, 15);

function polygon(id: string, sides: number, length: number, angle: number, start: Point = [400, 300], speed = 60) {
  const map = field(id, start, start);
  let x = start[0], y = start[1], heading = 0;
  const checkpoints: string[] = [];
  for (let i = 0; i < sides; i++) {
    x += Math.cos(heading) * length * 10; y += Math.sin(heading) * length * 10; heading += angle * Math.PI / 180;
    const name = copy.checkpoint(i + 1); checkpoints.push(name);
    map.zones.push({ id: name, shape: 'circle', x, y, r: 28, tags: [], color: '#6a92de' });
  }
  map.surface.layers.push({ type: 'line', points: [[start[0], start[1]], ...map.zones.slice(1).map((zone): Point => [zone.x, zone.y])], width: 3, color: '#bcc7d9' });
  return { map, goals: [{ type: 'visitInOrder', zones: checkpoints }, stop, safe] as MissionGoal[], body: repeat(sides, commands(move(length, speed), turn(angle))) };
}
[[4, 25, 90], [3, 30, 120], [5, 30, 144], [6, 15, 60], [8, 12, 45]].forEach(([sides, length, angle], index) => {
  const id = `patterns-${index + 1}`;
  const shape = polygon(id, sides, length, angle, [400, 300], index >= 3 ? 30 : 60);
  add(id, shape.map, [...shape.goals, uses('controls_repeat_ext')], program(shape.body), [copy.shapeNames[index], copy.shapeBrief(sides), ...copy.shapeHints(sides, length, angle)], index >= 3 ? 40 : 25);
});

const wall = field('sensor-wall', [140, 300], [714, 300], [1000, 600]);
add('sensors-1', wall, [uses('spike_distance_compare'), { type: 'sensorBetween', port: 'E', min: 190, max: 200 }, safe], program(chain(driveUntil(40, distanceBelow(25)), driveUntil(8, distanceBelow(19.6)), commands(wait(0.4)))), undefined, 10);
function colorMap(id: string) {
  const map = field(id, [140, 300], [460, 300], [1000, 600]);
  map.surface.layers.push({ type: 'patch', shape: 'rect', x: 600, y: 300, w: 140, h: 200, color: '#ef4444' });
  return map;
}
const findRed = () => driveUntil(25, { type: 'spike_color_is', fields: { PORT: 'D', COLOR: 'red' } });
add('sensors-2', colorMap('red-gate'), [uses('spike_color_is'), { type: 'sensorAtEnd', port: 'D', value: 'red' }, { type: 'matrixLit' }, safe], program(chain(findRed(), commands(wait(0.3), image))), undefined, 8);
add('sensors-3', field('bumper-retreat', [140, 300], [710, 300], [1000, 600]), [uses('spike_force_pressed'), { type: 'sensorSeen', port: 'F', value: 10 }, stop, { type: 'matrixLit' }], program(chain(driveUntil(25, { type: 'spike_force_pressed', fields: { PORT: 'F' } }), commands(wait(0.3), move(-20, 30), { type: 'matrix', image: 'arrow' }))), undefined, 15);
const headingError = (): BlockState => ({ type: 'math_arithmetic', fields: { OP: 'MINUS' }, inputs: { A: literal(90), B: { block: { type: 'spike_heading' } } } });
add('sensors-4', field('gyro-lab'), [uses('spike_heading'), { type: 'headingWithin', degrees: 90, tolerance: 1 }], program(loop(compare({ type: 'math_single', fields: { OP: 'ABS' }, inputs: { NUM: { block: headingError() } } }, 'GT', 0.5), { type: 'spike_turn', inputs: { ANGLE: { block: headingError() }, SPEED: literal(20) } })), undefined, 8);
add('sensors-5', field('timer-lab'), [uses('spike_timer'), { type: 'minTime', seconds: 3 }, { type: 'matrixLit' }], program(chain(commands(image), loop(compare({ type: 'spike_timer' }, 'LT', 3), commands(wait(0.1))))), undefined, 4);

function route(id: string, points: Point[]) {
  const map = field(id, points[0], points[points.length - 1]);
  let heading = 0;
  const steps: SimCommand[] = [];
  const stops: string[] = [];
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i], [px, py] = points[i - 1];
    const next = Math.atan2(y - py, x - px) * 180 / Math.PI;
    const angle = ((next - heading + 540) % 360) - 180;
    if (Math.abs(angle) > 0.01) steps.push(turn(angle));
    steps.push(move(Math.hypot(x - px, y - py) / 10)); heading = next;
    const name = copy.stop(i); stops.push(name);
    map.zones.push({ id: name, shape: 'circle', x, y, r: 38, tags: [], color: '#72a4dc' });
  }
  map.surface.layers.push({ type: 'line', points, width: 3, color: '#bcc7d9' });
  return { map, steps, goals: [...(stops.length > 1 ? [{ type: 'visitInOrder' as const, zones: stops }] : []), stop, safe] };
}
const routes: Point[][] = [ [[140, 200], [900, 200]], [[140, 180], [650, 180], [650, 700]], [[140, 180], [700, 180], [700, 600], [250, 600]], [[140, 140], [500, 140], [500, 450], [850, 450], [850, 750]], [[200, 700], [200, 200], [850, 200], [850, 700]] ];
routes.forEach((points, index) => {
  const id = `mazes-${index + 1}`, course = route(id, points);
  if (index === 0) course.map.walls.push({ points: [[60, 70], [1030, 70]], thickness: 20, height: 80 }, { points: [[60, 330], [1030, 330]], thickness: 20, height: 80 });
  if (index === 1) course.map.walls.push({ points: [[140, 330], [460, 330], [460, 830]], thickness: 24, height: 100 });
  if (index === 4) { course.map.zones.push({ id: 'danger', shape: 'circle', x: 520, y: 450, r: 170, tags: [], color: '#e86868' }); course.goals.push({ type: 'avoidZone', zone: 'danger' }); }
  const hint = course.steps.map(command => command.type === 'move' ? copy.moveHint(command.distanceMm / 10) : command.type === 'turn' ? copy.turnHint(command.degrees) : '').join(', ');
  add(id, course.map, course.goals, program(commands(...course.steps)), [...copy.routes[index], ...copy.routeHints(hint)], 25);
});

const call = (name: string, argument?: number): BlockState => ({ type: 'procedures_callnoreturn', extraState: { name, ...(argument !== undefined ? { params: ['distance'] } : {}) }, ...(argument !== undefined ? { inputs: { ARG0: literal(argument) } } : {}) });
const definition = (name: string, body: BlockState, parameter?: string): BlockState => ({ type: 'procedures_defnoreturn', fields: { NAME: name }, ...(parameter ? { extraState: { params: [{ name: parameter, id: parameter }] } } : {}), inputs: { STACK: { block: body } } });
const get = (id: string): BlockState => ({ type: 'variables_get', fields: { VAR: { id } } });
const set = (id: string, value: number): BlockState => ({ type: 'variables_set', fields: { VAR: { id } }, inputs: { VALUE: literal(value) } });
const variableMove = (value: BlockState, speed = 60): BlockState => ({ type: 'spike_move', inputs: { DISTANCE: { block: value }, SPEED: literal(speed) } });
const custom = uses('procedures_callnoreturn');
const square = polygon('function-square', 4, 20, 90);
add('functions-1', square.map, [...square.goals, custom], program(repeat(4, call('corner')), [definition('corner', commands(move(20), turn(90)))]), undefined, 20);
add('functions-2', field('staircase', [140, 150], [590, 600]), [stop, custom, uses('controls_repeat_ext'), safe], program(repeat(3, call('stair')), [definition('stair', commands(move(15), turn(90), move(15), turn(-90)))]), undefined, 18);
add('functions-3', field('parameter-route', [140, 300], [340, 600]), [stop, custom, safe], program(chain(call('travel', 20), commands(turn(90)), call('travel', 30)), [definition('travel', variableMove(get('distance'), 30), 'distance')], [{ id: 'distance', name: 'distance' }]), undefined, 10);
add('functions-4', field('count-deliveries', [140, 300], [440, 300]), [stop, custom, { type: 'variableEquals', name: 'deliveries', value: 3 }], program(chain(set('deliveries', 0), repeat(3, call('deliver'))), [definition('deliver', chain(commands(move(10, 30)), { type: 'math_change', fields: { VAR: { id: 'deliveries' } }, inputs: { DELTA: literal(1) } }))], [{ id: 'deliveries', name: 'deliveries' }]), undefined, 8);
add('functions-5', field('scaled-route', [140, 300], [440, 600]), [stop, custom, uses('math_arithmetic')], program(chain(set('length', 15), call('double_move'), commands(turn(90)), call('double_move')), [definition('double_move', variableMove({ type: 'math_arithmetic', fields: { OP: 'MULTIPLY' }, inputs: { A: { block: get('length') }, B: literal(2) } }))], [{ id: 'length', name: 'length' }]), undefined, 10);

const delivery = field('double-delivery', [140, 220], [820, 470], [1000, 700]);
delivery.zones[0] = { id: copy.finish, shape: 'rect', x: 850, y: 350, w: 240, h: 500, tags: ['finish'], color: '#88c843' };
delivery.objects = [220, 470].map((y, index) => ({ id: `parcel-${index + 1}`, kind: 'box', x: 480, y, size: 60, mass: 120, color: '#ad7ded', tags: ['parcel'] }));
add('champions-1', delivery, [{ type: 'pushObjectToZone', object: 'parcel-1', zone: copy.finish }, { type: 'pushObjectToZone', object: 'parcel-2', zone: copy.finish }, stop], program(commands(move(68, 50), move(-68), turn(90), move(25), turn(-90), move(68, 50))), undefined, 22);
const slalom = route('slalom', [[140, 200], [540, 200], [540, 600], [890, 600]]);
slalom.map.zones.push({ id: 'danger', shape: 'rect', x: 320, y: 420, w: 200, h: 200, tags: [], color: '#ed7474' });
add('champions-2', slalom.map, [...slalom.goals, { type: 'avoidZone', zone: 'danger' }], program(commands(...slalom.steps)), undefined, 16);
add('champions-3', field('precise-finish'), [stop, { type: 'stayInZone', zone: copy.finish, durationMs: 3000 }, safe], program(commands(move(65, 70), wait(3.1))), undefined, 8);
const patrol = polygon('patrol-square', 4, 25, 90);
add('champions-4', patrol.map, [...patrol.goals, uses('controls_repeat_ext'), ...signals], program(chain(patrol.body, commands(image, beep))), undefined, 20);
add('champions-5', colorMap('red-alert'), [uses('spike_color_is'), { type: 'sensorAtEnd', port: 'D', value: 'red' }, ...signals, safe], program(chain(findRed(), commands({ type: 'matrix', image: 'arrow' }, { ...beep, durationMs: 500 }))), undefined, 8);
const showcase = polygon('showcase', 4, 25, 90);
add('champions-6', showcase.map, [...showcase.goals, custom, uses('controls_repeat_ext'), ...signals], program(chain(repeat(4, call('corner')), commands(image, beep)), [definition('corner', commands(move(25), turn(90)))]), undefined, 20);

for (const world of challengeWorlds) world.missionIds = challengeMissions.filter(mission => mission.worldId === world.id).map(mission => mission.id);
