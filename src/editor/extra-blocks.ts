import { en } from '../shared/strings/en';
import {sensorColorOptions} from './sensor-colors';
const c = en.extraBlocks;
const number = (name: string) => ({ type: 'input_value', name, check: 'Number' });
const dropdown = (name: string, options: readonly (readonly string[])[]) => ({ type: 'field_dropdown', name, options });
const port = (name: string) => dropdown(name, ['A','B','C','D','E','F'].map(p => [p,p]));
export const extraDefinitions = [
  {type:'spike_distance_lights',message0:c.distanceLights,args0:[port('PORT'),number('L0'),number('L1'),number('L2'),number('L3')],previousStatement:null,nextStatement:null,inputsInline:true,style:'light_blocks',tooltip:en.blocks.help.spike_distance_lights},
  { type: 'spike_move_for', message0: c.moveFor, args0: [dropdown('DIRECTION', c.directions), number('AMOUNT'), dropdown('UNIT', c.units)], previousStatement: null, nextStatement: null, inputsInline: true, style: 'movement_blocks', tooltip: en.blocks.help.spike_move_for },
  { type: 'spike_steer_for', message0: c.steerFor, args0: [number('STEERING'), number('AMOUNT'), dropdown('UNIT', c.units)], previousStatement: null, nextStatement: null, inputsInline: true, style: 'movement_blocks', tooltip: en.blocks.help.spike_steer_for },
  { type: 'spike_start_move', message0: c.startMove, args0: [dropdown('DIRECTION', c.directions)], previousStatement: null, nextStatement: null, inputsInline: true, style: 'movement_blocks', tooltip: en.blocks.help.spike_start_move },
  { type: 'spike_start_tank', message0: c.startTank, args0: [number('LEFT'), number('RIGHT')], previousStatement: null, nextStatement: null, inputsInline: true, style: 'movement_blocks', tooltip: en.blocks.help.spike_start_tank },
  { type: 'spike_stop_move', message0: c.stopMove, args0: [], previousStatement: null, nextStatement: null, inputsInline: true, style: 'movement_blocks', tooltip: en.blocks.help.spike_stop_move },
  { type: 'spike_pair', message0: c.pair, args0: [port('LEFT'), port('RIGHT')], previousStatement: null, nextStatement: null, inputsInline: true, style: 'movement_blocks', tooltip: en.blocks.help.spike_pair },
  { type: 'spike_wheel_distance', message0: c.wheelDistance, args0: [number('DISTANCE')], previousStatement: null, nextStatement: null, inputsInline: true, style: 'movement_blocks', tooltip: en.blocks.help.spike_wheel_distance },
  { type: 'spike_motor_for', message0: c.motorFor, args0: [port('PORT'), dropdown('DIRECTION', c.motorDirections), number('AMOUNT'), dropdown('UNIT', c.motorUnits)], previousStatement: null, nextStatement: null, inputsInline: true, style: 'motor_blocks', tooltip: en.blocks.help.spike_motor_for },
  { type: 'spike_motor_start', message0: c.motorStart, args0: [port('PORT'), dropdown('DIRECTION', c.motorDirections)], previousStatement: null, nextStatement: null, inputsInline: true, style: 'motor_blocks', tooltip: en.blocks.help.spike_motor_start },
  { type: 'spike_motor_stop', message0: c.motorStop, args0: [port('PORT')], previousStatement: null, nextStatement: null, inputsInline: true, style: 'motor_blocks', tooltip: en.blocks.help.spike_motor_stop },
  { type: 'spike_motor_speed', message0: c.motorSpeed, args0: [port('PORT'), number('SPEED')], previousStatement: null, nextStatement: null, inputsInline: true, style: 'motor_blocks', tooltip: en.blocks.help.spike_motor_speed },
  { type: 'spike_motor_position', message0: c.motorPosition, args0: [port('PORT')], output: 'Number', inputsInline: true, style: 'sensor_blocks', tooltip: en.blocks.help.spike_motor_position },
  { type: 'spike_motor_reset', message0: c.motorReset, args0: [port('PORT'), number('POSITION')], previousStatement: null, nextStatement: null, inputsInline: true, style: 'motor_blocks', tooltip: en.blocks.help.spike_motor_reset },
  { type: 'spike_wait_until', message0: c.waitUntil, args0: [{type:'input_value', name:'CONDITION', check:'Boolean'}], previousStatement: null, nextStatement: null, inputsInline: true, style: 'loop_blocks', tooltip: en.blocks.help.spike_wait_until },
  { type: 'spike_forever', message0: c.forever, args0: [{type:'input_statement', name:'DO'}], previousStatement: null, nextStatement: null, inputsInline: true, style: 'loop_blocks', tooltip: en.blocks.help.spike_forever },
  { type: 'spike_color_is', message0: c.colorIs, args0: [port('PORT'), {type:'field_dropdown',name:'COLOR',options:sensorColorOptions}], output: 'Boolean', inputsInline: true, style: 'sensor_blocks', tooltip: en.blocks.help.spike_color_is },
  { type: 'spike_distance_compare', message0: c.distanceCompare, args0: [port('PORT'), dropdown('OP', c.comparisons), number('DISTANCE')], output: 'Boolean', inputsInline: true, style: 'sensor_blocks', tooltip: en.blocks.help.spike_distance_compare },
  { type: 'spike_force_pressed', message0: c.forcePressed, args0: [port('PORT')], output: 'Boolean', inputsInline: true, style: 'sensor_blocks', tooltip: en.blocks.help.spike_force_pressed },
  { type: 'spike_reset_yaw', message0: c.resetYaw, args0: [number('ANGLE')], previousStatement: null, nextStatement: null, inputsInline: true, style: 'sensor_blocks', tooltip: en.blocks.help.spike_reset_yaw },
  { type: 'spike_matrix_pattern', message0: c.matrixPattern, args0: [{type:'field_input',name:'PATTERN',text:'0000009090000009000909990'}, number('TIME')], previousStatement: null, nextStatement: null, inputsInline: true, style: 'light_blocks', tooltip: en.blocks.help.spike_matrix_pattern },
  { type: 'spike_text', message0: c.text, args0: [{type:'input_value', name:'TEXT', check:'String'}], previousStatement: null, nextStatement: null, inputsInline: true, style: 'light_blocks', tooltip: en.blocks.help.spike_text },
];
export const extraDefaults = {
  spike_distance_lights: {L0:100,L1:100,L2:100,L3:100},
  "spike_move_for": {
    "AMOUNT": 10
  },
  "spike_steer_for": {
    "STEERING": 0,
    "AMOUNT": 10
  },
  "spike_start_tank": {
    "LEFT": 50,
    "RIGHT": 50
  },
  "spike_wheel_distance": {
    "DISTANCE": 17.6
  },
  "spike_motor_for": {
    "AMOUNT": 1
  },
  "spike_motor_speed": {
    "SPEED": 50
  },
  "spike_motor_reset": {
    "POSITION": 0
  },
  "spike_distance_compare": {
    "DISTANCE": 15
  },
  "spike_reset_yaw": {
    "ANGLE": 0
  },
  "spike_matrix_pattern": {
    "TIME": 1
  }
};
export const extraCategories: Record<string, string[]> = {
  "movement": [
    "spike_move_for",
    "spike_steer_for",
    "spike_start_move",
    "spike_start_tank",
    "spike_stop_move",
    "spike_pair",
    "spike_wheel_distance"
  ],
  "motor": [
    "spike_motor_for",
    "spike_motor_start",
    "spike_motor_stop",
    "spike_motor_speed",
    "spike_motor_reset"
  ],
  "light": [
    "spike_distance_lights",
    "spike_matrix_pattern",
    "spike_text"
  ],
  "loop": [
    "spike_wait_until",
    "spike_forever"
  ],
  "sensor": [
    "spike_motor_position",
    "spike_reset_yaw"
  ]
};
