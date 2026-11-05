import { useCallback, useEffect, useRef, useState } from 'react';
import { missions } from '../missions/content';
import {
  getPlaygroundDraft, missionOutcomeSchema, programStepsSchema, readPlayground,
  replacePlaygroundDraft, writePlayground, programNameSchema, playgroundKey, playgroundStateSchema,
  type MissionOutcome, type PlaygroundLoad, type PlaygroundState, type ProgramStep, type WorkspaceId,
} from '../progress/playground';
import { programFileSchema, type ProgramFile } from '../progress/program-file';
import { visualProgramSchema, type VisualProgram } from '../editor/program';
import { sceneSchema, robotTemplateSchema, templateRobot } from '../sim/gears-catalog';
import {customRobotSchema,customWorldSchema,designRobot,type CustomRobot,type CustomWorld} from '../sim/custom-design';
import {fieldGoalSchema,type FieldGoal} from '../challenges/schemas';
import {customKit,kitSchema,type RobotKit} from '../challenges/catalog';
import {practiceTasks,practiceWorld,type PracticeId} from '../challenges/practice';
import {obstacleScene,obstacleRobot,obstacleDesign,obstacleProgram} from '../challenges/obstacles2';
import {lineCourseReferences,lineCourseRobot,lineCourseDesign,lineCourseProgram} from '../challenges/line-courses';
import {sumoPracticeFile} from '../challenges/sumo';

const missionIds = missions.map((mission) => mission.id);
const getStorage = (): Storage | null => {
  try { return window.localStorage; }
  catch { return null; }
};
const storedContent = (): string | null | undefined => {
  try { return getStorage()?.getItem(playgroundKey); }
  catch { return undefined; }
};
const loadContent = (raw: string | null | undefined): PlaygroundLoad =>
  readPlayground(raw === undefined ? null : { getItem: () => raw }, missionIds);
const initialSession = () => {
  const raw = storedContent();
  return { ...loadContent(raw), raw };
};

