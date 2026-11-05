import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';
import { missions, missionWorldMap, worlds, missionsById } from '../missions/content';
import { missionGoalLabel,checkMission } from '../missions/engine';
import { robotPresets } from '../sim/presets';
import { mapFiles } from '../sim/maps';
import { DeterministicSimulator } from '../sim/engine';
import type { SimCommand, SimSnapshot } from '../sim/types';
import type { Execution } from '../runtime/visual-runtime';
import { fromCommands, countProgramBlocks, type VisualProgram } from '../editor/program';
import { generatePython } from '../editor/python';
import { examples } from '../editor/examples';
import { en } from '../shared/strings/en';
import { SimulatorStage } from './SimulatorStage';
import { maxProgramSteps, type PlaygroundDraft, type WorkspaceId } from '../progress/playground';
import { ProgramStepEditor } from './ProgramStepEditor';
import { ProgramFiles } from './ProgramFiles';
import { SaveConflict } from './SaveConflict';
import { BlockEditor, type BlockEditorHandle } from './BlockEditor';
import type { usePlaygroundDrafts } from './usePlaygroundDrafts';
import './workspace.css';
import { UnifiedStage } from './UnifiedStage';
import { competitionFields, practiceWorlds, sceneTitle } from '../sim/gears-catalog';
import {DesignBuilder} from './DesignBuilder';
import {toGearsWorld} from '../sim/gears-map';
import {ChallengePanel} from './ChallengePanel';
import {challengeGuide} from '../challenges/catalog';
import type {FieldState,GoalProgress} from '../challenges/schemas';
import {measureRoute} from '../challenges/measurement';
import type {Measurement} from './MatRuler';
import {activePractice,practiceTasks} from '../challenges/practice';
import {requiresLive} from '../editor/live-blocks';
import {obstacleScene} from '../challenges/obstacles2';
import {lineCourseReferences} from '../challenges/line-courses';
import {sumoScene} from '../challenges/sumo';

const copy = en.playground;
const studio = en.studio;
type DraftController = ReturnType<typeof usePlaygroundDrafts>;
type EditorMode = 'blocks' | 'python' | 'steps';
type InfoTab = 'mission' | 'sensors' | 'console' | 'explain' | 'challenge';
type SoundControl = { sound?: boolean; onSoundChange?: (value: boolean) => void };

export function RobotWorkspace({ workspace, drafts, sound, onSoundChange,initialBuilder }: { workspace: WorkspaceId; drafts: DraftController;initialBuilder?:'robot'|'world' } & SoundControl) {
  const missionId = drafts.state.selected[workspace];
  return <WorkspaceSession key={`${workspace}:${missionId ?? 'free-play'}:${drafts.resetKey}`} workspace={workspace} missionId={missionId} draft={drafts.getDraft(missionId)} drafts={drafts} sound={sound} onSoundChange={onSoundChange} initialBuilder={initialBuilder} />;
}

