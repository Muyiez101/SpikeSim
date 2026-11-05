// @vitest-environment node
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect} from 'vitest';
import type {FieldGoal,GoalProgress} from './schemas';

function physicalGoal(goal:FieldGoal){
  let now=1000;
  class Point{constructor(public x=0,public y=0,public z=0){}clone(){return new Point(this.x,this.y,this.z);}static Distance(a:Point,b:Point){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}}
  class Rotation{constructor(public y=0,public w=.99999){}clone(){return new Rotation(this.y,this.w);}toEulerAngles(){return {y:0};}static Dot(a:Rotation,b:Rotation){return a.y*b.y+a.w*b.w;}}
  const position=new Point(0,2,0),rotation=new Rotation();
  const mesh={id:'load',getAbsolutePosition:()=>position,absoluteRotationQuaternion:rotation,computeWorldMatrix:()=>{},getBoundingInfo:()=>({boundingBox:{extendSizeWorld:{scale:()=>new Point(4,4,4)}}}),isDisposed:()=>false};
  const body={position:new Point(),getAbsolutePosition:()=>new Point(),rotationQuaternion:new Rotation(),absoluteRotationQuaternion:new Rotation()};
  const progress:GoalProgress[]=[];
  const window={} as {spikeField:{init:(send:(type:string,data:GoalProgress)=>void)=>void;reset:(design:unknown,goal:FieldGoal)=>void;start:()=>void;frame:(running:boolean)=>void;stop:(complete:boolean)=>void}};
  runInNewContext(readFileSync(new URL('../../public/gears/student-field.js',import.meta.url),'utf8'),{window,performance:{now:()=>now},document:{getElementById:()=>({addEventListener:()=>{}})},robot:{body,components:[],processedOptions:{wheelDiameter:5.6}},babylon:{world:{},getMaterial:()=>({}),scene:{getPhysicsEngine:()=>({getImpostors:()=>[{object:mesh,physicsBody:{},getParam:()=>35}]})}},BABYLON:{Vector3:Point,Quaternion:Rotation,MeshBuilder:{CreateTorus:()=>({position:{set:()=>{}},isDisposed:()=>false,dispose:()=>{}})}}});
  window.spikeField.init((type,data)=>{if(type==='goal-progress')progress.push(data);});
  const reset=()=>window.spikeField.reset({motors:[]},goal);reset();window.spikeField.start();
  return {step:(height:number)=>{position.y=height;now+=80;window.spikeField.frame(true);},reset,finish:()=>window.spikeField.stop(true),read:()=>progress.at(-1)!};
}
describe('physical objective evidence',()=>{
  const lift:FieldGoal={scene:'custom',target:'load',action:'lift',amount:3};
  it('requires a sustained stable lift and revokes it when the load drops',()=>{
    const run=physicalGoal(lift);
    run.step(6);expect(run.read().passed).toBe(false);
    for(let i=0;i<7;i++)run.step(6);
    expect(run.read().passed).toBe(true);
    run.step(2);expect(run.read().passed).toBe(false);
  });
  it('does not reward moving through a target and ignores tiny quaternion scale errors',()=>{
    const run=physicalGoal(lift);
    for(let i=0;i<15;i++)run.step(6+i);
    expect(run.read().passed).toBe(false);
    for(let i=0;i<8;i++)run.step(21);
    expect(run.read().passed).toBe(true);
    run.finish();expect(run.read().running).toBe(false);expect(run.read().passed).toBe(true);
    run.reset();expect(run.read().passed).toBe(false);
  });
  it('a stationary unchanged load cannot satisfy lifting',()=>{
    const run=physicalGoal(lift);
    for(let i=0;i<20;i++)run.step(2);
    expect(run.read().passed).toBe(false);
  });
});
