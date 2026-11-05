import { z } from 'zod';
import type { SimCommand } from '../sim/types';

export const supportedBlocks = [
  'spike_when_color','spike_when_distance','spike_when_force','spike_when_button','spike_when_timer','spike_when_condition','spike_when_message','spike_broadcast',
  'spike_reflection','spike_reflection_compare','spike_button_pressed','spike_angle','spike_motor_speed_value','spike_motor_absolute',
  'spike_distance_lights',
  'spike_move_for', 'spike_steer_for', 'spike_start_move', 'spike_start_tank', 'spike_stop_move', 'spike_pair', 'spike_wheel_distance', 'spike_motor_for', 'spike_motor_start', 'spike_motor_stop', 'spike_motor_speed', 'spike_motor_position', 'spike_motor_reset', 'spike_wait_until', 'spike_forever', 'spike_color_is', 'spike_distance_compare', 'spike_force_pressed', 'spike_reset_yaw', 'spike_matrix_pattern', 'spike_text',
  'spike_start', 'spike_move', 'spike_move_default', 'spike_turn', 'spike_tank', 'spike_speed', 'spike_motor',
  'spike_wait', 'spike_stop', 'spike_image', 'spike_pixel', 'spike_clear', 'spike_light', 'spike_beep',
  'spike_distance', 'spike_color', 'spike_force', 'spike_heading', 'spike_timer', 'spike_reset_timer', 'spike_print',
  'controls_repeat_ext', 'controls_whileUntil', 'controls_if', 'controls_for', 'controls_flow_statements',
  'math_number', 'math_arithmetic', 'math_modulo', 'math_single', 'math_round', 'math_random_int',
  'logic_compare', 'logic_operation', 'logic_negate', 'logic_boolean',
  'text', 'text_join', 'text_length', 'variables_get', 'variables_set', 'math_change',
  'procedures_defnoreturn', 'procedures_callnoreturn',
] as const;

export type BlockType = typeof supportedBlocks[number];
export type BlockState = {
  type: BlockType;
  id?: string;
  x?: number;
  y?: number;
  deletable?: boolean;
  enabled?: boolean;
  disabledReasons?: string[];
  fields?: Record<string, unknown>;
  inputs?: Record<string, { block?: BlockState; shadow?: BlockState }>;
  next?: { block?: BlockState; shadow?: BlockState };
  extraState?: Record<string, unknown>;
};
export type VisualProgram = {
  blocks: { languageVersion: number; blocks: BlockState[] };
  variables?: { id: string; name: string; type?: string }[];
};

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const blockTypes = new Set<string>(supportedBlocks);
export const maxVisualBlocks = 300;

function validProgram(value: unknown): value is VisualProgram {
  if (!object(value) || Object.keys(value).some((key) => !['blocks', 'variables'].includes(key))) return false;
  if (!object(value.blocks) || value.blocks.languageVersion !== 0 || !Array.isArray(value.blocks.blocks)) return false;
  let entries = 0;
  const boundedJson = (item: unknown, depth: number): boolean => {
    if (depth > 1000 || ++entries > 20000) return false;
    if (typeof item === 'number') return Number.isFinite(item) && Math.abs(item) < 1e12;
    if (typeof item === 'string') return item.length <= 2000;
    if (item === null || typeof item === 'boolean') return true;
    if (Array.isArray(item)) return item.length <= 600 && item.every((child) => boundedJson(child, depth + 1));
    return object(item) && Object.entries(item).every(([key, child]) => !['__proto__', 'constructor', 'prototype'].includes(key) && boundedJson(child, depth + 1));
  };
  if (!boundedJson(value, 0)) return false;
  if (value.variables !== undefined && (!Array.isArray(value.variables) || value.variables.length > 100
    || !value.variables.every((variable) => object(variable) && typeof variable.id === 'string' && typeof variable.name === 'string' && variable.name.length <= 80))) return false;
  let count = 0;
  const ids = new Set<string>();
  const checkBlock = (block: unknown, depth: number): boolean => {
    if (!object(block) || typeof block.type !== 'string' || !blockTypes.has(block.type) || depth > maxVisualBlocks + 1 || ++count > maxVisualBlocks * 4) return false;
    if (block.id !== undefined) {
      if (typeof block.id !== 'string' || !block.id || block.id.length > 100 || ids.has(block.id)) return false;
      ids.add(block.id);
    }
    if (['x', 'y'].some(key => block[key] !== undefined && typeof block[key] !== 'number')) return false;
    if (['enabled', 'deletable', 'movable', 'editable', 'collapsed', 'inline'].some(key => block[key] !== undefined && typeof block[key] !== 'boolean')) return false;
    if (block.disabledReasons !== undefined && (!Array.isArray(block.disabledReasons) || !block.disabledReasons.every(value => typeof value === 'string'))) return false;
    if (block.fields !== undefined && (!object(block.fields) || !Object.entries(block.fields).every(([key, value]) =>
      key === 'VAR' ? typeof value === 'string' || object(value) && typeof value.id === 'string' : ['string', 'number', 'boolean'].includes(typeof value)))) return false;
    if (block.extraState !== undefined) {
      if (!object(block.extraState)) return false;
      const extra = block.extraState;
      if (extra.name !== undefined && typeof extra.name !== 'string') return false;
      if (extra.params !== undefined && (!Array.isArray(extra.params) || extra.params.length > 20 || !extra.params.every(param =>
        typeof param === 'string' || object(param) && typeof param.name === 'string' && (param.id === undefined || typeof param.id === 'string')))) return false;
      for (const key of ['itemCount', 'elseIfCount']) if (extra[key] !== undefined && (typeof extra[key] !== 'number' || !Number.isInteger(extra[key]) || extra[key] < 0 || extra[key] > 30)) return false;
      if (extra.hasElse !== undefined && typeof extra.hasElse !== 'boolean') return false;
    }
    const connection = (input: unknown) => object(input)
      && (input.block === undefined || checkBlock(input.block, depth + 1))
      && (input.shadow === undefined || checkBlock(input.shadow, depth + 1));
    if (block.inputs !== undefined && (!object(block.inputs) || !Object.values(block.inputs).every(connection))) return false;
    return block.next === undefined || connection(block.next);
  };
  return value.blocks.blocks.every((block) => checkBlock(block, 0)) && countProgramBlocks(value as VisualProgram) <= maxVisualBlocks;
}

