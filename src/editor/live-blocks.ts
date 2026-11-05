import {en} from '../shared/strings/en';
import type {VisualProgram,BlockState} from './program';
import {sensorColorOptions} from './sensor-colors';
export const eventTypes=['spike_when_color','spike_when_distance','spike_when_force','spike_when_button','spike_when_timer','spike_when_condition','spike_when_message'] as const;
export const isEvent=(type:string)=>type==='spike_start'||eventTypes.some(item=>item===type);
export function requiresLive(program:VisualProgram):boolean{
  const walk=(block:BlockState):boolean=>liveDefinitions.some(item=>item.type===block.type)||Object.values(block.inputs??{}).some(input=>Boolean(input.block&&walk(input.block)))||Boolean(block.next?.block&&walk(block.next.block));
  return program.blocks.blocks.filter(block=>block.type==='spike_start').length>1||program.blocks.blocks.some(walk);
}
const c=en.liveBlocks;
const port={type:'field_dropdown',name:'PORT',options:['A','B','C','D','E','F'].map(p=>[p,p])};
const n=(name:string)=>({type:'input_value',name,check:'Number'});
const choice=(name:string,options:readonly(readonly string[])[])=>({type:'field_dropdown',name,options});
const hat=(type:string,message0:string,args0:unknown[])=>({type,message0,args0,nextStatement:null,style:'event_blocks',inputsInline:true,tooltip:en.blocks.help[type as keyof typeof en.blocks.help]});
const reporter=(type:string,message0:string,args0:unknown[],output:string)=>({type,message0,args0,output,style:'sensor_blocks',inputsInline:true,tooltip:en.blocks.help[type as keyof typeof en.blocks.help]});
export const liveDefinitions=[
  hat('spike_when_color',c.whenColor,[port,{type:'field_dropdown',name:'COLOR',options:sensorColorOptions}]),
  hat('spike_when_distance',c.whenDistance,[port,choice('OP',en.extraBlocks.comparisons),n('DISTANCE')]),
  hat('spike_when_force',c.whenForce,[port]),
  hat('spike_when_button',c.whenButton,[choice('BUTTON',c.buttons)]),
  hat('spike_when_timer',c.whenTimer,[n('TIME')]),
  hat('spike_when_condition',c.whenCondition,[{type:'input_value',name:'CONDITION',check:'Boolean'}]),
  hat('spike_when_message',c.whenMessage,[{type:'field_input',name:'MESSAGE',text:'message1'}]),
  {type:'spike_broadcast',message0:c.broadcast,args0:[{type:'field_input',name:'MESSAGE',text:'message1'}],previousStatement:null,nextStatement:null,style:'event_blocks',tooltip:en.blocks.help.spike_broadcast},
  reporter('spike_reflection',c.reflection,[port],'Number'),
  reporter('spike_reflection_compare',c.reflectionCompare,[port,choice('OP',en.extraBlocks.comparisons),n('VALUE')],'Boolean'),
  reporter('spike_button_pressed',c.buttonPressed,[choice('BUTTON',c.buttons)],'Boolean'),
  reporter('spike_angle',c.angle,[choice('AXIS',c.axes)],'Number'),
  reporter('spike_motor_speed_value',c.motorSpeed,[port],'Number'),
  reporter('spike_motor_absolute',c.motorAbsolute,[port],'Number'),
];
