import * as Blockly from 'blockly/core';
import * as standardBlocks from 'blockly/blocks';
import * as locale from 'blockly/msg/en';
import { z } from 'zod';
import { en } from '../shared/strings/en';
import { extraDefinitions, extraDefaults, extraCategories } from './extra-blocks';
import {liveDefinitions,eventTypes} from './live-blocks';

const copy = en.blocks;
const number = (name: string) => ({ type: 'input_value', name, check: 'Number' });
const port = (options: string[]) => ({ type: 'field_dropdown', name: 'PORT', options: [...new Set([...options, 'A','B','C','D','E','F'])].map((value) => [value, value]) });
const statement = (type: string, message0: string, args0: unknown[], style = 'movement_blocks') => ({ type, message0, args0, previousStatement: null, nextStatement: null, inputsInline: true, style, tooltip: copy.help[type as keyof typeof copy.help] ?? message0 });
const sensor = (type: string, message0: string, args0: unknown[], output: string) => ({ type, message0, args0, output, style: 'sensor_blocks', tooltip: copy.help[type as keyof typeof copy.help] ?? message0 });

const definitions = [
  ...liveDefinitions,
  ...extraDefinitions,
  { type: 'spike_start', message0: copy.start, nextStatement: null, style: 'event_blocks', tooltip: copy.help.spike_start },
  statement('spike_move', copy.move, [number('DISTANCE'), number('SPEED')]),
  statement('spike_move_default', copy.moveDefault, [number('DISTANCE')]),
  statement('spike_turn', copy.turn, [number('ANGLE'), number('SPEED')]),
  statement('spike_tank', copy.tank, [number('LEFT'), number('RIGHT'), number('TIME')]),
  statement('spike_speed', copy.speed, [number('SPEED')]),
  statement('spike_motor', copy.motor, [port(['A', 'B', 'C']), number('SPEED'), number('TIME')], 'motor_blocks'),
  statement('spike_wait', copy.wait, [number('TIME')], 'loop_blocks'),
  statement('spike_stop', copy.stop, [], 'loop_blocks'),
  statement('spike_image', copy.image, [{ type: 'field_dropdown', name: 'IMAGE', options: [[copy.smile, 'smile'], [copy.heart, 'heart'], [copy.arrow, 'arrow'], [copy.check, 'check']] }], 'light_blocks'),
  statement('spike_pixel', copy.pixel, [number('X'), number('Y'), number('BRIGHTNESS')], 'light_blocks'),
  statement('spike_clear', copy.clear, [], 'light_blocks'),
  statement('spike_light', copy.light, [{ type: 'field_dropdown', name: 'COLOR', options: copy.colorOptions }], 'light_blocks'),
  statement('spike_beep', copy.beep, [number('FREQUENCY'), number('TIME')], 'sound_blocks'),
  sensor('spike_distance', copy.distance, [port(['E', 'F', 'D'])], 'Number'),
  sensor('spike_color', copy.color, [port(['D', 'E', 'F'])], 'String'),
  sensor('spike_force', copy.force, [port(['F', 'E', 'D'])], 'Number'),
  sensor('spike_heading', copy.heading, [], 'Number'),
  sensor('spike_timer', copy.timer, [], 'Number'),
  statement('spike_reset_timer', copy.resetTimer, [], 'sensor_blocks'),
  statement('spike_print', copy.print, [{ type: 'input_value', name: 'VALUE' }], 'text_blocks'),
];
const definitionSchema = z.object({ type: z.string().min(1), message0: z.string().min(1), args0: z.array(z.unknown()).optional() }).passthrough();
let registered = false;
export function registerBlocks() {
  if (registered) return;
  const messages: Record<string, string> = {};
  for (const [key, value] of Object.entries(locale)) if (typeof value === 'string') messages[key] = value;
  Blockly.setLocale(messages);
  Blockly.common.defineBlocks(Object.fromEntries(Object.entries(standardBlocks.blocks).filter(([type]) => !Blockly.Blocks[type])));
  const ifInit=Blockly.Blocks.controls_if.init;
  Blockly.Blocks.controls_if.init=function(this:Blockly.Block){ifInit.call(this);this.setStyle('loop_blocks');};
  Blockly.Msg.CONTROLS_IF_MSG_THEN=en.liveBlocks.then;
  Blockly.defineBlocksWithJsonArray(definitions.map((definition) => definitionSchema.parse(definition)));
  registered = true;
}

