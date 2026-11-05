import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { generateGearsPython } from '../editor/gears-python';
import type { VisualProgram } from '../editor/program';
import type { MapFile,RobotDesign } from '../sim/schemas';
import type { SimSnapshot } from '../sim/types';
import { toGearsWorld } from '../sim/gears-map';
import { en } from '../shared/strings/en';
import './unified-stage.css';
import { LiveRun } from '../runtime/live-run';
import type { Execution } from '../runtime/visual-runtime';
import { matrixGlyph } from '../sim/matrix-font';
import { practiceWorlds } from '../sim/gears-catalog';
import type {CustomRobot,CustomWorld} from '../sim/custom-design';
import {MatRuler,type Measurement} from './MatRuler';
import {measurementSchema,type MatPoint} from '../challenges/measurement';
import {fieldStateSchema,goalProgressSchema,type FieldGoal,type FieldState,type GoalProgress} from '../challenges/schemas';
import './field-tools.css';

type Status='loading'|'ready'|'running'|'stopped'|'complete'|'error';
type Frame={t:number;x:number;y:number;yaw:number;heading:number;sensors:Record<string,string|number>;hub:SimSnapshot['hub'];wheels:number[];objects:{id:string;x:number;y:number}[];running:boolean};
export function UnifiedStage({map,robot,program,worldFile,template,customRobot,savedRobotName,customWorld,onEditRobot,onTemplateChange,canRun,sound,onSoundChange,onFrame,onActiveBlock,onComplete,onReset,fieldGoal,onFieldState,onGoalProgress,onMeasurement,onUseRoute,sceneName,fixedEquipment=false}: {
  map:MapFile;robot:RobotDesign;program:VisualProgram;worldFile:string|null;template:string;onTemplateChange:(value:string)=>void;canRun:boolean;sound:boolean;sceneName?:string;
  customRobot?:CustomRobot;savedRobotName?:string;customWorld?:CustomWorld;onEditRobot:()=>void;
  fixedEquipment?:boolean;
  onSoundChange?:(value:boolean)=>void;onFrame?:(snapshot:SimSnapshot)=>void;onActiveBlock?:(id:string|undefined)=>void;onComplete?:(execution:Execution)=>void;onReset?:()=>void;
  fieldGoal?:FieldGoal;onFieldState?:(state:FieldState)=>void;onGoalProgress?:(progress:GoalProgress)=>void;onMeasurement?:(measurement:Measurement)=>void;onUseRoute?:(points:MatPoint[],heading:number)=>void;
}) {
  const iframe=useRef<HTMLIFrameElement>(null);
  const [root,setRoot]=useState<string|null>(()=>window.desktop?null:'./gears/');
  const [ready,setReady]=useState(false),[status,setStatus]=useState<Status>('loading');
  const [error,setError]=useState(''),[output,setOutput]=useState<string[]>([]),[elapsed,setElapsed]=useState(0),[expanded,setExpanded]=useState(false);
  const [about,setAbout]=useState(false);
  const [fieldTool,setFieldTool]=useState<'ruler'|'attachments'|null>(null),[attachmentBusy,setAttachmentBusy]=useState(false);
  const [measurement,setMeasurement]=useState<Measurement>({points:[],heading:0,wheelDiameter:5.6});
  const [fieldState,setFieldState]=useState<FieldState>();
  const goal=useRef(fieldGoal);
  const [reloadKey,setReloadKey]=useState(0),[slowLoading,setSlowLoading]=useState(false);
  const configId=useRef(0),previousProgram=useRef(program);
  const runData=useRef<LiveRun|null>(null);
  const callbacks=useRef({onFrame,onActiveBlock,onComplete,onReset,onFieldState,onGoalProgress,onMeasurement});
  useEffect(()=>{callbacks.current={onFrame,onActiveBlock,onComplete,onReset,onFieldState,onGoalProgress,onMeasurement};},[onFrame,onActiveBlock,onComplete,onReset,onFieldState,onGoalProgress,onMeasurement]);
  const world=useMemo(()=>toGearsWorld(map),[map]);
  const targetOrigin=root?new URL(root,location.href).origin:location.origin;
  const send=useCallback((type:string,data:Record<string,unknown>={})=>iframe.current?.contentWindow?.postMessage({channel:'spikesim-3d',type,...data},targetOrigin),[targetOrigin]);
  useEffect(()=>{
    let active=true;if(window.desktop)void window.desktop.getGearsUrl().then(url=>{if(active)setRoot(url);}).catch(()=>setError(en.unified.loadError));
    return()=>{active=false;};
  },[reloadKey]);
  useEffect(()=>{
    if(ready&&status!=='loading')return;
    const timer=window.setTimeout(()=>setSlowLoading(true),20000);
    return()=>window.clearTimeout(timer);
  },[ready,status,reloadKey]);
  useEffect(()=>{
    const listener=(event:MessageEvent)=>{
      if(event.source!==iframe.current?.contentWindow || event.origin!==targetOrigin || event.data?.channel!=='spikesim-3d')return;
      const data=event.data;
      if(data.type==='boot-error'){setReady(false);setError(en.unified.loadError);setStatus('error');setSlowLoading(true);return;}
      if(data.type==='ready'){setReady(true);return;}
      if(data.configId!==configId.current)return;
      if(data.type==='measurement'){const parsed=measurementSchema.safeParse(data);if(parsed.success){setMeasurement(parsed.data);callbacks.current.onMeasurement?.(parsed.data);}}
      if(data.type==='field-state'){const parsed=fieldStateSchema.safeParse(data);if(parsed.success){setFieldState(parsed.data);callbacks.current.onFieldState?.(parsed.data);}}
      if(data.type==='goal-progress'){const parsed=goalProgressSchema.safeParse(data);if(parsed.success)callbacks.current.onGoalProgress?.(parsed.data);}
      if(data.type==='attachment-busy')setAttachmentBusy(Boolean(data.busy));
      if(data.type==='status'){
        setStatus(data.status);
        setSlowLoading(false);
        if(data.status==='ready')setError('');
        if(data.status==='complete'){const result=runData.current?.finish();runData.current=null;if(result)callbacks.current.onComplete?.(result);}
        if(['complete','stopped','error','ready'].includes(data.status))callbacks.current.onActiveBlock?.(undefined);
      }
      if(data.type==='error'){setError(String(data.message));setStatus('error');}
      if(data.type==='output'){setOutput(lines=>[...lines,String(data.text)].slice(-100));runData.current?.output.push({t:runData.current.snapshots.at(-1)?.t??0,text:String(data.text)});}
      if(data.type==='variables'&&runData.current)runData.current.variables=data.values;
      if(data.type==='sound')runData.current?.events.push({type:'sound',data:{t:runData.current.snapshots.at(-1)?.t??0,frequency:data.frequency,durationMs:data.durationMs}});
      if(data.type==='collision')runData.current?.events.push({type:'collision',data:{wall:'3d obstacle'}});
      if(data.type==='block'){callbacks.current.onActiveBlock?.(String(data.id));runData.current?.mark(String(data.id));}
      if(data.type==='frame'){
        const frame=data as Frame;
        if(frame.running)setElapsed(frame.t);
        const snapshot:SimSnapshot={t:frame.t,robot:{x:frame.x*10+map.size.width/2,y:map.size.height/2-frame.y*10,heading:(frame.yaw-90)*Math.PI/180,wheels:frame.wheels,arms:[]},objects:(frame.objects??[]).map(o=>({id:o.id,x:o.x*10+map.size.width/2,y:map.size.height/2-o.y*10,heading:0})),hub:frame.hub,sensors:frame.sensors,events:[]};
        callbacks.current.onFrame?.(snapshot);if(frame.running)runData.current?.frame(snapshot);
      }
    };
    window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener);
  },[targetOrigin,map]);
  useEffect(()=>{goal.current=fieldGoal;if(ready)send('field-goal',{goal:fieldGoal});},[fieldGoal,ready,send]);
  useEffect(()=>{
    if(!ready)return;
    const preset=practiceWorlds.find(item=>item.id===worldFile);
    configId.current++;runData.current=null;
    send('configure',{configId:configId.current,robot,template,fieldGoal:goal.current,hubButtons:[en.liveBlocks.leftButton,en.liveBlocks.rightButton],fieldCopy:{object:en.field.objectLabel,mechanism:en.field.mechanismLabel,magnetic:en.field.magneticLabel,score:en.field.scoreLabel},targetNames:customWorld?.options.studentTargetNames,robotOptions:customRobot?.options,glyphs:Object.fromEntries([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !?-.'].map(c=>[c,matrixGlyph(c)])),...(customWorld?{world:customWorld.options}:preset?{worldName:preset.worldName,worldOptions:preset.options}:worldFile?{worldFile}:{world:world.options,objectIndices:world.objectIndices})});
  },[ready,robot,template,customRobot,customWorld,worldFile,world,send]);
  useEffect(()=>{if(previousProgram.current!==program){send('stop');runData.current=null;}previousProgram.current=program;},[program,send]);
  const run=useCallback(()=>{try{const source=generateGearsPython(program);setError('');setOutput([]);setElapsed(0);runData.current=new LiveRun(map,program);callbacks.current.onReset?.();send('run',{source,sound});}catch{setError(en.unified.programError);}},[program,map,send,sound]);
  const reset=useCallback(()=>{runData.current=null;callbacks.current.onReset?.();send('reset');setElapsed(0);setOutput([]);setError('');},[send]);
  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){send('stop');setExpanded(false);}
      if(event.key==='F5'||(event.ctrlKey&&event.key==='Enter')){event.preventDefault();if(canRun&&ready&&!['loading','running'].includes(status))run();}
      if(event.ctrlKey&&event.key.toLowerCase()==='r'){event.preventDefault();if(ready&&status!=='loading')reset();}
    };
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[send,run,reset,canRun,ready,status]);
  return <section className={`unified-stage${expanded?' unified-expanded':''}`} data-status={status} aria-label={en.unified.simulator}>
    {expanded&&sceneName&&<strong className="unified-scene-name">{sceneName}</strong>}
    <div className="unified-tools">{fixedEquipment?<strong>{robot.name}</strong>:<><label>{en.unified.robot}<select value={template} disabled={status==='running'||status==='loading'} onChange={event=>onTemplateChange(event.target.value)}>{savedRobotName&&<option value="custom">{savedRobotName}</option>}{en.unified.robots.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><button className="sim-btn" onClick={onEditRobot}>{en.design.robot}</button></>}<span role="status">{en.unified.status[status]}</span><span>{elapsed.toFixed(1)} s</span><button className="unified-about" onClick={()=>setAbout(!about)} aria-expanded={about} aria-label={en.unified.about}>ⓘ</button></div>
    <div className="unified-canvas">
      {root&&<iframe key={reloadKey} ref={iframe} title={en.unified.simulator} src={`${root}student.html`} onLoad={()=>send('hello')} sandbox="allow-scripts allow-same-origin allow-downloads allow-modals"/>}
      {(!ready||status==='loading'||slowLoading)&&<div className="unified-loading"><span>{slowLoading?en.unified.slowLoad:en.unified.loading}</span>{slowLoading&&<button className="sim-btn" onClick={()=>{runData.current=null;setReady(false);setStatus('loading');setError('');setSlowLoading(false);setReloadKey(value=>value+1);}}>{en.unified.retry}</button>}</div>}
      {about&&<div className="unified-about-panel"><p>{en.unified.brain}</p><p>{en.unified.credit}</p><a href={`${root??'./gears/'}SPIKESIM-NOTICE.md`} target="_blank" rel="noreferrer">{en.gears.notices}</a> · <a href={`${root??'./gears/'}LICENSE`} target="_blank" rel="noreferrer">{en.gears.license}</a><button onClick={()=>setAbout(false)}>{en.app.close}</button></div>}
      {fieldTool&&<aside className="field-tools-panel" aria-label={fieldTool==='ruler'?en.field.rulerTitle:en.field.attachments}><header><strong>{fieldTool==='ruler'?en.field.rulerTitle:en.field.attachments}</strong><button onClick={()=>{setFieldTool(null);send('measure',{active:false});}}>{en.field.close}</button></header>{fieldTool==='ruler'?<MatRuler measurement={measurement} send={send} onRoute={onUseRoute}/>:<><p>{en.field.attachmentHelp}</p>{(fieldState?.attachments??[]).map(attachment=><fieldset key={attachment.port}><legend>{en.studio.port(attachment.port)} · {en.design.labels[attachment.type as keyof typeof en.design.labels]??attachment.type}</legend><button disabled={attachmentBusy||status==='running'||status==='loading'} onClick={()=>send('attachment-test',{port:attachment.port,speed:15})}>{en.field.jogForward}</button><button disabled={attachmentBusy||status==='running'||status==='loading'} onClick={()=>send('attachment-test',{port:attachment.port,speed:-15})}>{en.field.jogBack}</button></fieldset>)}</>}</aside>}
    </div>
    <div className="unified-controls"><button className="sim-btn sim-btn-run" disabled={!canRun||!ready||status==='loading'||status==='running'} onClick={run}>{en.playground.run}</button><button className="sim-btn" disabled={status!=='running'} onClick={()=>send('stop')}>{en.studio.stop}</button><button className="sim-btn" disabled={!ready||status==='loading'} onClick={reset}>{en.playground.reset}</button><button className="sim-btn" onClick={()=>send('camera',{mode:'top'})}>{en.unified.top}</button><button className="sim-btn" onClick={()=>send('camera',{mode:'follow'})}>{en.unified.follow}</button><button className="sim-btn" aria-pressed={sound} onClick={()=>onSoundChange?.(!sound)}>{en.studio.sound}</button><button className="sim-btn" onClick={()=>setExpanded(!expanded)}>{expanded?en.studio.restoreLayout:en.studio.fullStage}</button></div>
    <div className="field-tool-buttons"><button disabled={!ready||status==='loading'||status==='running'} aria-pressed={fieldTool==='ruler'} onClick={()=>{const open=fieldTool!=='ruler';setFieldTool(open?'ruler':null);send('measure',{active:open});}}>{en.field.ruler}</button><button disabled={!ready||status==='loading'||status==='running'} aria-pressed={fieldTool==='attachments'} onClick={()=>{setFieldTool(fieldTool==='attachments'?null:'attachments');send('measure',{active:false});}}>{en.field.attachments}</button></div>
    {(error||output.length>0)&&<div className="unified-output">{error&&<p role="alert">{error}</p>}{output.map((line,i)=><pre key={i}>{line}</pre>)}</div>}
  </section>;
}