function WorkspaceSession({ workspace, missionId, draft, drafts, sound, onSoundChange,initialBuilder }: { workspace: WorkspaceId; missionId: string | null; draft: PlaygroundDraft; drafts: DraftController;initialBuilder?:'robot'|'world' } & SoundControl) {
  const { steps, outcome } = draft;
  const program = useMemo(() => steps.map((step) => step.command), [steps]);
  const [visual, setVisual] = useState<VisualProgram>(() => draft.visualProgram ?? fromCommands(program));
  const [mode, setMode] = useState<EditorMode>(() => {
    try { return !draft.visualProgram && localStorage.getItem('spikesim.editor-mode') === 'steps' ? 'steps' : 'blocks'; }
    catch { return draft.steps.length ? 'steps' : 'blocks'; }
  });
  const [infoTab, setInfoTab] = useState<InfoTab>(draft.scene?'challenge':'mission');
  const [fieldState,setFieldState]=useState<FieldState>(),[goalProgress,setGoalProgress]=useState<GoalProgress>(),[measurement,setMeasurement]=useState<Measurement>();
  const [hintLevel, setHintLevel] = useState(0);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(() => new Set());
  const [validBlocks, setValidBlocks] = useState(true);
  const [split, setSplit] = useState(46);
  const [detailsCollapsed, setDetailsCollapsed] = useState(()=>{if(draft.scene)return false;try{return localStorage.getItem('spikesim.renderer')!=='2d';}catch{return false;}});
  const [renderer,setRenderer]=useState<'3d'|'2d'>(()=>{if(draft.scene||draft.customWorld||initialBuilder||requiresLive(visual))return '3d';try{return localStorage.getItem('spikesim.renderer')==='2d'?'2d':'3d';}catch{return '2d';}});
  const [builder,setBuilder]=useState<'robot'|'world'|null>(initialBuilder??null);
  const scene=draft.scene ?? '';
  const competitionField=competitionFields.find(field=>field.file===scene);
  const customWorld=scene==='custom'?draft.customWorld:undefined;
  const practice=activePractice(customWorld);
  const customRobot=draft.robotTemplate==='custom'?draft.customRobot:undefined;
  const runProgram = useMemo(() => mode === 'steps' ? fromCommands(program) : visual, [mode, program, visual]);
  const [selectedType, setSelectedType] = useState('');
  const [activeId, setActiveId] = useState<string>();
  const [execution, setExecution] = useState<Execution | null>(null);
  const editor = useRef<BlockEditorHandle>(null);
  const layout = useRef<HTMLDivElement>(null);
  const canRun = mode === 'steps' ? invalidFields.size === 0 : validBlocks;
  const mission = missionId ? missionsById[missionId] : null;
  const map = useMemo(() => mission ? missionWorldMap(mission) : mapFiles['open-floor'], [mission]);
  const worldSeed=useMemo(()=>toGearsWorld(map).options,[map]);
  const robot = draft.robot ?? robotPresets[mission?.robotPreset ?? 'driving-base'];
  const [snapshot, setSnapshot] = useState(() => new DeterministicSimulator({ map, robot }).snapshot());
  const activeWorld = mission ? worlds.find((world) => world.id === mission.worldId) : null;
  const worldMissions = activeWorld ? missions.filter((item) => activeWorld.missionIds.includes(item.id)) : [];
  const hintCount = mission?.hints.length ?? 0;
  const hint = mission && hintLevel > 0 ? mission.hints[hintLevel - 1] : null;
  const { setOutcome, updateVisualProgram } = drafts;
  const clearOutcome = useCallback(() => { setOutcome(missionId, null); }, [setOutcome, missionId]);
  const reset3DResult = useCallback(() => { clearOutcome(); setExecution(null); setActiveId(undefined); }, [clearOutcome]);
  const onMissionResult = useCallback((stars: number, goals: { label: string; passed: boolean }[]) => { setOutcome(missionId, { stars, goals }); }, [setOutcome, missionId]);
  const onVisualChange = useCallback((next: VisualProgram, edited: boolean) => {
    setVisual(next);
    if(requiresLive(next))setRenderer('3d');
    if (edited) { updateVisualProgram(missionId, next); setExecution(null); }
  }, [missionId, updateVisualProgram]);
  const onFrame = useCallback((next: SimSnapshot, run: Execution | null, id?: string) => {
    setSnapshot(next); setExecution(run); setActiveId(id);
    if (run?.limitedPreview) setInfoTab('console');
    if (run?.error) { setInfoTab('console'); setDetailsCollapsed(false); }
  }, []);
  const python = useMemo(() => generatePython(visual), [visual]);
  const changeMode = (next: EditorMode) => {
    if (mode === 'steps' && next !== 'steps') setVisual(fromCommands(program));
    setMode(next);
    try { localStorage.setItem('spikesim.editor-mode', next); } catch { /* The editor works without browser storage. */ }
  };
  const addCommand = (command: SimCommand) => {
    if (steps.length < maxProgramSteps) drafts.updateSteps(missionId, [...steps, { id: crypto.randomUUID(), command }]);
  };
  const onValidity = useCallback((fieldId: string, valid: boolean) => {
    setInvalidFields((current) => {
      if (current.has(fieldId) === !valid) return current;
      const next = new Set(current); if (valid) next.delete(fieldId); else next.add(fieldId); return next;
    });
  }, []);
  const removeStep = (id: string) => {
    drafts.updateSteps(missionId, steps.filter((step) => step.id !== id));
    setInvalidFields((current) => new Set([...current].filter((field) => !field.startsWith(`${id}:`))));
  };

  return (
    <div className="robot-workspace">
      <header className="workspace-heading">
        <div><h1>{copy.title}</h1><p>{draft.name ?? mission?.title ?? sceneTitle(scene) ?? studio.noMission}<span> · {mode === 'steps' ? en.catalog.steps(steps.length) : studio.blockCount(countProgramBlocks(visual))}</span></p></div>
        <ProgramFiles draft={draft} canExport={canRun} getDraft={drafts.getDraft} onNamed={(name) => { drafts.nameProgram(missionId, name); }} onImport={(imported) => { setInvalidFields(new Set()); setHintLevel(0); drafts.importProgram(workspace, imported); }} />
      </header>
      <div className="workspace-scene-picker">
        {scene===obstacleScene&&<button className="sim-btn" onClick={()=>{if(countProgramBlocks(visual)>0&&!window.confirm(studio.exampleWarning))return;drafts.openObstacleExample(workspace);}}>{en.field.obstacleExample}</button>}
        {scene===sumoScene&&<button className="sim-btn" onClick={()=>{if(countProgramBlocks(visual)>0&&!window.confirm(studio.exampleWarning))return;drafts.openSumoExample(workspace);}}>{en.field.sumoExample}</button>}
        {lineCourseReferences.some(entry=>entry.scene===scene)&&<button className="sim-btn" onClick={()=>{if(countProgramBlocks(visual)>0&&!window.confirm(studio.exampleWarning))return;drafts.openLineExample(workspace,scene);}}>{en.field.lineExample}</button>}
        <label>{en.unified.world}<select value={customWorld?'custom':missionId?`mission:${missionId}`:scene} onChange={event=>{
          const value=event.target.value;
          setExecution(null);
          if(value==='custom'){drafts.setDraftScene(missionId,value);setRenderer('3d');}
          else if(value.startsWith('mission:')){drafts.setDraftScene(value.slice(8),'');drafts.selectMission(workspace,value.slice(8));}
          else{const free=drafts.getDraft(null);if(customRobot&&!free.customRobot)drafts.saveCustomRobot(null,customRobot);else if(!free.robot||free.robotKit)drafts.applyRobotKit(null,challengeGuide(value).kit);drafts.setScene(value);drafts.selectMission(workspace,null);setRenderer('3d');setInfoTab('challenge');}
        }}>{draft.customWorld&&<option value="custom">{draft.customWorld.name}</option>}<option value="">{en.unified.practice}</option><optgroup label={en.unified.classroom}>{missions.map(m=><option key={m.id} value={`mission:${m.id}`}>{m.title}</option>)}</optgroup><optgroup label={en.unified.challenges}>{practiceWorlds.map(world=><option key={world.id} value={world.id}>{world.name}</option>)}</optgroup><optgroup label={en.unified.competition}>{competitionFields.map(field=><option key={field.file} value={field.file}>{field.name}{field.content==='mat-only'?en.unified.matOnlySuffix:''}</option>)}</optgroup></select></label>
        <button onClick={()=>setBuilder('world')}>{en.design.world}</button>
        <div className="simulation-view">{(['3d','2d'] as const).map(view=><button key={view} disabled={view==='2d'&&(Boolean(scene)||requiresLive(visual))} aria-pressed={renderer===view} onClick={()=>{setRenderer(view);try{localStorage.setItem('spikesim.renderer',view);}catch{/* Session choice still works. */}}}>{view==='3d'?en.unified.threeD:en.unified.twoD}</button>)}</div>
        {competitionField&&<p className="workspace-field-note" role="status">{competitionField.content==='mat-only'?en.unified.matOnlyBrief:en.unified.modelsBrief}</p>}
      </div>
      <div className="workspace-body" ref={layout} style={{ '--editor-share': `${split}%` } as CSSProperties}>
        <section className="workspace-editor pg-left" aria-label={copy.title}>
          <div className="workspace-editor-heading">
            <div className="workspace-tabs" role="tablist" aria-label={copy.title}>
              {(['blocks', 'python', ...(!draft.visualProgram ? ['steps'] as const : [])] as EditorMode[]).map((item) => <button key={item} role="tab" aria-selected={mode === item} onClick={() => changeMode(item)}>{studio[item]}</button>)}
            </div>
            {mode !== 'steps' && <div className="workspace-examples">
              <select value="" aria-label={studio.examples} onChange={(event) => { if (window.confirm(studio.exampleWarning)) { editor.current?.load(examples[event.target.value]); setMode('blocks'); } }}><option value="" disabled>{studio.examples}</option>{['square', 'hello', 'sensorExample'].map((key) => <option key={key} value={key}>{studio[key as 'square' | 'hello' | 'sensorExample']}</option>)}</select>
              <button onClick={() => { if (window.confirm(studio.clearQuestion + ' ' + studio.clearHint)) editor.current?.clear(); }}>{studio.clear}</button>
            </div>}
          </div>
          {drafts.saveStatus === 'conflict' ? <SaveConflict drafts={drafts} /> : <div className={`workspace-save pg-save-status pg-save-${drafts.saveStatus}`} role={drafts.saveStatus === 'error' ? 'alert' : 'status'}>{copy.saveStatus[drafts.saveStatus]}{drafts.saveStatus === 'error' && <button className="pg-save-retry" onClick={drafts.retrySave}>{copy.retrySave}</button>}</div>}
          {mode !== 'steps' && <div className="workspace-canvas-slot" hidden={mode === 'python'}><BlockEditor ref={editor} initial={visual} onChange={onVisualChange} onSelect={setSelectedType} onValidity={setValidBlocks} activeId={activeId} /></div>}
          {mode === 'python' && <div className="workspace-python"><p>{studio.pythonHint}</p><pre aria-label={studio.python}>{python.map((line, index) => <button key={index} className={line.blockId === activeId ? 'python-active' : ''} onClick={() => { if (line.blockId) { setMode('blocks'); editor.current?.select(line.blockId); } }}><span>{index + 1}</span><code>{line.text || ' '}</code></button>)}</pre></div>}
          {mode === 'steps' && <div className="simple-steps">
            {steps.length > 0 && <p className="pg-edit-hint">{copy.editHint}</p>}
            <div className="pg-program">{steps.length === 0 ? <p className="pg-empty">{copy.empty}</p> : steps.map((step, index) => <ProgramStepEditor key={step.id} step={step} index={index} onValidity={onValidity} onChange={(command) => drafts.updateSteps(missionId, steps.map((item) => item.id === step.id ? { ...item, command } : item))} onRemove={() => removeStep(step.id)} />)}</div>
            {!canRun && <p className="pg-field-error" role="alert">{copy.fixFields}</p>}
            <fieldset className="pg-palette" disabled={steps.length >= maxProgramSteps} aria-label={en.workspace.palette}>
              <button onClick={() => addCommand({ type: 'move', distanceMm: 300, speedPercent: 60 })}>{copy.moveForward}</button><button onClick={() => addCommand({ type: 'move', distanceMm: -300, speedPercent: 60 })}>{copy.moveBack}</button>
              <button onClick={() => addCommand({ type: 'turn', degrees: 90, speedPercent: 40 })}>{copy.turnRight}</button><button onClick={() => addCommand({ type: 'turn', degrees: -90, speedPercent: 40 })}>{copy.turnLeft}</button>
              <button onClick={() => addCommand({ type: 'turn', degrees: 45, speedPercent: 40 })}>{copy.turnHalf}</button><button onClick={() => addCommand({ type: 'wait', durationMs: 1000 })}>{copy.wait}</button>
            </fieldset>
            <button className="pg-clear" onClick={() => { drafts.updateSteps(missionId, []); setInvalidFields(new Set()); }} disabled={steps.length === 0}>{copy.clear}</button>
          </div>}
        </section>
        <div className="workspace-resizer" role="separator" aria-label={studio.resize} aria-orientation="vertical" aria-valuemin={38} aria-valuemax={62} aria-valuenow={split} tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setSplit((value) => Math.max(38, Math.min(62, value + (event.key === 'ArrowRight' ? 2 : -2)))); } }}
          onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
          onPointerMove={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId) || !layout.current) return; const rect = layout.current.getBoundingClientRect(); setSplit(Math.max(38, Math.min(62, (event.clientX - rect.left) / rect.width * 100))); }}
          onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)} />
        <section className="workspace-simulation">
          {builder?<section className="unified-stage"><p>{en.design.loading}</p></section>:renderer==='3d' ? (
            <UnifiedStage map={map} robot={robot} program={runProgram} sceneName={customWorld?.name??mission?.title??sceneTitle(scene)}
              customRobot={customRobot} savedRobotName={draft.customRobot?.name} customWorld={customWorld} onEditRobot={()=>setBuilder('robot')}
              template={draft.robotTemplate??'singleFollower'} onTemplateChange={value=>drafts.setRobotTemplate(missionId,value)}
              worldFile={scene||null} canRun={canRun} sound={sound??false} onSoundChange={onSoundChange}
              onFrame={setSnapshot} onActiveBlock={setActiveId} onReset={reset3DResult}
              fieldGoal={draft.fieldGoal?.scene===scene?draft.fieldGoal:undefined} onFieldState={setFieldState} onGoalProgress={setGoalProgress} onMeasurement={setMeasurement}
              onUseRoute={(points,heading)=>{if(countProgramBlocks(visual)>1&&!window.confirm(en.field.exampleReplace))return;const commands:SimCommand[]=measureRoute(points,heading,robot.wheelDiameter/10).segments.flatMap(segment=>[{type:'turn',degrees:segment.turn,speedPercent:25},{type:'move',distanceMm:Math.round(segment.distance*10),speedPercent:35}]);editor.current?.load(fromCommands(commands));setMode('blocks');}}
              onComplete={run=>{
                setExecution(run);
                if(mission&&!scene){const verdict=checkMission(mission,run.result,map,run);onMissionResult(verdict.stars,verdict.goals.map(g=>({label:g.label,passed:g.passed})));}
              }} />
          ) : <SimulatorStage map={map} robotDesign={robot} mission={mission ?? undefined} commands={program} visualProgram={mode === 'steps' ? undefined : visual} worldId={map.id} onMissionResult={onMissionResult} onReset={clearOutcome} canRun={canRun} onFrame={onFrame} soundEnabled={sound} onSoundChange={onSoundChange} />}
          <div className={`workspace-info${detailsCollapsed ? ' is-collapsed' : ''}`}>
            <div className="workspace-info-heading"><div className="workspace-tabs" role="tablist" aria-label={studio.simulator}>{([...(renderer==='3d'?['challenge'] as const:[]),'mission', 'sensors', 'console', 'explain'] as InfoTab[]).map((tab) => <button key={tab} role="tab" aria-selected={infoTab === tab} onClick={() => { setInfoTab(tab); setDetailsCollapsed(false); }}>{tab==='challenge'?en.field.challenge:studio[tab]}</button>)}</div><button className="workspace-details-toggle" aria-expanded={!detailsCollapsed} aria-controls="simulation-details" onClick={() => setDetailsCollapsed(!detailsCollapsed)}>{detailsCollapsed ? studio.showDetails : studio.hideDetails}</button></div>
            <div className="workspace-info-body" id="simulation-details" hidden={detailsCollapsed}>
              {infoTab==='challenge'&&<ChallengePanel key={scene} scene={scene} field={fieldState} goal={draft.fieldGoal?.scene===scene?draft.fieldGoal:undefined} progress={goalProgress} measurement={measurement} robotKit={draft.robotKit} onRobot={kit=>drafts.applyRobotKit(missionId,kit)} onGoal={goal=>drafts.setFieldGoal(missionId,goal)} practice={practice} onPractice={id=>drafts.openPractice(workspace,id,String(customWorld?.options.studentMat??scene))} onExample={()=>{if(!practice)return;if(countProgramBlocks(visual)>0&&!window.confirm(en.field.exampleReplace))return;editor.current?.load(fromCommands(practiceTasks[practice].reference));setMode('blocks');}}/>}
              {infoTab === 'mission' && <>
                {renderer === '2d' && <><label className="workspace-world-label" htmlFor="playground-world">{copy.world}</label><select id="playground-world" value={activeWorld?.id ?? ''} onChange={(event) => drafts.selectMission(workspace, worlds.find((world) => world.id === event.target.value)?.missionIds[0] ?? null)}><option value="">{copy.freePlay}</option>{worlds.map((world) => <option key={world.id} value={world.id}>{world.title}</option>)}</select></>}
                <h2 className="pg-mission-title">{customWorld?.name??mission?.title ?? sceneTitle(scene) ?? copy.freePlay}</h2><p className="pg-mission-brief">{customWorld?en.unified.fieldBrief:mission?.brief ?? (scene ? en.unified.fieldBrief : copy.freePlayBrief)}</p>
                {outcome && canRun && <div className={`pg-outcome ${outcome.stars > 0 ? 'pg-outcome-win' : ''}`} role="status"><h2 className="pg-panel-title pg-last-run">{copy.lastRun}</h2><div className="pg-stars" aria-label={copy.result(outcome.stars)}>{[1, 2, 3].map((star) => <span key={star} aria-hidden="true" className={star <= outcome.stars ? 'on' : ''}>★</span>)}</div></div>}
                {mission && !customWorld && <><ul className="pg-goal-list">{mission.goals.map((goal, index) => <li key={index}>{outcome?.goals[index]?.passed ? '✓' : '◇'} {missionGoalLabel(goal)}</li>)}</ul>{hint && <div className="pg-hint">{hint.text}</div>}
                  <div className="pg-hint-buttons"><button aria-label={copy.previousHint} onClick={() => setHintLevel(hintLevel - 1)} disabled={hintLevel === 0}>←</button><span>{copy.hint(hintLevel, hintCount)}</span><button aria-label={copy.nextHint} onClick={() => setHintLevel(hintLevel + 1)} disabled={hintLevel === hintCount}>→</button></div>
                  <div className="pg-mission-nav">{worldMissions.map((item) => <button key={item.id} aria-pressed={item.id === missionId} className={item.id === missionId ? 'is-active' : ''} onClick={() => drafts.selectMission(workspace, item.id)}>{item.title}</button>)}</div></>}
              </>}
              {infoTab === 'sensors' && <><p className="pg-robot-line">{copy.robotDetails(robot.name, robot.wheelDiameter, robot.trackWidth)}</p><div className="workspace-sensor-grid">{robot.devices.map((device) => <div key={device.port}><span>{studio.port(device.port)} · {studio.deviceNames[device.type]}</span><strong>{studio.sensorValue(device.type, snapshot.sensors[device.port])}</strong></div>)}</div><p>{en.spikeImport.portSummary(robot.motors.map(m => `${m.port}: ${m.side}`).join(', '))}</p>{Object.entries(snapshot.hub.distanceLights ?? {}).map(([port,values]) => <p key={port}>{studio.port(port)}: {values.map(v => `${v}%`).join(' · ')}</p>)}<p>{copy.heading}: {Math.round(snapshot.robot.heading * 180 / Math.PI)}°</p><p>{studio.timer}: {snapshot.t.toFixed(1)} s</p><h2>{studio.variable}</h2>{Object.entries(execution?.trace.filter(entry => entry.end <= snapshot.t).at(-1)?.variables ?? {}).map(([name, value]) => <p key={name}>{name}: {String(value)}</p>)}</>}
              {infoTab === 'console' && <>{execution?.limitedPreview && <p>{en.spikeImport.previewLimit}</p>}{execution?.error && <p className="pg-field-error" role="alert">{studio.runtimeErrors[execution.error.code]}</p>}<div className="workspace-console">{execution?.output.length ? execution.output.filter((line) => line.t <= snapshot.t).map((line, index) => <p key={index}><span>{line.t.toFixed(1)} s</span>{line.text}</p>) : <p>{studio.consoleEmpty}</p>}</div></>}
              {infoTab === 'explain' && <><h2>{selectedType ? en.blocks.addNames[selectedType as keyof typeof en.blocks.addNames] ?? studio.explain : studio.selectBlock}</h2><p>{selectedType ? en.blocks.help[selectedType as keyof typeof en.blocks.help] ?? studio.defaultHelp : studio.dragHint}</p></>}
            </div>
          </div>
        </section>
      </div>
      {builder&&<DesignBuilder kind={builder} name={builder==='robot'?draft.customRobot?.name:draft.customWorld?.name}
        options={builder==='robot'?customRobot?.options:customWorld?.options??(scene?undefined:worldSeed)} template={draft.robotTemplate}
        worldFile={builder==='world'&&scene.startsWith('worlds/')?scene:undefined}
        onClose={()=>setBuilder(null)} onRobot={design=>{drafts.saveCustomRobot(missionId,design);setRenderer('3d');}}
        onWorld={design=>{drafts.saveCustomWorld(missionId,design);setRenderer('3d');}}/>}
    </div>
  );
}