export const blockDefaults: Record<string, Record<string, number>> = {
  spike_when_distance:{DISTANCE:15},spike_when_timer:{TIME:1},spike_reflection_compare:{VALUE:50},
  ...extraDefaults,
  spike_move: { DISTANCE: 30, SPEED: 60 }, spike_turn: { ANGLE: 90, SPEED: 40 },
  spike_move_default: { DISTANCE: 30 },
  spike_tank: { LEFT: 50, RIGHT: 50, TIME: 1 }, spike_speed: { SPEED: 60 },
  spike_motor: { SPEED: 50, TIME: 1 }, spike_wait: { TIME: 1 },
  spike_pixel: { X: 2, Y: 2, BRIGHTNESS: 100 }, spike_beep: { FREQUENCY: 440, TIME: 0.3 },
  controls_repeat_ext: { TIMES: 4 }, controls_for: { FROM: 1, TO: 5, BY: 1 },
  math_arithmetic: { A: 10, B: 2 }, math_modulo: { DIVIDEND: 10, DIVISOR: 3 },
  math_single: { NUM: -5 }, math_round: { NUM: 1.5 }, math_random_int: { FROM: 1, TO: 10 },
  logic_compare: { A: 10, B: 20 }, variables_set: { VALUE: 0 }, math_change: { DELTA: 1 },
};
const fieldDefaults: Record<string,Record<string,string>> = {
  spike_when_color:{PORT:'D',COLOR:'red'},spike_when_distance:{PORT:'E'},spike_when_force:{PORT:'F'},spike_reflection:{PORT:'D'},spike_reflection_compare:{PORT:'D'},
  spike_pair:{LEFT:'A',RIGHT:'B'}, spike_distance_lights:{PORT:'E'}, spike_color_is:{PORT:'D',COLOR:'black'},
  spike_distance_compare:{PORT:'E'}, spike_force_pressed:{PORT:'F'},
};
export const toolboxBlock = (type: string): Blockly.serialization.blocks.State & {kind:'block'} => {
  const state: Blockly.serialization.blocks.State & {kind:'block'} = {kind:'block',type};
  if (blockDefaults[type]) state.inputs = Object.fromEntries(Object.entries(blockDefaults[type]).map(([key,value]) => [key,{shadow:{type:'math_number',fields:{NUM:value}}}]));
  if (fieldDefaults[type]) state.fields = fieldDefaults[type];
  if (type === 'spike_text' || type === 'spike_print') state.inputs = {[type === 'spike_text' ? 'TEXT':'VALUE']:{shadow:{type:'text',fields:{TEXT:copy.hello}}}};
  return state;
};
export const toolbox = { kind: 'categoryToolbox', contents: [
  { kind: 'category', name: copy.categories.movement, categorystyle: 'movement_category', contents: ['spike_move', 'spike_turn', 'spike_tank', 'spike_speed', 'spike_move_default'].map(toolboxBlock) },
  { kind: 'category', name: copy.categories.motors, categorystyle: 'motor_category', contents: ['spike_motor'].map(toolboxBlock) },
  { kind: 'category', name: copy.categories.light, categorystyle: 'light_category', contents: ['spike_image', 'spike_pixel', 'spike_clear', 'spike_light'].map(toolboxBlock) },
  { kind: 'category', name: copy.categories.sound, categorystyle: 'sound_category', contents: ['spike_beep'].map(toolboxBlock) },
  { kind: 'category', name: en.liveBlocks.events, categorystyle: 'event_category', contents: ['spike_start',...eventTypes,'spike_broadcast'].map(toolboxBlock) },
  { kind: 'category', name: copy.categories.control, categorystyle: 'loop_category', contents: [toolboxBlock('spike_wait'),toolboxBlock('controls_repeat_ext'),toolboxBlock('controls_if'),{...toolboxBlock('controls_if'),extraState:{hasElse:true}},{...toolboxBlock('controls_whileUntil'),fields:{MODE:'UNTIL'}},...['controls_for','controls_flow_statements','spike_stop'].map(toolboxBlock)] },
  { kind: 'category', name: copy.categories.sensors, categorystyle: 'sensor_category', contents: ['spike_color_is','spike_distance_compare','spike_force_pressed','spike_reflection_compare','spike_button_pressed','spike_distance', 'spike_color', 'spike_force', 'spike_heading', 'spike_timer', 'spike_reset_timer','spike_reflection','spike_angle','spike_motor_speed_value','spike_motor_absolute'].map(toolboxBlock) },
  { kind: 'category', name: copy.categories.operators, categorystyle: 'math_category', contents: ['math_number', 'math_arithmetic', 'math_modulo', 'math_single', 'math_round', 'math_random_int', 'logic_compare', 'logic_operation', 'logic_negate', 'logic_boolean'].map(toolboxBlock) },
  { kind: 'category', name: copy.categories.text, categorystyle: 'text_category', contents: ['text', 'text_join', 'text_length', 'spike_print'].map(toolboxBlock) },
  { kind: 'category', name: copy.categories.variables, categorystyle: 'variable_category', custom: 'VARIABLE' },
  { kind: 'category', name: copy.categories.functions, categorystyle: 'procedure_category', custom: 'PROCEDURE' },
] };
for (const category of toolbox.contents) {
  const key = category.categorystyle?.replace('_category', '');
  if (key && category.contents) category.contents.push(...(extraCategories[key] ?? []).map(toolboxBlock));
}

