import {z} from 'zod';
import fllOptions from '../sim/fll-robot.json' with {type:'json'};
import {customRobotSchema,type CustomRobot} from '../sim/custom-design';
import {competitionFields,practiceWorlds} from '../sim/gears-catalog';
import {en} from '../shared/strings/en';

export const kitSchema=z.enum(['fll','forklift','pusher','scoop','crane','doubleFollower','paintball','maze2','cage','football','WROSport','singleFollower']);
export type RobotKit=z.infer<typeof kitSchema>;
export const familySchema=z.enum(['fll','competition','line','gyro','launcher','sumo','rescue','maze','football','collector','practice']);
export type ChallengeFamily=z.infer<typeof familySchema>;
export function challengeGuide(scene:string){
  let family:ChallengeFamily='practice',kit:RobotKit='singleFollower';
  if(scene.includes('/FLL/')){family='fll';kit='fll';}
  else if(scene.includes('/WRO/')){family='competition';kit=scene.includes('Sport')?'WROSport':'fll';}
  else if(scene.includes('lineFollowing')){family='line';kit='doubleFollower';}
  else if(scene.includes('gyro')){family='gyro';kit='maze2';}
  else if(scene.includes('paintball')||scene.endsWith(':island')){family='launcher';kit='paintball';}
  else if(scene.includes('sumo')){family='sumo';kit='cage';}
  else if(scene.includes('fireRescue')){family='rescue';kit='crane';}
  else if(scene.includes('maze')){family='maze';kit='maze2';}
  else if(scene.includes('football')){family='football';kit='football';}
  else if(scene.endsWith(':collector')){family='collector';kit='scoop';}
  return {family,kit,...en.field.guides[family]};
}
export const challengeScenes=[...competitionFields.map(f=>f.file),...practiceWorlds.map(f=>f.id)];
export function customKit(kit:RobotKit):CustomRobot|undefined{
  if(!['fll','forklift','pusher','scoop'].includes(kit))return;
  const options=structuredClone(fllOptions) as Record<string,unknown>;
  options.bodyEdgeToWheelCenterZ=8;
  const sensors=fllOptions.components.slice(0,3);
  const box=(x:number,y:number,z:number,width:number,height:number,depth:number)=>({type:'Box',position:[x,y,z],rotation:[0,0,0],options:{width,height,depth,mass:20,color:'#b9e769'}});
  if(kit==='pusher')options.components=[...sensors,box(0,-1.7,9,14,2,1.5)];
  if(kit==='forklift'||kit==='scoop'){
    options.bodyEdgeToWheelCenterZ=2;
    const tray=kit==='scoop'?[box(0,-2.3,7,10,.35,8),box(-5,-1.2,7,.5,2.5,8),box(5,-1.2,7,.5,2.5,8)]:[box(0,-1,3,8,.5,1),box(-2,-1,7,1,.4,8),box(2,-1,7,1,.4,8)];
    options.components=[...sensors,{type:'ArmActuator',position:[0,-1.5,6],rotation:[0,0,0],options:{armLength:9,minAngle:kit==='scoop'?-30:0,maxAngle:80,startAngle:0,friction:.8,restitution:0},components:tray}];
  }
  return customRobotSchema.parse({name:en.field.kits[kit],options});
}
