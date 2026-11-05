import {z} from 'zod';
import {en} from '../shared/strings/en';
import {customWorldSchema, type CustomWorld, type DesignOptions} from '../sim/custom-design';
import {simCommandSchema} from '../sim/schemas';
import {fieldGoalSchema} from './schemas';
import {kitSchema} from './catalog';

export const practiceIds=['push','lift','lever','carry','park'] as const;
export type PracticeId=typeof practiceIds[number];
const taskSchema=z.object({kit:kitSchema,objects:z.array(z.record(z.string(),z.unknown())),goal:fieldGoalSchema,reference:z.array(simCommandSchema)});
const box=(position:number[],size:number[],mass=0,color='#b9e769'):DesignOptions=>({type:'box',position,size,color,physicsOptions:{mass,friction:.6,restitution:0}});
const move=(cm:number)=>({type:'move' as const,distanceMm:cm*10,speedPercent:20});
const wait={type:'wait' as const,durationMs:1800};
const motor=(speed:number,ms:number)=>({type:'motor' as const,port:'C' as const,speedPercent:speed,durationMs:ms});
const target='worldBaseObject_box0';
export const practiceTasks={
  push:taskSchema.parse({kit:'pusher',objects:[box([0,0,2],[6,6,4],40)],goal:{scene:'custom',target,action:'deliver',amount:5,destination:{x:0,y:22}},reference:[move(34),wait]}),
  lift:taskSchema.parse({kit:'forklift',objects:[box([0,0,3.5],[8,7,1],35),box([-3.5,0,1.5],[1,7,3]),box([3.5,0,1.5],[1,7,3])],goal:{scene:'custom',target,action:'lift',amount:3},reference:[move(11),motor(10,600),wait]}),
  lever:taskSchema.parse({kit:'pusher',objects:[{type:'compound',objects:[box([0,0,1],[3,3,2]),{type:'hinge',position:[0,0,1],size:[1,1,1],hide:true,maxForce:.5,speed:0,objects:[box([6,0,0],[14,2,2],30,'#8c78df')]}]},box([-2,8,2],[2,8,4])],goal:{scene:'custom',target:'worldBaseObject_box3',action:'rotate',amount:35},reference:[move(22),move(-4),{type:'wait',durationMs:6000}]}),
  carry:taskSchema.parse({kit:'scoop',objects:[box([0,0,3.5],[22,5,1],25),box([-10.5,0,1.5],[1,5,3]),box([10.5,0,1.5],[1,5,3])],goal:{scene:'custom',target,action:'deliver',amount:6,destination:{x:0,y:22}},reference:[move(9),motor(10,300),move(22),motor(-10,800),move(-12),{type:'wait',durationMs:5000}]}),
  park:taskSchema.parse({kit:'pusher',objects:[],goal:{scene:'custom',target:'robot',action:'reach',amount:5,destination:{x:20,y:5}},reference:[move(30),{type:'turn',degrees:90,speedPercent:20},move(20),wait]}),
};

/** Practice models are original exercises, never substitutes labelled as official FLL missions. */
export function practiceWorld(id:PracticeId,matScene=''):CustomWorld {
  const match=matScene.match(/FLL(201[89]|202[0-5])(?:v2)?\.json(?:\?.*)?$/);
  const imageURL=match?`textures/maps/FLL/FLL${match[1]}.jpg`:'textures/maps/spikesim-practice.svg';
  const task=practiceTasks[id];
  return customWorldSchema.parse({name:en.field.tasks[id].title+(match?` · FLL ${match[1]}`:''),options:{
    imageURL,imageScale:1,wall:true,wallHeight:7.7,groundFriction:1,groundRestitution:0,
    startPosXYZ:[id==='lever'?6:0,-25,0],startRot:0,objects:structuredClone(task.objects),
    studentTask:id,studentMat:matScene,studentTargetNames:{[task.goal.target]:en.field.tasks[id].target},
  }});
}
export function activePractice(world?:CustomWorld):PracticeId|undefined {
  const value=world?.options.studentTask;
  return practiceIds.find(id=>id===value);
}
