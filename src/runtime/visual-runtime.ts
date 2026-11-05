import { DeterministicSimulator, SimulationTimeLimit } from '../sim/engine';
import { SpikeDevices } from './spike-devices';
import { matrixGlyph } from '../sim/matrix-font';
import { simCommandSchema, type MapFile, type RobotDesign } from '../sim/schemas';
import type { SimResult } from '../sim/types';
import { fieldText, inputBlock, nextBlock, variableId, visualProgramSchema, type BlockState, type VisualProgram } from '../editor/program';
import {requiresLive} from '../editor/live-blocks';

export type RuntimeErrorCode = 'missingStart' | 'missingInput' | 'unknownVariable' | 'unknownFunction' | 'wrongPort' | 'range' | 'divideByZero' | 'limit' | 'unsupported' | 'liveOnly';
export type TraceEntry = { blockId: string; start: number; end: number; variables: Record<string, number | string | boolean> };
export type Execution = { result: SimResult; trace: TraceEntry[]; output: { t: number; text: string }[]; limitedPreview?: boolean; usedBlocks?: string[]; variables?: Record<string, Value>; error?: { code: RuntimeErrorCode; blockId?: string } };
class PreviewComplete extends Error {}
class ProgramError extends Error {
  constructor(readonly code: RuntimeErrorCode, readonly blockId?: string) { super(code); }
}
type Value = number | string | boolean;

