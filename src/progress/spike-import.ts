import { z } from 'zod';
import { type BlockState, type BlockType, type VisualProgram, visualProgramSchema, literal } from '../editor/program';
import { defaultRobot } from '../sim/presets';
import { robotSchema, type RobotDesign } from '../sim/schemas';
import { en } from '../shared/strings/en';
import { programFileSchema, type ProgramFile } from './program-file';
import { maxSpikeArchiveBytes, ZipReader } from './zip-reader';

const copy = en.spikeImport;
const scratchBlock = z.object({ opcode: z.string().max(100), next: z.string().nullable().optional(), parent: z.string().nullable().optional(),
  inputs: z.record(z.string(), z.array(z.unknown())).default({}), fields: z.record(z.string(), z.array(z.unknown())).default({}),
  shadow: z.boolean().optional(), topLevel: z.boolean().optional(), x: z.number().optional(), y: z.number().optional(),
});
const scratchSchema = z.object({ targets: z.array(z.object({ blocks: z.record(z.string(), scratchBlock), variables: z.record(z.string(), z.array(z.unknown())).optional() })).min(1).max(10) });
type ScratchBlock = z.infer<typeof scratchBlock>;
export type SpikeImportResult = { ok: true; program: ProgramFile; notes: string[] } | { ok: false; message: string; unsupported: string[] };
class ImportProblem extends Error {}
const textBlock = (text: unknown): BlockState => ({ type: 'text', fields: { TEXT: String(text ?? '') } });

export async function importSpikeArchive(bytes: Uint8Array, filename: string): Promise<SpikeImportResult> {
  if (bytes.length > maxSpikeArchiveBytes) return { ok: false, message: copy.tooLarge, unsupported: [] };
  try {
    const zip = new ZipReader(bytes);
    let name = filename.replace(/\.(llsp3|sb3)$/i, ''), project: unknown;
    if (zip.has('manifest.json')) {
      const manifest = z.object({ name: z.string().optional(), type: z.string().optional() }).parse(await zip.json('manifest.json'));
      name = manifest.name ?? name;
      if (manifest.type !== 'word-blocks') return { ok: false, message: copy.unsupported, unsupported: [manifest.type ?? 'Unknown project type'] };
      project = await new ZipReader(await zip.read('scratch.sb3', maxSpikeArchiveBytes)).json('project.json');
    } else project = await zip.json('project.json');
    return convertSpikeProject(project, name);
  } catch (error) { return { ok: false, message: error instanceof ImportProblem ? error.message : copy.invalid, unsupported: [] }; }
}