export function workspaceTheme(dark: boolean) {
  return Blockly.Theme.defineTheme(`spikesim-${dark ? 'dark' : 'light'}`, {
    name: `spikesim-${dark ? 'dark' : 'light'}`, base: Blockly.Themes.Classic, startHats: true,
    fontStyle: { family: 'Atkinson Hyperlegible, sans-serif', size: 12, weight: 'bold' },
    blockStyles: Object.fromEntries(Object.entries({ movement: '#7655d5', motor: '#377ec2', light: '#be4585', sound: '#9954b9', event: '#ac790c', loop: '#b57b0f', sensor: '#14879c', math: '#3a8a67', logic: '#3a8a67', text: '#3a8a67', variable: '#b86d27', procedure: '#bb4567' }).map(([key, color]) => [`${key}_blocks`, { colourPrimary: color, colourSecondary: color, colourTertiary: color }])),
    categoryStyles: Object.fromEntries(Object.entries({ movement: '#7655d5', motor: '#377ec2', light: '#be4585', sound: '#9954b9', event:'#d59b18', loop: '#b57b0f', sensor: '#14879c', math: '#3a8a67', text: '#3a8a67', variable: '#b86d27', procedure: '#bb4567' }).map(([key, colour]) => [`${key}_category`, { colour }])),
    componentStyles: { workspaceBackgroundColour: dark ? '#141d31' : '#f8f9fc', toolboxBackgroundColour: dark ? '#1b253b' : '#ffffff', toolboxForegroundColour: dark ? '#edf1fa' : '#24304d', flyoutBackgroundColour: dark ? '#26314a' : '#eef0f7', flyoutForegroundColour: dark ? '#edf1fa' : '#24304d', flyoutOpacity: 0.97, scrollbarColour: dark ? '#526084' : '#b9c0d3', insertionMarkerColour: '#b9e769', insertionMarkerOpacity: 0.6 },
  });
}
