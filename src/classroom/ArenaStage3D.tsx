import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { en } from '../shared/strings/en';
import { generateGearsPython } from '../editor/gears-python';
import type { VisualProgram } from '../editor/program';
import { toGearsWorld } from '../sim/gears-map';
import type { SimSnapshot } from '../sim/types';
import { LiveRun } from '../runtime/live-run';
import { checkMission } from '../missions/engine';
import { matrixGlyph } from '../sim/matrix-font';
import { practiceWorlds } from '../sim/gears-catalog';
import { arena3dEquipment, arenaPoseSchema, type ArenaPose } from './arenas3d';
import { challengeEquipment, initialSoloFrame, type SoloFrame } from './challenges';
import type { CompetitionSettings } from './protocol';
import type { Runtime3dRequest } from './runtime3d-protocol';

type Update = Omit<Runtime3dRequest, 'attemptId' | 'leaseId'>;
type Frame = { t: number; x: number; y: number; yaw: number; wheels: number[]; objects: { id: string; x: number; y: number }[]; sensors: SimSnapshot['sensors']; hub: SimSnapshot['hub']; running: boolean; pose?: ArenaPose };
export function ArenaStage3D({ settings, spectator = true, pose, program, onUpdate, runId = '', stopped = false }: {
  settings: CompetitionSettings; spectator?: boolean; pose?: ArenaPose; program?: VisualProgram; onUpdate?: (update: Update) => void; runId?: string; stopped?: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [root, setRoot] = useState<string | null>(() => window.desktop ? null : './gears/');
  const [booted, setBooted] = useState(false), [readyKey, setReadyKey] = useState(''), [error, setError] = useState('');
  const configurationKey = `${settings.scene}|${settings.challenge}|${runId}|${spectator}`;
  const configId = useRef(0);
  const ready = readyKey === configurationKey;
  const callback = useRef(onUpdate); useEffect(() => { callback.current = onUpdate; }, [onUpdate]);
  const started = useRef(false), ended = useRef(false), goal = useRef(false), run = useRef<LiveRun | null>(null);
  const last = useRef<SoloFrame>(initialSoloFrame(settings.challenge));
  const base = useMemo(() => challengeEquipment(settings.challenge), [settings.challenge]);
  const extra = useMemo(() => settings.scene ? arena3dEquipment(settings.scene) : null, [settings.scene]);
  const source = useMemo(() => { try { return { code: program ? generateGearsPython(program) : undefined, error: '' }; } catch { return { code: undefined, error: en.unified.programError }; } }, [program]);
  const origin = root ? new URL(root, location.href).origin : location.origin;
  const send = useCallback((type: string, data: Record<string, unknown> = {}) => frame.current?.contentWindow?.postMessage({ channel: 'spikesim-3d', type, ...data }, origin), [origin]);
  useEffect(() => { let active = true; if (window.desktop) void window.desktop.getGearsUrl().then(url => { if (active) setRoot(url); }).catch(() => setError(en.unified.loadError)); return () => { active = false; }; }, []);
  useEffect(() => {
    const finish = (error: string | null = null) => {
      if (!started.current || ended.current) return;
      ended.current = true;
      const execution = run.current?.finish();
      const goals = extra ? [{ label: extra.fieldGoal ? extra.goalLabel : settings.taskBrief, passed: Boolean(extra.fieldGoal && goal.current) }]
        : execution ? checkMission(base.mission, execution.result, base.map, execution).goals.map(g => ({ label: g.label, passed: g.passed })) : [];
      callback.current?.({ type: 'finish', frame: last.current, verdict: { completed: !error && goals.length > 0 && goals.every(g => g.passed), goals, seconds: last.current.time, error } });
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== origin || event.data?.channel !== 'spikesim-3d') return;
      const data = event.data;
      if (data.type === 'ready') { setBooted(true); return; }
      if (data.type === 'boot-error') { setError(en.unified.loadError); callback.current?.({ type: 'error' }); return; }
      if (data.configId !== configId.current) return;
      if (data.type === 'status' && data.status === 'ready') setReadyKey(configurationKey);
      if (data.type === 'status' && data.status === 'running') { started.current = true; callback.current?.({ type: 'started' }); }
      if (data.type === 'goal-progress') goal.current = Boolean(data.passed);
      if (data.type === 'block') run.current?.mark(String(data.id));
      if (data.type === 'collision') run.current?.events.push({ type: 'collision', data: { wall: '3d obstacle' } });
      if (data.type === 'variables' && run.current) run.current.variables = data.values;
      if (data.type === 'frame') {
        const f = data as Frame;
        const snapshot: SimSnapshot = { t: f.t, robot: { x: f.x * 10 + base.map.size.width / 2, y: base.map.size.height / 2 - f.y * 10, heading: (f.yaw - 90) * Math.PI / 180, wheels: f.wheels, arms: [] }, objects: (f.objects ?? []).map(o => ({ id: o.id, x: o.x * 10 + base.map.size.width / 2, y: base.map.size.height / 2 - o.y * 10, heading: 0 })), sensors: f.sensors, hub: f.hub, events: [] };
        if (f.running) run.current?.frame(snapshot);
        const parsed = arenaPoseSchema.safeParse(f.pose);
        last.current = { time: Math.min(settings.roundSeconds, f.t), robot: snapshot.robot, objects: snapshot.objects, running: f.running, ...(parsed.success ? { pose: parsed.data } : {}) };
        if (started.current && !ended.current) callback.current?.({ type: 'frame', frame: last.current });
      }
      if (data.type === 'status' && data.status === 'complete') finish();
      if (data.type === 'competition-timeout') { last.current.time = settings.roundSeconds; finish(en.classroom.timeUp); }
      if (data.type === 'error') { setError(String(data.message)); if (started.current) finish(String(data.message)); else callback.current?.({ type: 'error' }); }
    };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, [origin, base, extra, settings.taskBrief, settings.roundSeconds, configurationKey]);
  useEffect(() => {
    if (!booted) return;
    configId.current++;
    started.current = false; ended.current = false; goal.current = false; run.current = null;
    const converted = toGearsWorld(base.map), preset = practiceWorlds.find(p => p.id === extra?.worldFile);
    send('configure', { configId: configId.current, competition: true, spectator, robot: extra?.robot ?? base.robot, template: extra?.template ?? 'singleFollower', robotOptions: extra?.customRobot?.options, fieldGoal: extra?.fieldGoal,
      hubButtons: [en.liveBlocks.leftButton, en.liveBlocks.rightButton], fieldCopy: { object: en.field.objectLabel, mechanism: en.field.mechanismLabel, magnetic: en.field.magneticLabel, score: en.field.scoreLabel }, targetNames: extra?.customWorld?.options.studentTargetNames,
      glyphs: Object.fromEntries([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !?-.'].map(c => [c, matrixGlyph(c)])),
      ...(extra?.customWorld ? { world: extra.customWorld.options } : preset ? { worldName: preset.worldName, worldOptions: extra?.worldOptions } : extra?.worldFile ? { worldFile: extra.worldFile } : { world: converted.options, objectIndices: converted.objectIndices }),
    });
  }, [booted, send, base, extra, spectator, runId]);
  useEffect(() => { if (stopped && booted) send('stop'); }, [stopped, booted, send]);
  useEffect(() => { if (ready && (spectator || stopped || !program) && pose) send('competition-pose', { pose }); }, [ready, spectator, stopped, program, pose, send]);
  useEffect(() => {
    if (!ready || !program || spectator || started.current) return;
    // Mark the launch before posting, so a render cannot issue the same run twice.
    started.current = true; run.current = new LiveRun(base.map, program);
    if (source.error) callback.current?.({ type: 'error' });
    else send('run', { source: source.code, sound: false, timeLimit: settings.roundSeconds });
  }, [ready, program, source, spectator, base, send, settings.roundSeconds]);
  return <div className="class-3d-stage" data-ready={ready}>
    <div className="class-3d-canvas">{root && <iframe ref={frame} title={en.unified.simulator} src={`${root}student.html`} sandbox="allow-scripts allow-same-origin" onLoad={() => send('hello')} />}
      {!ready && <div className="class-3d-loading" role="status">{error || en.classroom.loadingArena}</div>}
    </div>
    <div className="class-3d-tools"><button type="button" disabled={!ready} onClick={() => send('camera', { mode: 'arc' })}>{en.unified.simulator}</button><button type="button" disabled={!ready} onClick={() => send('camera', { mode: 'top' })}>{en.unified.top}</button><button type="button" disabled={!ready} onClick={() => send('camera', { mode: 'follow' })}>{en.unified.follow}</button></div>
    {(error || source.error) && ready && <p role="alert">{error || source.error}</p>}
  </div>;
}
