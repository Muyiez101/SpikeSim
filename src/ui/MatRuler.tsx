import {useState} from 'react';
import {en} from '../shared/strings/en';
import {measureRoute,type MatPoint} from '../challenges/measurement';
export type Measurement={points:MatPoint[];heading:number;wheelDiameter:number};
export function MatRuler({measurement,send,onRoute}: {measurement:Measurement;send:(type:string,data?:Record<string,unknown>)=>void;onRoute?:(points:MatPoint[],heading:number)=>void}){
  const [x,setX]=useState('0'),[y,setY]=useState('0');
  const {points,heading,wheelDiameter}=measurement,route=measureRoute(points,heading,wheelDiameter),last=route.segments.at(-1);
  const copy=en.field;
  return <div className="mat-ruler">
    <p>{copy.rulerHelp}</p>
    <div className="field-actions"><button onClick={()=>send('measure-robot')}>{copy.fromRobot}</button><button onClick={()=>send('measure',{active:true,clear:true})}>{copy.clearMeasure}</button></div>
    <form onSubmit={event=>{event.preventDefault();const point={x:Number(x),y:Number(y)};if([point.x,point.y].every(value=>Number.isFinite(value)&&Math.abs(value)<=5000)&&points.length<20)send('measure-points',{points:[...points,point]});}}><label>{copy.x}<input aria-label={copy.x} type="number" min={-5000} max={5000} step="0.1" value={x} onChange={event=>setX(event.target.value)} required/></label><label>{copy.y}<input aria-label={copy.y} type="number" min={-5000} max={5000} step="0.1" value={y} onChange={event=>setY(event.target.value)} required/></label><button type="submit">{copy.addPoint}</button></form>
    {last?<div className="measurement-result" role="status"><strong>{copy.distance(last.distance)}</strong><span>{copy.total(route.total)}</span><span>{copy.turn(last.turn)}</span><span>{copy.wheel(last.wheelDegrees)}</span></div>:<p role="status">{points.length?copy.nextPoint:copy.firstPoint}</p>}
    {route.segments.length>0&&<ol>{route.segments.map((segment,index)=><li key={index}>{copy.segment(segment.turn,segment.distance)}</li>)}</ol>}
    {onRoute&&<button disabled={points.length<2} onClick={()=>onRoute(points,heading)}>{copy.routeBlocks}</button>}
    <p className="field-note">{copy.routeCaution}</p>
  </div>;
}