/** Interprets a validated block graph in the simulation worker. Never evaluates source text. */
export function executeVisualProgram(program: VisualProgram, map: MapFile, robot: RobotDesign, seed = 1, maxSeconds?: number): Execution {
  const sim = new DeterministicSimulator({ map, robot, seed, maxSeconds });
  const devices = new SpikeDevices(sim);
  const trace: TraceEntry[] = [];
  const output: { t: number; text: string }[] = [];
  const variables = new Map<string, Value>();
  const usedBlocks = new Set<string>();
  let instructions = 0;
  let foreverActive = false;
  let timerStart = 0;
  let stopped = false;
  let randomState = seed >>> 0;
  const functions = new Map<string, BlockState>();
  const fail = (code: RuntimeErrorCode, block?: BlockState): never => { throw new ProgramError(code, block?.id); };
  const tick = (block: BlockState) => {
    ++instructions;
    // Ordinary previews stop after 30 seconds. A timed competition uses the
    // teacher's simulation deadline instead, while retaining the operation cap.
    if (foreverActive && maxSeconds === undefined && (instructions > 10000 || sim.snapshot().t >= 30)) throw new PreviewComplete();
    if (instructions > 10000 || sim.snapshot().t > 180) fail('limit', block);
  };
  const numeric = (value: Value, block: BlockState) => {
    const number = Number(value);
    if (!Number.isFinite(number) || Math.abs(number) > 1e9) fail('range', block);
    return number;
  };
  const arg = (block: BlockState, name: string): Value => {
    const input = inputBlock(block, name);
    if (!input) return fail('missingInput', block);
    return expression(input);
  };
  const num = (block: BlockState, name: string) => numeric(arg(block, name), block);
  const expression = (block: BlockState): Value => {
    tick(block);
    usedBlocks.add(block.type);
    switch (block.type) {
      case 'math_number': return numeric(fieldText(block, 'NUM', '0'), block);
      case 'text': return fieldText(block, 'TEXT');
      case 'logic_boolean': return fieldText(block, 'BOOL') === 'TRUE';
      case 'variables_get': {
        const id = variableId(block); if (!variables.has(id)) return fail('unknownVariable', block);
        return variables.get(id)!;
      }
      case 'spike_distance': case 'spike_color': case 'spike_force': {
        const port = fieldText(block, 'PORT');
        const expected = block.type.slice(6);
        if (!robot.devices.some((device) => device.port === port && device.type === expected)) return fail('wrongPort', block);
        const value = sim.readSensor(port);
        return block.type === 'spike_distance' && typeof value === 'number' && value >= 0 ? value / 10 : value;
      }
      case 'spike_heading': return sim.snapshot().robot.heading * 180 / Math.PI + devices.yawOffset;
      case 'spike_motor_position': return devices.position(motorPort(block));
      case 'spike_color_is': return sensorValue(block, 'color') === fieldText(block, 'COLOR');
      case 'spike_force_pressed': return Number(sensorValue(block, 'force')) > 0;
      case 'spike_distance_compare': {
        const distance = Number(sensorValue(block, 'distance')) / 10;
        return distance >= 0 && (fieldText(block, 'OP') === 'LT' ? distance < num(block, 'DISTANCE') : distance > num(block, 'DISTANCE'));
      }
      case 'spike_timer': return sim.snapshot().t - timerStart;
      case 'math_arithmetic': {
        const a = num(block, 'A'), b = num(block, 'B');
        switch (fieldText(block, 'OP')) {
          case 'ADD': return a + b; case 'MINUS': return a - b; case 'MULTIPLY': return a * b;
          case 'DIVIDE': return b === 0 ? fail('divideByZero', block) : a / b;
          case 'POWER': return numeric(a ** b, block);
          default: return fail('unsupported', block);
        }
      }
      case 'math_modulo': { const divisor = num(block, 'DIVISOR'); return divisor === 0 ? fail('divideByZero', block) : ((num(block, 'DIVIDEND') % divisor) + divisor) % divisor; }
      case 'math_single': {
        const value = num(block, 'NUM');
        const result = ({ ROOT: Math.sqrt, ABS: Math.abs, NEG: (n: number) => -n, LN: Math.log, LOG10: Math.log10, EXP: Math.exp, POW10: (n: number) => 10 ** n } as Record<string, (n: number) => number>)[fieldText(block, 'OP')]?.(value);
        return result === undefined ? fail('unsupported', block) : numeric(result, block);
      }
      case 'math_round': { const value = num(block, 'NUM'); return fieldText(block, 'OP') === 'ROUNDUP' ? Math.ceil(value) : fieldText(block, 'OP') === 'ROUNDDOWN' ? Math.floor(value) : Math.round(value); }
      case 'math_random_int': {
        const low = Math.ceil(Math.min(num(block, 'FROM'), num(block, 'TO'))), high = Math.floor(Math.max(num(block, 'FROM'), num(block, 'TO')));
        randomState = (Math.imul(1664525, randomState) + 1013904223) >>> 0;
        return low + Math.floor(randomState / 4294967296 * (high - low + 1));
      }
      case 'logic_compare': {
        const a = arg(block, 'A'), b = arg(block, 'B');
        switch (fieldText(block, 'OP')) { case 'EQ': return a === b; case 'NEQ': return a !== b; case 'LT': return a < b; case 'LTE': return a <= b; case 'GT': return a > b; case 'GTE': return a >= b; default: return fail('unsupported', block); }
      }
      case 'logic_operation': return fieldText(block, 'OP') === 'AND' ? Boolean(arg(block, 'A')) && Boolean(arg(block, 'B')) : Boolean(arg(block, 'A')) || Boolean(arg(block, 'B'));
      case 'logic_negate': return !arg(block, 'BOOL');
      case 'text_join': return Object.keys(block.inputs ?? {}).sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, ''))).map((key) => String(arg(block, key))).join('').slice(0, 2000);
      case 'text_length': return String(arg(block, 'VALUE')).length;
      default: return fail('unsupported', block);
    }
  };
  const command = (block: BlockState, value: unknown) => {
    const parsed = simCommandSchema.safeParse(value);
    if (!parsed.success) return fail('range', block);
    const input = parsed.data;
    if (input.type === 'move' && (Math.abs(input.distanceMm) > 3000 || input.speedPercent < 1)) fail('range', block);
    if (input.type === 'turn' && (Math.abs(input.degrees) > 360 || input.speedPercent < 1)) fail('range', block);
    if ('durationMs' in input && input.durationMs > 60000) fail('range', block);
    sim.run([input]);
  };
  const scopeValues = () => Object.fromEntries([...variables].slice(0, 50).map(([id, value]) => [program.variables?.find((item) => item.id === id)?.name ?? id, value]));
  const motorPort = (block: BlockState, name = 'PORT') => {
    const port = fieldText(block, name);
    if (!robot.motors.some(m => m.port === port)) fail('wrongPort', block);
    return port;
  };
  const sensorValue = (block: BlockState, type: string) => {
    const port = fieldText(block, 'PORT');
    if (!robot.devices.some(d => d.port === port && d.type === type)) fail('wrongPort', block);
    return sim.readSensor(port);
  };
  const speedValue = (block: BlockState, name: string) => {
    const speed = num(block, name); if (Math.abs(speed) > 100) fail('range', block); return speed;
  };
  const advance = (block: BlockState, seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 60 || sim.snapshot().t + seconds > 180) fail('limit', block);
    devices.advance(seconds);
  };
  const yieldLoop = (block: BlockState, start: number) => { if (sim.snapshot().t === start) advance(block, 1 / 60); };
  let defaultSpeed = 60;
  const chain = (first: BlockState | undefined, depth = 0): 'break' | 'continue' | undefined => {
    if (depth > 40) fail('limit', first);
    for (let block = first; block && !stopped; block = nextBlock(block)) {
      tick(block);
      if (block.enabled === false || block.disabledReasons?.length) continue;
      usedBlocks.add(block.type);
      const start = sim.snapshot().t;
      switch (block.type) {
        case 'spike_start': break;
        case 'spike_distance_lights': {
          sensorValue(block, 'distance');
          const values = [0,1,2,3].map(i => num(block, `L${i}`));
          if (values.some(v => v < 0 || v > 100)) fail('range', block);
          sim.setDistanceLights(fieldText(block,'PORT'), values); break;
        }
        case 'spike_pair': {
          const left = motorPort(block, 'LEFT'), right = motorPort(block, 'RIGHT');
          if (left === right || robot.motors.find(m => m.port === left)?.side !== 'left' || robot.motors.find(m => m.port === right)?.side !== 'right') fail('wrongPort', block);
          devices.stopPair(); devices.pair = [left, right]; break;
        }
        case 'spike_wheel_distance': devices.wheelTravel = num(block, 'DISTANCE'); if (devices.wheelTravel <= 0 || devices.wheelTravel > 100) fail('range', block); break;
        case 'spike_start_move': {
          const speed = defaultSpeed * (fieldText(block, 'DIRECTION') === 'backward' ? -1 : 1);
          devices.startPair(speed, speed); break;
        }
        case 'spike_start_tank': devices.startPair(speedValue(block, 'LEFT'), speedValue(block, 'RIGHT')); break;
        case 'spike_stop_move': devices.stopPair(); break;
        case 'spike_move_for': case 'spike_steer_for': {
          const amount = num(block, 'AMOUNT');
          const speed = defaultSpeed * (fieldText(block, 'DIRECTION') === 'backward' ? -1 : 1) * (amount < 0 ? -1 : 1);
          const steering = block.type === 'spike_steer_for' ? speedValue(block, 'STEERING') : 0;
          // The simulator uses clockwise positive heading in screen coordinates.
          devices.startPair(steering > 0 ? speed * (1 - steering / 50) : speed, steering < 0 ? speed * (1 + steering / 50) : speed);
          advance(block, devices.duration(amount, fieldText(block, 'UNIT'), speed)); devices.stopPair(); break;
        }
        case 'spike_motor_speed': devices.defaults.set(motorPort(block), speedValue(block, 'SPEED')); break;
        case 'spike_motor_start': case 'spike_motor_for': {
          const port = motorPort(block), speed = (devices.defaults.get(port) ?? 75) * (fieldText(block, 'DIRECTION') === 'counterclockwise' ? -1 : 1);
          const amount = block.type === 'spike_motor_for' ? num(block, 'AMOUNT') : 1;
          devices.active.set(port, speed * (amount < 0 ? -1 : 1));
          if (block.type === 'spike_motor_for') { advance(block, devices.duration(amount, fieldText(block, 'UNIT'), speed)); devices.active.set(port, 0); }
          break;
        }
        case 'spike_motor_stop': devices.active.set(motorPort(block), 0); break;
        case 'spike_motor_reset': devices.resetPosition(motorPort(block), num(block, 'POSITION')); break;
        case 'spike_reset_yaw': devices.yawOffset = num(block, 'ANGLE') - sim.snapshot().robot.heading * 180 / Math.PI; break;
        case 'spike_wait_until': while (!arg(block, 'CONDITION') && !stopped) { tick(block); advance(block, 1 / 60); } break;
        case 'spike_forever': foreverActive = true; while (!stopped) { tick(block); const before = sim.snapshot().t; if (chain(inputBlock(block, 'DO'), depth + 1) === 'break') break; yieldLoop(block, before); } foreverActive = false; break;
        case 'spike_matrix_pattern': {
          const pattern = fieldText(block, 'PATTERN'); if (!/^[0-9]{25}$/.test(pattern)) fail('range', block);
          [...pattern].forEach((v, i) => command(block, { type: 'pixel', x: i % 5, y: Math.floor(i / 5), brightness: Number(v) / 9 * 100 }));
          advance(block, num(block, 'TIME')); command(block, { type: 'clearMatrix' }); break;
        }
        case 'spike_text': {
          for (const letter of String(arg(block, 'TEXT')).slice(0, 100)) {
            const glyph = matrixGlyph(letter);
            glyph.forEach((row, y) => [...row].forEach((v, x) => command(block, { type: 'pixel', x, y, brightness: Number(v) * 100 })));
            advance(block, 0.25);
          }
          break;
        }
        case 'spike_move_default': case 'spike_move': command(block, { type: 'move', distanceMm: num(block, 'DISTANCE') * 10, speedPercent: inputBlock(block, 'SPEED') ? num(block, 'SPEED') : defaultSpeed }); break;
        case 'spike_turn': command(block, { type: 'turn', degrees: num(block, 'ANGLE'), speedPercent: num(block, 'SPEED') }); break;
        case 'spike_tank': command(block, { type: 'tank', leftPercent: num(block, 'LEFT'), rightPercent: num(block, 'RIGHT'), durationMs: num(block, 'TIME') * 1000 }); break;
        case 'spike_motor': {
          const port = fieldText(block, 'PORT');
          if (!robot.motors.some((motor) => motor.port === port)) fail('wrongPort', block);
          command(block, { type: 'motor', port, speedPercent: num(block, 'SPEED'), durationMs: num(block, 'TIME') * 1000 }); break;
        }
        case 'spike_speed': defaultSpeed = num(block, 'SPEED'); if (defaultSpeed < 1 || defaultSpeed > 100) fail('range', block); break;
        case 'spike_wait': advance(block, num(block, 'TIME')); break;
        case 'spike_stop': stopped = true; break;
        case 'spike_image': command(block, { type: 'matrix', image: fieldText(block, 'IMAGE') as 'smile' }); break;
        case 'spike_pixel': command(block, { type: 'pixel', x: num(block, 'X'), y: num(block, 'Y'), brightness: num(block, 'BRIGHTNESS') }); break;
        case 'spike_clear': command(block, { type: 'clearMatrix' }); break;
        case 'spike_light': command(block, { type: 'light', color: fieldText(block, 'COLOR') }); break;
        case 'spike_beep': command(block, { type: 'beep', frequency: num(block, 'FREQUENCY'), durationMs: num(block, 'TIME') * 1000 }); break;
        case 'spike_reset_timer': timerStart = sim.snapshot().t; break;
        case 'spike_print': if (output.length < 200) output.push({ t: start, text: String(arg(block, 'VALUE')).slice(0, 1000) }); break;
        case 'variables_set': variables.set(variableId(block), arg(block, 'VALUE')); break;
        case 'math_change': variables.set(variableId(block), numeric(variables.get(variableId(block)) ?? 0, block) + num(block, 'DELTA')); break;
        case 'controls_repeat_ext': {
          const count = Math.max(0, Math.floor(num(block, 'TIMES')));
          if (count > 1000) fail('limit', block);
          for (let i = 0; i < count && !stopped; i++) { tick(block); if (chain(inputBlock(block, 'DO'), depth + 1) === 'break') break; }
          break;
        }
        case 'controls_whileUntil': {
          while (!stopped && (fieldText(block, 'MODE') === 'UNTIL' ? !arg(block, 'BOOL') : Boolean(arg(block, 'BOOL')))) {
            tick(block); const before = sim.snapshot().t; if (chain(inputBlock(block, 'DO'), depth + 1) === 'break') break; yieldLoop(block, before);
          }
          break;
        }
        case 'controls_for': {
          const from = num(block, 'FROM'), to = num(block, 'TO'), magnitude = Math.abs(num(block, 'BY'));
          if (magnitude === 0) fail('range', block);
          const step = from <= to ? magnitude : -magnitude;
          for (let value = from; (step > 0 ? value <= to : value >= to) && !stopped; value += step) {
            tick(block); variables.set(variableId(block), value);
            if (chain(inputBlock(block, 'DO'), depth + 1) === 'break') break;
          }
          break;
        }
        case 'controls_if': {
          let taken = false;
          for (let i = 0; inputBlock(block, `IF${i}`); i++) if (arg(block, `IF${i}`)) {
            const flow = chain(inputBlock(block, `DO${i}`), depth + 1); if (flow) return flow;
            taken = true; break;
          }
          if (!taken) { const flow = chain(inputBlock(block, 'ELSE'), depth + 1); if (flow) return flow; }
          break;
        }
        case 'controls_flow_statements': return fieldText(block, 'FLOW') === 'BREAK' ? 'break' : 'continue';
        case 'procedures_callnoreturn': {
          const name = String(block.extraState?.name ?? fieldText(block, 'NAME'));
          const definition = functions.get(name) ?? fail('unknownFunction', block);
          const params = definition.extraState?.params;
          const previous = new Map(variables);
          if (Array.isArray(params)) params.forEach((param: { name?: string; id?: string }, index: number) => {
            const id = param.id ?? program.variables?.find((item) => item.name === param.name)?.id ?? param.name ?? '';
            variables.set(id, arg(block!, `ARG${index}`));
          });
          chain(inputBlock(definition, 'STACK'), depth + 1);
          if (Array.isArray(params)) params.forEach((param: { name?: string; id?: string }) => {
            const id = param.id ?? program.variables?.find((item) => item.name === param.name)?.id ?? param.name ?? '';
            if (previous.has(id)) variables.set(id, previous.get(id)!); else variables.delete(id);
          });
          break;
        }
        default: fail('unsupported', block);
      }
      if (trace.length < 5000 && !['controls_repeat_ext', 'controls_whileUntil', 'controls_for', 'controls_if', 'procedures_callnoreturn'].includes(block.type)) trace.push({ blockId: block.id ?? '', start, end: sim.snapshot().t, variables: scopeValues() });
    }
    return undefined;
  };
  try {
    if (!visualProgramSchema.safeParse(program).success) fail('unsupported');
    if(requiresLive(program))fail('liveOnly');
    for (const variable of program.variables ?? []) variables.set(variable.id, 0);
    for (const block of program.blocks.blocks) if (block.type === 'procedures_defnoreturn') functions.set(fieldText(block, 'NAME'), block);
    const starts = program.blocks.blocks.filter((block) => block.type === 'spike_start' && block.enabled !== false);
    if (starts.length !== 1) fail('missingStart');
    chain(starts[0]);
    return { result: sim.run([]), trace, output, usedBlocks: [...usedBlocks], variables: scopeValues() };
  } catch (error) {
    if (error instanceof PreviewComplete) return { result:sim.run([]), trace, output, limitedPreview:true, usedBlocks:[...usedBlocks], variables:scopeValues() };
    return { result: sim.run([]), trace, output, usedBlocks:[...usedBlocks], variables:scopeValues(), error: error instanceof ProgramError ? { code: error.code, blockId: error.blockId } : { code: error instanceof SimulationTimeLimit ? 'limit' : 'unsupported' } };
  }
}
