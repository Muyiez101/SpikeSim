import {fromCommands,literal,visualProgramSchema,type BlockState} from '../editor/program';
import {customKit} from './catalog';
import {designRobot} from '../sim/custom-design';
import {fieldGoalSchema} from './schemas';
import {en} from '../shared/strings/en';
export const sumoScene='world:sumo:fixedDummies';
export const sumoRobot=customKit('pusher')!;
export const sumoDesign=designRobot(sumoRobot);
export const sumoGoal=fieldGoalSchema.parse({scene:sumoScene,action:'clearRing',target:'robot',amount:4});
export function sumoPracticeProgram(){
  const lap=fromCommands([{type:'move',distanceMm:920,speedPercent:35},{type:'wait',durationMs:700},{type:'move',distanceMm:-920,speedPercent:35},{type:'turn',degrees:90,speedPercent:25}]);
  const result=fromCommands([{type:'wait',durationMs:3000},{type:'matrix',image:'check'}]);
  result.blocks.blocks[0].next={block:{type:'controls_repeat_ext',inputs:{TIMES:literal(4),DO:{block:lap.blocks.blocks[0].next!.block}},next:result.blocks.blocks[0].next}};
  let id=0;function identify(b:BlockState){b.id=`sumo-${++id}`;for(const c of Object.values(b.inputs??{})){if(c.block)identify(c.block);if(c.shadow)identify(c.shadow);}if(b.next?.block)identify(b.next.block);}identify(result.blocks.blocks[0]);
  return visualProgramSchema.parse(result);
}
export const sumoPracticeFile=()=>({schemaVersion:1 as const,kind:'spikesim-program' as const,name:en.field.sumoTitle,missionId:null,steps:[],scene:sumoScene,robotTemplate:'custom',robot:sumoDesign,customRobot:sumoRobot,visualProgram:sumoPracticeProgram(),fieldGoal:sumoGoal});
