import { describe, expect, it } from 'vitest';
import { executeVisualProgram } from './visual-runtime';
import { fromCommands, literal, type BlockState, type VisualProgram } from '../editor/program';
import { examples } from '../editor/examples';
import { mapFiles } from '../sim/maps';
import { robotPresets } from '../sim/presets';
const run = (program: VisualProgram) => executeVisualProgram(program, mapFiles['open-floor'], robotPresets['driving-base']);
const program = (block: BlockState): VisualProgram => ({ blocks: { languageVersion: 0, blocks: [{ type: 'spike_start', next: { block } }] } });

describe('visual program execution', () => {
  it('applies the selected default speed to subsequent default-speed moves', () => {
    const visual = program({ type: 'spike_speed', inputs: { SPEED: literal(20) }, next: { block: { type: 'spike_move_default', inputs: { DISTANCE: literal(20) } } } });
    const slow = run(visual);
    visual.blocks.blocks[0].next!.block!.inputs!.SPEED = literal(60);
    const fast = run(visual);
    expect(slow.result.end.robot.x).toBe(fast.result.end.robot.x);
    expect(slow.result.end.t / fast.result.end.t).toBeCloseTo(3, 1);
  });
  it('executes a repeated square and returns to its starting pose', () => {
    const execution = run(examples.square);
    expect(execution.error).toBeUndefined();
    expect(execution.result.end.robot.x).toBeCloseTo(140, 4);
    expect(execution.result.end.robot.y).toBeCloseTo(300, 4);
    expect(execution.result.end.robot.heading).toBeCloseTo(Math.PI * 2, 4);
    expect(execution.trace.filter(entry => entry.blockId === 'square-move')).toHaveLength(4);
    expect(execution.usedBlocks).toContain('controls_repeat_ext');
  });
  it('reevaluates a changing distance sensor to stop before a wall', () => {
    const execution = run(examples.sensorExample);
    expect(execution.error).toBeUndefined();
    expect(execution.result.end.sensors.E).toBeGreaterThanOrEqual(150);
    expect(execution.result.end.sensors.E).toBeLessThanOrEqual(200);
    expect(execution.result.events.some(event => event.type === 'collision')).toBe(false);
  });
  it('records display, status light, sound and simulation time', () => {
    const execution = run(examples.hello);
    expect(execution.error).toBeUndefined();
    expect(execution.result.end.hub.matrix[2]).toEqual([100, 100, 100, 100, 100]);
    expect(execution.result.end.hub.statusColor).toBe('#a855f7');
    expect(execution.result.end.t).toBeCloseTo(1.3, 2);
    expect(execution.result.events).toContainEqual({ type: 'sound', data: { t: 0, frequency: 440, durationMs: 300 } });
  });
  it('stops an infinite loop and names the offending block', () => {
    const execution = run(program({ type: 'controls_whileUntil', id: 'forever', fields: { MODE: 'WHILE' }, inputs: { BOOL: { block: { type: 'logic_boolean', fields: { BOOL: 'TRUE' } } } } }));
    expect(execution.error?.code).toBe('limit');
    expect(execution.result.end.t).toBeGreaterThan(0);
    expect(execution.result.end.t).toBeLessThanOrEqual(180);
  });
  it('rejects a sensor on the wrong port and a missing input', () => {
    expect(run(program({ type: 'spike_print', inputs: { VALUE: { block: { type: 'spike_distance', id: 'bad-port', fields: { PORT: 'D' } } } } })).error).toEqual({ code: 'wrongPort', blockId: 'bad-port' });
    expect(run(program({ type: 'spike_move', id: 'missing' })).error).toEqual({ code: 'missingInput', blockId: 'missing' });
  });
  it('supports variables, function parameters and global changes', () => {
    const visual = program({ type: 'procedures_callnoreturn', extraState: { name: 'advance' }, inputs: { ARG0: literal(12) } });
    visual.variables = [{ id: 'distance', name: 'distance' }, { id: 'count', name: 'count' }];
    visual.blocks.blocks.push({ type: 'procedures_defnoreturn', fields: { NAME: 'advance' }, extraState: { params: [{ id: 'distance', name: 'distance' }] }, inputs: { STACK: { block: {
      type: 'spike_move', inputs: { DISTANCE: { block: { type: 'variables_get', fields: { VAR: { id: 'distance' } } } }, SPEED: literal(60) }, next: { block: { type: 'math_change', fields: { VAR: { id: 'count' } }, inputs: { DELTA: literal(1) } } },
    } } } });
    const execution = run(visual);
    expect(execution.error).toBeUndefined();
    expect(execution.result.end.robot.x).toBeCloseTo(260, 2);
    expect(execution.variables).toEqual({ distance: 0, count: 1 });
  });
  it('ignores disconnected and disabled movement and stops inside a loop', () => {
    const visual = fromCommands([{ type: 'stop' }, { type: 'move', distanceMm: 300, speedPercent: 60 }]);
    visual.blocks.blocks.push({ type: 'spike_move', inputs: { DISTANCE: literal(60), SPEED: literal(60) } });
    expect(run(visual).result.end.robot.x).toBe(140);
    const disabled = fromCommands([{ type: 'move', distanceMm: 300, speedPercent: 60 }]);
    disabled.blocks.blocks[0].next!.block!.enabled = false;
    expect(run(disabled).result.end.robot.x).toBe(140);
  });
  it('is deterministic, including random values', () => {
    const visual = program({ type: 'spike_print', inputs: { VALUE: { block: { type: 'math_random_int', inputs: { FROM: literal(1), TO: literal(100) } } } } });
    expect(run(visual)).toEqual(run(visual));
  });
  it('uses Python modulo semantics and catches division by zero', () => {
    expect(run(program({ type: 'spike_print', inputs: { VALUE: { block: { type: 'math_modulo', inputs: { DIVIDEND: literal(-5), DIVISOR: literal(3) } } } } })).output[0].text).toBe('1');
    expect(run(program({ type: 'spike_print', inputs: { VALUE: { block: { type: 'math_arithmetic', fields: { OP: 'DIVIDE' }, inputs: { A: literal(1), B: literal(0) } } } } })).error?.code).toBe('divideByZero');
  });
});
