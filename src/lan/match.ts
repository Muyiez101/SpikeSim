import { MatchRunner, type MatchSensors } from './program';
import type { VisualProgram } from '../editor/program';
import { sumoRulesSchema, type SumoRules } from './rules';

type Body = { x:number; y:number; heading:number; vx:number; vy:number; omega:number; wheels:[number,number] };
export type MatchFrame = { time:number; robots:{x:number;y:number;heading:number;activeId?:string;error?:string}[]; winner:number|null; reason:'ring-out'|'time'|'program-error'|'disconnect'|'cancelled'|null; finished:boolean };
const rad=Math.PI/180;
const approach=(current:number,target:number,limit:number)=>current+Math.max(-limit,Math.min(limit,target-current));
/** Authoritative planar rigid-body match, in centimetres. Equal chassis, tyre
 * acceleration and contact response are shared by every client. */
export class SumoMatch {
  readonly bodies:Body[]=[{x:0,y:-38,heading:0,vx:0,vy:0,omega:0,wheels:[0,0]},{x:0,y:38,heading:180,vx:0,vy:0,omega:0,wheels:[0,0]}];
  private runners:MatchRunner[]; private time=0; private winner:number|null=null; private reason:MatchFrame['reason']=null;
  readonly rules: SumoRules;
  constructor(programs:[VisualProgram,VisualProgram],rules:Partial<SumoRules>={}){
    this.rules=sumoRulesSchema.parse(rules);
    this.bodies[0].y=-this.rules.radiusCm*.38;this.bodies[1].y=this.rules.radiusCm*.38;
    this.runners=programs.map((p,i)=>new MatchRunner(p,this.bodies[i].heading));
  }
  private sensors(index:number):MatchSensors{
    const b=this.bodies[index],other=this.bodies[1-index],a=b.heading*rad,dx=other.x-b.x,dy=other.y-b.y;
    const forward=dx*Math.sin(a)+dy*Math.cos(a),side=dx*Math.cos(a)-dy*Math.sin(a);
    const distance=forward>8&&Math.abs(side)<12?Math.max(0,forward-16):-1;
    const colors=[-3,3].map(x=>{const px=b.x+Math.cos(a)*x+Math.sin(a)*9,py=b.y-Math.sin(a)*x+Math.cos(a)*9,r=Math.hypot(px,py);return r>this.rules.radiusCm?'none':r>this.rules.radiusCm-8?'red':'white';}) as [string,string];
    return {time:this.time,heading:b.heading,distance,colors,wheels:[...b.wheels]};
  }
  private contact(){
    const [a,b]=this.bodies,axes=[a.heading*rad,b.heading*rad].flatMap(t=>[[Math.cos(t),-Math.sin(t)],[Math.sin(t),Math.cos(t)]]);
    let depth=Infinity,normal=[0,0];
    const radius=(body:Body,n:number[])=>{const t=body.heading*rad;return 7*Math.abs(n[0]*Math.cos(t)-n[1]*Math.sin(t))+8*Math.abs(n[0]*Math.sin(t)+n[1]*Math.cos(t));};
    for(const axis of axes){const projection=(b.x-a.x)*axis[0]+(b.y-a.y)*axis[1],overlap=radius(a,axis)+radius(b,axis)-Math.abs(projection);if(overlap<=0)return;if(overlap<depth){depth=overlap;normal=axis.map(v=>v*(projection<0?-1:1));}}
    a.x-=normal[0]*depth/2;a.y-=normal[1]*depth/2;b.x+=normal[0]*depth/2;b.y+=normal[1]*depth/2;
    const relative=(b.vx-a.vx)*normal[0]+(b.vy-a.vy)*normal[1];
    if(relative<0){const impulse=-relative*.51;a.vx-=impulse*normal[0];a.vy-=impulse*normal[1];b.vx+=impulse*normal[0];b.vy+=impulse*normal[1];}
  }
  step(dt=1/60):MatchFrame{
    if(this.reason)return this.frame();
    dt=Math.min(dt,this.rules.timeLimitSeconds-this.time);
    this.runners.forEach((runner,i)=>runner.step(this.sensors(i)));
    const errors=this.runners.map(r=>Boolean(r.error));
    if(errors.some(Boolean)){this.reason='program-error';this.winner=errors.every(Boolean)?null:errors[0]?1:0;return this.frame();}
    for(let sub=0;sub<2;sub++){
      const step=dt/2;
      this.bodies.forEach((b,i)=>{const r=this.runners[i],left=r.left*.45,right=r.right*.45,a=b.heading*rad,velocity=(left+right)/2;
        b.vx=approach(b.vx,Math.sin(a)*velocity,120*step);b.vy=approach(b.vy,Math.cos(a)*velocity,120*step);b.omega=approach(b.omega,(left-right)/14,8*step);
        b.x+=b.vx*step;b.y+=b.vy*step;b.heading+=b.omega/rad*step;b.wheels[0]+=left*step/(5.6*Math.PI)*360;b.wheels[1]+=right*step/(5.6*Math.PI)*360;
      });
      this.contact();this.time+=step;
      const out=this.bodies.map(b=>Math.hypot(b.x,b.y)>this.rules.radiusCm);
      if(out.some(Boolean)){this.reason='ring-out';this.winner=out.every(Boolean)?null:out[0]?1:0;break;}
    }
    if(!this.reason&&this.time+1e-9>=this.rules.timeLimitSeconds){this.time=this.rules.timeLimitSeconds;this.reason='time';}
    return this.frame();
  }
  frame():MatchFrame{return {time:this.time,robots:this.bodies.map((b,i)=>({x:b.x,y:b.y,heading:b.heading,activeId:this.runners[i].activeId,error:this.runners[i].error})),winner:this.winner,reason:this.reason,finished:Boolean(this.reason)};}
}
