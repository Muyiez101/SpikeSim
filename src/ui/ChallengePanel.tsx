import {useState} from 'react';
import {en} from '../shared/strings/en';
import {challengeGuide,kitSchema,type RobotKit} from '../challenges/catalog';
import type {FieldGoal,FieldState,GoalProgress} from '../challenges/schemas';
import type {Measurement} from './MatRuler';
import {practiceIds,type PracticeId} from '../challenges/practice';

export function ChallengePanel({scene,field,goal,progress,measurement,robotKit,onRobot,onGoal,practice,onPractice,onExample}: {scene:string;field?:FieldState;goal?:FieldGoal;progress?:GoalProgress;measurement?:Measurement;robotKit?:RobotKit;onRobot:(kit:RobotKit)=>void;onGoal:(goal:FieldGoal)=>void;practice?:PracticeId;onPractice:(id:PracticeId)=>void;onExample:()=>void}){
  const copy=en.field,guide=challengeGuide(scene);
  const [kit,setKit]=useState<RobotKit>(robotKit??guide.kit),[target,setTarget]=useState(goal?.target??''),[action,setAction]=useState<FieldGoal['action']>(goal?.action??'move'),[amount,setAmount]=useState(goal?.amount??8);
  const objects=field?.targets??[],selected=target||objects[0]?.id||'robot',destination=measurement?.points.at(-1),needsPoint=action==='deliver'||action==='reach';
  const current=objects.find(item=>item.id===selected);
  const fieldAction=action==='score'||action==='clearRing';
  const [task,setTask]=useState<PracticeId>(practice??'push');
  return <section className="challenge-panel" aria-label={copy.challenge}>
    <div className="practice-task"><strong>{practice?copy.tasks[practice].title:copy.practiceTitle}</strong><p>{practice?copy.tasks[practice].brief:copy.practiceHelp}</p><div className="field-actions"><label>{copy.practiceTask}<select value={task} onChange={event=>setTask(event.target.value as PracticeId)}>{practiceIds.map(id=><option key={id} value={id}>{copy.tasks[id].title}</option>)}</select></label><button onClick={()=>onPractice(task)}>{copy.openPractice}</button>{practice&&<button onClick={onExample}>{copy.loadReference}</button>}</div>{practice&&<p>{copy.referenceHelp}</p>}</div>
    <strong>{guide.title}</strong><p>{guide.brief}</p>
    <div className="field-actions"><label>{copy.recommended}<select value={kit} onChange={event=>setKit(kitSchema.parse(event.target.value))}>{kitSchema.options.map(id=><option key={id} value={id}>{copy.kits[id]}</option>)}</select></label><button onClick={()=>onRobot(kit)}>{copy.useRobot}</button></div>
    <ul>{guide.steps.map(step=><li key={step}>{step}</li>)}</ul>
    {field?.score!==undefined&&<strong>{field.scoreLabel}: {field.score}</strong>}
    {!objects.length&&field?.score===undefined&&<p>{copy.noObjects}</p>}
    <div className="challenge-goal"><label>{copy.target}<select value={selected} onChange={event=>setTarget(event.target.value)} disabled={!objects.length||fieldAction}><option value="robot">{en.unified.robot}</option>{objects.map(object=><option key={object.id} value={object.id}>{object.label} · X {object.x.toFixed(0)}, Y {object.y.toFixed(0)} cm</option>)}</select></label><label>{copy.action}<select value={action} onChange={event=>{const next=event.target.value as FieldGoal['action'];setAction(next);setAmount(next==='rotate'?20:next==='lift'?3:8);}}>{Object.entries(copy.actions).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>{copy.amount}<input type="number" min={1} max={1000} value={amount} onChange={event=>setAmount(Number(event.target.value))}/></label><button disabled={!Number.isFinite(amount)||amount<1||amount>1000||needsPoint&&!destination||!needsPoint&&!fieldAction&&!current} onClick={()=>onGoal({scene,target:action==='reach'||fieldAction?'robot':selected,action,amount,...(needsPoint?{destination}: {})})}>{copy.setGoal}</button></div>
    {needsPoint&&<p>{destination?`${copy.destination}: X ${destination.x.toFixed(1)}, Y ${destination.y.toFixed(1)} cm`:copy.destination}</p>}
    <p>{copy.goalHelp}</p>
    {goal&&<div className={`challenge-result${progress?.passed?' passed':''}`} role="status"><strong>{progress?.passed?copy.success:copy.goal}</strong><p>{copy.actions[goal.action]} · {['reach','deliver'].includes(goal.action)?copy.within(progress?.value??0,goal.amount):copy.progress(progress?.value??0,goal.amount)}</p></div>}
    <p className="field-note">{copy.modelNote}</p>
  </section>;
}
