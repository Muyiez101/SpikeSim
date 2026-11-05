import type { MapFile } from '../sim/schemas';
import type { SimSnapshot,SimEvent,HubEvent } from '../sim/types';
import type { BlockState,VisualProgram } from '../editor/program';
import type { Execution } from './visual-runtime';

/** Mission checks consume actual 3D observations, never an unrelated predicted run. */
export class LiveRun {
  snapshots:SimSnapshot[]=[];
  events:(SimEvent|HubEvent)[]=[];
  output:{t:number;text:string}[]=[];
  usedBlocks=new Set<string>();
  variables:Record<string,number|string|boolean>={};
  private entered=new Set<string>();
  private blocks=new Map<string,BlockState>();
  constructor(private map:MapFile,program:VisualProgram){
    const visit=(b:BlockState)=>{if(b.id)this.blocks.set(b.id,b);Object.values(b.inputs??{}).forEach(i=>{if(i.block)visit(i.block);});if(b.next?.block)visit(b.next.block);};program.blocks.blocks.forEach(visit);
  }
  mark(id:string){
    const node=this.blocks.get(id);if(!node)return;
    const expression=(b:BlockState)=>{this.usedBlocks.add(b.type);Object.entries(b.inputs??{}).filter(([key])=>!/^DO\d*$/.test(key)&&!['ELSE','STACK'].includes(key)).forEach(([,input])=>{if(input.block)expression(input.block);});};expression(node);
  }
  frame(snapshot:SimSnapshot){
    if(this.snapshots.length>=6000)return;
    this.snapshots.push(snapshot);
    for(const zone of this.map.zones){const inside=zone.shape==='circle'?Math.hypot(snapshot.robot.x-zone.x,snapshot.robot.y-zone.y)<=zone.r:Math.abs(snapshot.robot.x-zone.x)<=zone.w/2&&Math.abs(snapshot.robot.y-zone.y)<=zone.h/2;
      if(inside&&!this.entered.has(zone.id)){this.entered.add(zone.id);this.events.push({type:'zoneEnter',data:{zone:zone.id,tags:zone.tags}});}}
  }
  finish():Execution|null{
    const end=this.snapshots.at(-1);if(!end)return null;
    return {result:{end,snapshots:this.snapshots,events:this.events,sensors:end.sensors},trace:[],output:this.output,usedBlocks:[...this.usedBlocks],variables:this.variables};
  }
}