export const visualProgramSchema = z.custom<VisualProgram>(validProgram, { message: 'Unsupported or oversized block program' });
export const inputBlock = (block: BlockState, name: string) => block.inputs?.[name]?.block ?? block.inputs?.[name]?.shadow;
export const nextBlock = (block: BlockState) => block.next?.block;
export const fieldText = (block: BlockState, name: string, fallback = '') => String(block.fields?.[name] ?? fallback);
export const variableId = (block: BlockState) => {
  const field = block.fields?.VAR;
  return object(field) && typeof field.id === 'string' ? field.id : typeof field === 'string' ? field : '';
};
export const literal = (number: number): { shadow: BlockState } => ({ shadow: { type: 'math_number', fields: { NUM: number } } });

export function fromCommands(commands: SimCommand[]): VisualProgram {
  const start: BlockState = { type: 'spike_start', id: 'program-start', x: 50, y: 50, deletable: false };
  let tail = start;
  for (const [index, command] of commands.entries()) {
    let block: BlockState;
    switch (command.type) {
      case 'move': block = { type: 'spike_move', inputs: { DISTANCE: literal(command.distanceMm / 10), SPEED: literal(command.speedPercent) } }; break;
      case 'turn': block = { type: 'spike_turn', inputs: { ANGLE: literal(command.degrees), SPEED: literal(command.speedPercent) } }; break;
      case 'tank': block = { type: 'spike_tank', inputs: { LEFT: literal(command.leftPercent), RIGHT: literal(command.rightPercent), TIME: literal(command.durationMs / 1000) } }; break;
      case 'wait': block = { type: 'spike_wait', inputs: { TIME: literal(command.durationMs / 1000) } }; break;
      case 'stop': block = { type: 'spike_stop' }; break;
      case 'motor': block = { type: 'spike_motor', fields: { PORT: command.port }, inputs: { SPEED: literal(command.speedPercent), TIME: literal(command.durationMs / 1000) } }; break;
      case 'matrix': block = { type: 'spike_image', fields: { IMAGE: command.image } }; break;
      case 'pixel': block = { type: 'spike_pixel', inputs: { X: literal(command.x), Y: literal(command.y), BRIGHTNESS: literal(command.brightness) } }; break;
      case 'clearMatrix': block = { type: 'spike_clear' }; break;
      case 'light': block = { type: 'spike_light', fields: { COLOR: command.color } }; break;
      case 'beep': block = { type: 'spike_beep', inputs: { FREQUENCY: literal(command.frequency), TIME: literal(command.durationMs / 1000) } }; break;
    }
    block.id = `command-${index}`;
    tail.next = { block }; tail = block;
  }
  return { blocks: { languageVersion: 0, blocks: [start] } };
}

export function countProgramBlocks(program: VisualProgram): number {
  let count = 0;
  const visit = (block: BlockState) => {
    if (block.type !== 'spike_start') count++;
    for (const connection of Object.values(block.inputs ?? {})) if (connection.block) visit(connection.block);
    if (block.next?.block) visit(block.next.block);
  };
  program.blocks.blocks.forEach(visit);
  return count;
}