/** Translate a Scratch graph to editable Blockly state; never silently drop instructions. */
export function convertSpikeProject(project: unknown, name: string): SpikeImportResult {
  try {
    const parsed = scratchSchema.parse(project);
    const targets = parsed.targets.filter(t => Object.keys(t.blocks).length);
    if (targets.length !== 1) throw new ImportProblem(copy.starts);
    const target = targets[0], blocks = target.blocks;
    if (Object.keys(blocks).length > 1500) throw new ImportProblem(copy.tooLarge);
    const field = (b: ScratchBlock, key: string, fallback = '') => String(b.fields[key]?.[0] ?? fallback);
    const raw = (b: ScratchBlock, key: string): unknown => {
      const input = b.inputs[key]; if (!input) return '';
      const value = input[1] ?? input[2];
      if (typeof value === 'string') {
        const shadow = blocks[value];
        if (!shadow?.shadow) throw new ImportProblem(copy.unsupported + ' ' + b.opcode + ' / ' + key);
        return Object.values(shadow.fields)[0]?.[0] ?? '';
      }
      return Array.isArray(value) ? value[1] : '';
    };
    const pairs = new Set(Object.values(blocks).filter(b => b.opcode === 'flippermove_setMovementPair').map(b => String(raw(b, 'PAIR'))));
    if (pairs.size > 1) throw new ImportProblem(copy.ports);
    const sensorPorts = new Set(Object.values(blocks).filter(b => b.opcode.startsWith('flippersensors_') || b.opcode === 'flipperlight_ultrasonicLightUp').filter(b => b.inputs.PORT).map(b => String(raw(b,'PORT'))));
    const pair = [...pairs][0] ?? [...'ABCDEF'].filter(p => !sensorPorts.has(p)).slice(0,2).join('');
    if (!/^[A-F]{2}$/.test(pair) || pair[0] === pair[1]) throw new ImportProblem(copy.ports);
    const robot: RobotDesign = { ...defaultRobot, id: 'spike-import', name: copy.robot, motors: defaultRobot.motors.map((motor, i) => ({ ...motor, port: pair[i] as 'A' })), devices: [] };
    const occupied = new Map<string, string>([[pair[0], 'left'], [pair[1], 'right']]);
    const registerPort = (b: ScratchBlock, type: 'motor' | 'color' | 'distance' | 'force') => {
      const port = String(raw(b, 'PORT'));
      if (!/^[A-F]$/.test(port)) throw new ImportProblem(copy.ports);
      const old = occupied.get(port);
      if (old && !(type === 'motor' ? ['left','right','arm'].includes(old) : old === type)) throw new ImportProblem(copy.ports);
      if (!old) {
        if (type === 'motor') {
          if (robot.motors.some(m => m.side === 'arm')) throw new ImportProblem(copy.ports);
          robot.motors.push({ ...defaultRobot.motors[0], port: port as 'A', side: 'arm' }); occupied.set(port, 'arm');
        } else {
          robot.devices.push({ ...defaultRobot.devices.find(d => d.type === type)!, port: port as 'A' }); occupied.set(port, type);
        }
      }
      return port;
    };
    const unsupported = new Set<string>();
    const visited = new Set<string>();
    let created = 0;
    const make = (type: BlockType, fields: Record<string, unknown> = {}, inputs: BlockState['inputs'] = {}): BlockState => ({ type, id: `spike-${++created}`, fields, inputs });
    const arg = (b: ScratchBlock, key: string, fallback: number | string | boolean = 0): { block: BlockState } => {
      const slot = b.inputs[key], value = slot?.[1] ?? slot?.[2];
      if (typeof value === 'string' && blocks[value] && !blocks[value].shadow) return { block: convert(value) };
      if (Array.isArray(value) && value[0] === 12) return { block: make('variables_get', { VAR: { id: String(value[2]) } }) };
      const resolved = value === null || value === undefined ? fallback : raw(b, key);
      if (typeof fallback === 'boolean') return { block: make('logic_boolean', { BOOL: resolved ? 'TRUE' : 'FALSE' }) };
      if (typeof fallback === 'string') return { block: textBlock(resolved) };
      const number = Number(key === 'STEERING' && typeof resolved === 'string' ? resolved.replace(/^(left|right):\s*/, '') : resolved); if (!Number.isFinite(number)) throw new ImportProblem(copy.invalid);
      return { block: make('math_number', { NUM: number }) };
    };
    const sub = (b: ScratchBlock, key: string) => {
      const id = b.inputs[key]?.[1]; return typeof id === 'string' ? { block: convert(id) } : {};
    };
    const unit = (b: ScratchBlock) => {
      const unit = field(b, 'UNIT', 'cm');
      const normalized = ({ cm:'cm', inches:'inches', rotations:'rotations', degrees:'degrees', seconds:'seconds' } as Record<string,string>)[unit];
      if (!normalized) { unsupported.add(b.opcode + ' / ' + unit); return 'cm'; } return normalized;
    };
    const direction = (b: ScratchBlock) => {
      const value = String(raw(b,'DIRECTION'));
      const mapped = ({forward:'forward', back:'backward', backward:'backward', clockwise:'clockwise', counterclockwise:'counterclockwise', anticlockwise:'counterclockwise'} as Record<string,string>)[value];
      if (!mapped) unsupported.add(b.opcode + ' / ' + value);
      return mapped ?? 'forward';
    };
    const color = (b: ScratchBlock, key: string) => {
      const color = ({ '-1':'none', '0':'black', '1':'purple', '3':'blue', '4':'cyan', '5':'green', '7':'yellow', '9':'red', '10':'white' } as Record<string,string>)[String(raw(b,key))];
      if (!color) unsupported.add(b.opcode + ' / color ' + String(raw(b,key)));
      return color ?? 'off';
    };
    const convert = (id: string, depth = 0): BlockState => {
      if (depth > 300 || visited.has(id) || created > 1200 || !blocks[id]) throw new ImportProblem(copy.invalid);
      visited.add(id);
      const b = blocks[id]; let out: BlockState;
      switch (b.opcode) {
        case 'flipperevents_whenProgramStarts': case 'event_whenflagclicked': out = make('spike_start'); break;
        case 'flippermove_setMovementPair': out = make('spike_pair', { LEFT: pair[0], RIGHT: pair[1] }); break;
        case 'flippermove_setDistance': {
          let distance = arg(b, 'DISTANCE');
          if (field(b,'UNIT','cm') === 'inches') distance = {block:make('math_arithmetic',{OP:'MULTIPLY'},{A:distance,B:literal(2.54)})};
          else if (field(b,'UNIT','cm') !== 'cm') unsupported.add(b.opcode + ' / unknown unit');
          out = make('spike_wheel_distance', {}, { DISTANCE:distance }); break;
        }
        case 'flippermove_setSpeed': out = make('spike_speed', {}, { SPEED: arg(b,'SPEED') }); break;
        case 'flippermove_move': out = make('spike_move_for', { DIRECTION: direction(b), UNIT:unit(b) }, { AMOUNT:arg(b,'VALUE') }); break;
        case 'flippermove_steer': out = make('spike_steer_for', { UNIT:unit(b) }, { STEERING:arg(b,'STEERING'), AMOUNT:arg(b,'VALUE') }); break;
        case 'flippermove_startMove': out = make('spike_start_move', { DIRECTION:direction(b) }); break;
        case 'flippermove_stopMove': out = make('spike_stop_move'); break;
        case 'flippermoremove_startDualSpeed': out = make('spike_start_tank', {}, { LEFT:arg(b,'LEFT'), RIGHT:arg(b,'RIGHT') }); break;
        case 'flippermotor_motorSetSpeed': out = make('spike_motor_speed', { PORT:registerPort(b,'motor') }, { SPEED:arg(b,'SPEED') }); break;
        case 'flippermotor_motorStartDirection': out = make('spike_motor_start', { PORT:registerPort(b,'motor'), DIRECTION:direction(b) }); break;
        case 'flippermotor_motorTurnForDirection': out = make('spike_motor_for', { PORT:registerPort(b,'motor'), DIRECTION:direction(b), UNIT:unit(b) }, { AMOUNT:arg(b,'VALUE') }); break;
        case 'flippermotor_motorStop': out = make('spike_motor_stop', { PORT:registerPort(b,'motor') }); break;
        case 'flipperlight_centerButtonLight': out = make('spike_light', { COLOR:color(b,'COLOR') }); break;
        case 'flipperlight_ultrasonicLightUp': {
          const values = String(raw(b,'VALUE')).split(' ').map(Number);
          if (values.length !== 4 || values.some(v=>!Number.isFinite(v) || v < 0 || v > 100)) throw new ImportProblem(copy.invalid);
          out = make('spike_distance_lights',{PORT:registerPort(b,'distance')},Object.fromEntries(values.map((v,i)=>[`L${i}`,literal(v)]))); break;
        }
        case 'flipperlight_lightDisplayText': out = make('spike_text', {}, { TEXT:arg(b,'TEXT','') }); break;
        case 'flipperlight_lightDisplayImageOnForTime': out = make('spike_matrix_pattern', { PATTERN:String(raw(b,'MATRIX')) }, { TIME:arg(b,'VALUE') }); break;
        case 'flippersensors_isColor': out = make('spike_color_is', { PORT:registerPort(b,'color'), COLOR:color(b,'VALUE') }); break;
        case 'flippersensors_distance': out = make('spike_distance', { PORT:registerPort(b,'distance') }); break;
        case 'control_wait': out = make('spike_wait', {}, { TIME:arg(b,'DURATION') }); break;
        case 'control_wait_until': out = make('spike_wait_until', {}, { CONDITION:arg(b,'CONDITION',false) }); break;
        case 'control_repeat': out = make('controls_repeat_ext', {}, { TIMES:arg(b,'TIMES'), DO:sub(b,'SUBSTACK') }); break;
        case 'control_repeat_until': out = make('controls_whileUntil', { MODE:'UNTIL' }, { BOOL:arg(b,'CONDITION',false), DO:sub(b,'SUBSTACK') }); break;
        case 'control_forever': out = make('spike_forever', {}, { DO:sub(b,'SUBSTACK') }); break;
        case 'control_if': case 'control_if_else': out = make('controls_if', {}, { IF0:arg(b,'CONDITION',false), DO0:sub(b,'SUBSTACK'), ...(b.opcode === 'control_if_else' ? { ELSE:sub(b,'SUBSTACK2') } : {}) }); if (b.opcode === 'control_if_else') out.extraState = { hasElse:true }; break;
        case 'flippercontrol_stop': case 'control_stop': if (!['this stack','all','this script'].includes(field(b,'STOP_OPTION'))) unsupported.add(b.opcode); out = make('spike_stop'); break;
        case 'operator_or': case 'operator_and': out = make('logic_operation', { OP:b.opcode === 'operator_or' ? 'OR':'AND' }, { A:arg(b,'OPERAND1',false), B:arg(b,'OPERAND2',false) }); break;
        case 'operator_not': out = make('logic_negate', {}, { BOOL:arg(b,'OPERAND',false) }); break;
        case 'operator_lt': case 'operator_gt': case 'operator_equals': out = make('logic_compare', { OP:({operator_lt:'LT',operator_gt:'GT',operator_equals:'EQ'})[b.opcode] }, { A:arg(b,'OPERAND1'), B:arg(b,'OPERAND2') }); break;
        case 'operator_add': case 'operator_subtract': case 'operator_multiply': case 'operator_divide': out = make('math_arithmetic', { OP:({operator_add:'ADD',operator_subtract:'MINUS',operator_multiply:'MULTIPLY',operator_divide:'DIVIDE'})[b.opcode] }, { A:arg(b,'NUM1'), B:arg(b,'NUM2') }); break;
        case 'operator_random': out = make('math_random_int', {}, { FROM:arg(b,'FROM'), TO:arg(b,'TO') }); break;
        case 'data_setvariableto': case 'data_changevariableby': out = make(b.opcode === 'data_setvariableto' ? 'variables_set':'math_change', { VAR:{id:String(b.fields.VARIABLE?.[1])} }, { [b.opcode === 'data_setvariableto' ? 'VALUE':'DELTA']:arg(b,'VALUE') }); break;
        default: unsupported.add(b.opcode); out = make('spike_stop'); break;
      }
      if (b.next) out.next = { block:convert(b.next, depth + 1) };
      if (b.topLevel) { out.x = Math.min(5000, Math.max(0,b.x ?? 40)); out.y = Math.min(5000, Math.max(0,b.y ?? 40)); }
      return out;
    };
    const roots = Object.entries(blocks).filter(([,b]) => b.topLevel && !b.shadow);
    const translated = roots.map(([id]) => convert(id));
    // Include orphaned instructions, too, so a malformed graph cannot hide an unsupported operation.
    for (const [id,b] of Object.entries(blocks)) if (!b.shadow && !visited.has(id)) translated.push(convert(id));
    if (unsupported.size) return { ok:false, message:copy.unsupported, unsupported:[...unsupported].sort() };
    if (translated.filter(b => b.type === 'spike_start').length !== 1) throw new ImportProblem(copy.starts);
    const variables = Object.entries(target.variables ?? {}).map(([id,value]) => ({ id, name:String(value[0]).slice(0,80) }));
    const start = translated.find(b => b.type === 'spike_start')!;
    for (const [id, data] of Object.entries(target.variables ?? {}).reverse()) {
      const initial = typeof data[1] === 'number' ? literal(data[1]) : { block:textBlock(data[1]) };
      const block = make('variables_set',{VAR:{id}}, {VALUE:initial}); block.next = start.next; start.next = {block};
    }
    const visual: VisualProgram = { blocks:{languageVersion:0,blocks:translated}, variables };
    if (!visualProgramSchema.safeParse(visual).success) throw new ImportProblem(copy.tooLarge);
    const notes = [copy.converted, copy.geometry, copy.portSummary([...occupied].map(([p,t]) => `${p}: ${t}`).join(', '))];
    if (translated.length > 1) notes.push(copy.loose(translated.length - 1));
    const program = programFileSchema.parse({schemaVersion:1,kind:'spikesim-program',name:name.trim().slice(0,80) || 'SPIKE',missionId:null,steps:[],visualProgram:visual,robot:robotSchema.parse(robot)});
    return {ok:true,program,notes};
  } catch (error) { return {ok:false,message:error instanceof ImportProblem ? error.message : copy.invalid,unsupported:[]}; }
}