/** Keep this hook in App: memory survives navigation even when browser storage is full. */
export function usePlaygroundDrafts() {
  const [snapshot, setSnapshot] = useState<PlaygroundLoad & { raw?: string | null }>(initialSession);
  const latest = useRef(snapshot.state);
  const lastStored = useRef(snapshot.raw);
  const conflicting = useRef(false);
  const [savedVersionUnavailable, setSavedVersionUnavailable] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const reportConflict = useCallback((raw: string | null | undefined) => {
    conflicting.current = true;
    const load = loadContent(raw);
    setSavedVersionUnavailable(load.saveStatus === 'error' || load.saveStatus === 'recovered');
    setSnapshot({ state: latest.current, saveStatus: 'conflict' });
  }, []);

  useEffect(() => {
    const checkStoredVersion = () => {
      const raw = storedContent();
      if (raw !== undefined && raw !== lastStored.current) reportConflict(raw);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === playgroundKey || event.key === null) checkStoredVersion();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', checkStoredVersion);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', checkStoredVersion);
    };
  }, [reportConflict]);

  // Event handlers call commit; writes are never side effects of a React updater.
  const commit = useCallback((update: (state: PlaygroundState) => PlaygroundState) => {
    const next = update(latest.current);
    latest.current = next;
    // Compare before writing too: the other tab's storage event may still be queued.
    const raw = storedContent();
    const changed = raw !== undefined && raw !== lastStored.current
      && !(raw === null && lastStored.current === undefined);
    if (conflicting.current || changed) {
      reportConflict(raw);
      return false;
    }
    const saved = writePlayground(getStorage(), next);
    if (saved) lastStored.current = JSON.stringify(playgroundStateSchema.parse(next));
    setSnapshot({ state: next, saveStatus: saved ? 'saved' : 'error' });
    return saved;
  }, [reportConflict]);

  const useSavedVersion = useCallback(() => {
    const raw = storedContent();
    const load = loadContent(raw);
    if (load.saveStatus === 'error' || load.saveStatus === 'recovered') {
      reportConflict(raw);
      return false;
    }
    latest.current = load.state;
    lastStored.current = raw;
    conflicting.current = false;
    setSavedVersionUnavailable(false);
    setSnapshot(load);
    setResetKey((key) => key + 1);
    return true;
  }, [reportConflict]);
  const keepThisTab = useCallback(() => {
    lastStored.current = storedContent();
    conflicting.current = false;
    setSavedVersionUnavailable(false);
    return commit((state) => state);
  }, [commit]);

  const selectMission = useCallback((workspace: WorkspaceId, missionId: string | null) => {
    if (missionId !== null && !missionIds.includes(missionId)) return false;
    return commit((state) => ({ ...state, selected: { ...state.selected, [workspace]: missionId } }));
  }, [commit]);

  const updateSteps = useCallback((missionId: string | null, steps: ProgramStep[]) => {
    if (missionId !== null && !missionIds.includes(missionId)) return false;
    const parsed = programStepsSchema.safeParse(steps);
    if (!parsed.success) return false;
    return commit((state) => replacePlaygroundDraft(state, { ...getPlaygroundDraft(state, missionId), visualProgram: undefined, steps: parsed.data, outcome: null }));
  }, [commit]);

  const updateVisualProgram = useCallback((missionId: string | null, program: VisualProgram) => {
    const parsed = visualProgramSchema.safeParse(program);
    if (!parsed.success || (missionId !== null && !missionIds.includes(missionId))) return false;
    return commit((state) => replacePlaygroundDraft(state, { ...getPlaygroundDraft(state, missionId), visualProgram: parsed.data, outcome: null }));
  }, [commit]);

  const setOutcome = useCallback((missionId: string | null, outcome: MissionOutcome | null) => {
    if (missionId !== null && !missionIds.includes(missionId)) return false;
    const parsed = missionOutcomeSchema.nullable().safeParse(outcome);
    if (!parsed.success) return false;
    return commit((state) => replacePlaygroundDraft(state, { ...getPlaygroundDraft(state, missionId), outcome: parsed.data }));
  }, [commit]);

  const getDraft = useCallback((missionId: string | null) => getPlaygroundDraft(snapshot.state, missionId), [snapshot.state]);
  const nameProgram = useCallback((missionId: string | null, name: string) => {
    const parsed = programNameSchema.safeParse(name);
    if (!parsed.success || (missionId !== null && !missionIds.includes(missionId))) return false;
    return commit((state) => replacePlaygroundDraft(state, { ...getPlaygroundDraft(state, missionId), name: parsed.data }));
  }, [commit]);
  const importProgram = useCallback((workspace: WorkspaceId, program: ProgramFile) => {
    const parsed = programFileSchema.safeParse(program);
    if (!parsed.success || (parsed.data.missionId !== null && !missionIds.includes(parsed.data.missionId))) return false;
    const imported = parsed.data;
    setResetKey((key) => key + 1);
    return commit((state) => ({
      ...replacePlaygroundDraft(state, {
        missionId: imported.missionId,
        name: imported.name,
        ...(imported.visualProgram ? { visualProgram: imported.visualProgram } : {}),
        ...(imported.robot ? { robot: imported.robot } : {}),
        ...(imported.scene ? {scene:imported.scene} : {}),
        ...(imported.robotTemplate ? {robotTemplate:imported.robotTemplate} : {}),
        customRobot:imported.customRobot,customWorld:imported.customWorld,fieldGoal:imported.fieldGoal,robotKit:imported.robotKit,
        steps: imported.steps.map((step) => ({ ...step, id: crypto.randomUUID() })),
        outcome: null,
      }),
      selected: { ...state.selected, [workspace]: imported.missionId },
    }));
  }, [commit]);
  const retrySave = useCallback(() => commit((state) => state), [commit]);
  const setDraftScene = useCallback((missionId:string|null,scene:string)=>{
    if (!sceneSchema.safeParse(scene).success) return false;
    return commit(state=>{const draft=getPlaygroundDraft(state,missionId);return replacePlaygroundDraft(state,{...draft,scene,fieldGoal:draft.scene===scene?draft.fieldGoal:undefined,outcome:null});});
  },[commit]);
  const setScene=useCallback((scene:string)=>setDraftScene(null,scene),[setDraftScene]);
  const setRobotTemplate = useCallback((missionId:string|null,template:string)=>{
    if (!robotTemplateSchema.safeParse(template).success) return false;
    return commit(state=>{const draft=getPlaygroundDraft(state,missionId);return replacePlaygroundDraft(state,{...draft,robotKit:undefined,robotTemplate:template,robot:template==='custom'&&draft.customRobot?designRobot(draft.customRobot):templateRobot(template),outcome:null});});
  },[commit]);
  const saveCustomRobot=useCallback((missionId:string|null,value:CustomRobot)=>{
    const customRobot=customRobotSchema.parse(value);
    return commit(state=>{const draft=getPlaygroundDraft(state,missionId),robot=designRobot(customRobot,draft.robot);return replacePlaygroundDraft(state,{...draft,robotKit:undefined,customRobot:{...customRobot,portMap:robot},robot,robotTemplate:'custom',outcome:null});});
  },[commit]);
  const saveCustomWorld=useCallback((missionId:string|null,value:CustomWorld)=>{
    const customWorld=customWorldSchema.parse(value);
    return commit(state=>replacePlaygroundDraft(state,{...getPlaygroundDraft(state,missionId),scene:'custom',customWorld,outcome:null}));
  },[commit]);
  const applyRobotKit=useCallback((missionId:string|null,kit:RobotKit)=>{
    kitSchema.parse(kit);const custom=customKit(kit),robot=custom?designRobot(custom):templateRobot(kit);
    return commit(state=>{const draft=getPlaygroundDraft(state,missionId);return replacePlaygroundDraft(state,{...draft,robotKit:kit,robot,robotTemplate:custom?'custom':kit,customRobot:custom?{...custom,portMap:robot}:draft.customRobot,outcome:null});});
  },[commit]);
  const setFieldGoal=useCallback((missionId:string|null,goal:FieldGoal|undefined)=>{
    const parsed=goal?fieldGoalSchema.parse(goal):undefined;
    return commit(state=>replacePlaygroundDraft(state,{...getPlaygroundDraft(state,missionId),fieldGoal:parsed,outcome:null}));
  },[commit]);

  const openPractice=useCallback((workspace:WorkspaceId,id:PracticeId,matScene:string)=>{
    const task=practiceTasks[id],custom=customKit(task.kit),robot=custom?designRobot(custom):templateRobot(task.kit);
    setResetKey(key=>key+1);
    return commit(state=>({...replacePlaygroundDraft(state,{...getPlaygroundDraft(state,null),scene:'custom',customWorld:practiceWorld(id,matScene),fieldGoal:task.goal,robotKit:task.kit,robot,robotTemplate:custom?'custom':task.kit,customRobot:custom?{...custom,portMap:robot}:getPlaygroundDraft(state,null).customRobot,outcome:null}),selected:{...state.selected,[workspace]:null}}));
  },[commit]);
  const openObstacleExample=useCallback((workspace:WorkspaceId)=>{
    setResetKey(key=>key+1);
    return commit(state=>({...replacePlaygroundDraft(state,{...getPlaygroundDraft(state,null),scene:obstacleScene,name:obstacleRobot.name,robotTemplate:'custom',robotKit:undefined,robot:obstacleDesign,customRobot:{...obstacleRobot,portMap:obstacleDesign},visualProgram:obstacleProgram,steps:[],fieldGoal:{scene:obstacleScene,target:'robot',action:'reach',amount:10,destination:{x:0,y:137}},outcome:null}),selected:{...state.selected,[workspace]:null}}));
  },[commit]);

  const openLineExample=useCallback((workspace:WorkspaceId,scene:string)=>{
    const reference=lineCourseReferences.find(entry=>entry.scene===scene);
    if(!reference)return false;
    return importProgram(workspace,{schemaVersion:1,kind:'spikesim-program',name:reference.name,missionId:null,steps:[],scene,robotTemplate:'custom',robot:lineCourseDesign,customRobot:lineCourseRobot,visualProgram:lineCourseProgram(reference.distanceCm),fieldGoal:reference.goal});
  },[importProgram]);

  const openSumoExample=useCallback((workspace:WorkspaceId)=>importProgram(workspace,sumoPracticeFile()),[importProgram]);

  return { state: snapshot.state, saveStatus: snapshot.saveStatus, getDraft, selectMission, updateSteps, updateVisualProgram, setOutcome, retrySave, nameProgram, importProgram, useSavedVersion, keepThisTab, savedVersionUnavailable, resetKey, setScene,setDraftScene, setRobotTemplate,saveCustomRobot,saveCustomWorld,applyRobotKit,setFieldGoal,openPractice,openObstacleExample,openLineExample,openSumoExample };
}
