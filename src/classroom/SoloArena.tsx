import { useEffect, useRef, useState } from 'react';
import { Expand, Minimize2, Timer } from 'lucide-react';
import { en } from '../shared/strings/en';
import { missionGoalLabel } from '../missions/engine';
import type { VisualProgram } from '../editor/program';
import { challengeCatalog, challengeEquipment, initialSoloFrame, type ChallengeId, type SoloFrame } from './challenges';
import { arena3dCatalog, arena3dEquipment } from './arenas3d';
import { ArenaStage3D } from './ArenaStage3D';
import { LanCompetitionTransport, operationId } from './client';
import type { CompetitionSettings, CompetitionView } from './protocol';
import type { Runtime3dRequest } from './runtime3d-protocol';
import './solo.css';

const c = en.classroom;
export function arenaTitle(settings: CompetitionSettings) { return settings.scene ? arena3dEquipment(settings.scene).title : challengeEquipment(settings.challenge).mission.title; }
export function SoloBrief({ settings }: { settings: CompetitionSettings }) {
  const base = challengeEquipment(settings.challenge), extra = settings.scene ? arena3dEquipment(settings.scene) : null;
  const robot = extra?.robot ?? base.robot;
  return <div className="class-solo-brief">
    <p>{extra?.brief ?? base.mission.brief}</p>
    <strong>{extra && !extra.fieldGoal ? c.teacherJudged : c.automaticGoals}</strong>
    {extra && !extra.fieldGoal ? <p>{settings.taskBrief}</p> : <ul>{extra ? <li>{extra.goalLabel}</li> : base.mission.goals.map((goal, i) => <li key={i}>{missionGoalLabel(goal)}</li>)}</ul>}
    <details><summary>{c.robotEquipment}</summary><p>{robot.name} · {c.ports}: {robot.motors.map(m => m.port).join(' / ')}</p><ul>{robot.devices.map(d => <li key={d.port}>{d.port} · {c.deviceNames[d.type]}</li>)}</ul></details>
  </div>;
}
export function ChallengePicker({ settings, onChange }: { settings: CompetitionSettings; onChange: (value: CompetitionSettings) => void }) {
  const groups = [...new Set(arena3dCatalog.map(a => a.group))];
  const manual = Boolean(settings.scene && !arena3dCatalog.find(a => a.id === settings.scene)?.automatic);
  return <div className="class-challenge-picker">
    <label>{c.soloArena}<select value={settings.scene || settings.challenge} onChange={e => onChange({ ...settings, engine: 'gears', ...(challengeCatalog.some(m => m.id === e.target.value) ? { challenge: e.target.value as ChallengeId, scene: '' } : { scene: e.target.value }) })}>
      <optgroup label={c.arenaGroups.basics}>{challengeCatalog.map(m => <option value={m.id} key={m.id}>{m.title}</option>)}</optgroup>
      {groups.map(group => <optgroup label={group} key={group}>{arena3dCatalog.filter(a => a.group === group).map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</optgroup>)}
    </select></label>
    <p className="class-small">{c.soloSelectionHelp}</p>
    <ArenaStage3D settings={settings} />
    {manual && <label>{c.taskBrief}<textarea required minLength={10} maxLength={600} rows={3} placeholder={c.taskPlaceholder} value={settings.taskBrief} onChange={e => onChange({ ...settings, taskBrief: e.target.value })} /></label>}
    <SoloBrief settings={settings} />
  </div>;
}
export function SoloArena({ view, live, client, token }: { view: CompetitionView; live: boolean; client: LanCompetitionTransport; token: string }) {
  const [expanded, setExpanded] = useState(false), [programState, setProgram] = useState<{ id: string; value: VisualProgram }>(), [errorState, setRuntimeError] = useState<{ id: string; value: string }>();
  const [frameState, setLocalFrame] = useState<{ id: string; value: SoloFrame }>();
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const publish = useRef<(update: Omit<Runtime3dRequest, 'attemptId' | 'leaseId'>) => void>(() => {});
  const activeId = view.activeAttempt?.id;
  const program = programState?.id === activeId ? programState?.value : undefined;
  const localFrame = frameState?.id === activeId ? frameState?.value : undefined;
  const runtimeError = errorState?.id === activeId ? errorState?.value : '';
  useEffect(() => {
    if (!activeId || view.role !== 'teacher' || view.settings.engine !== 'gears') return;
    dialog.current?.scrollIntoView({ block: 'center' });
    let cancelled = false, claimed = false, finished = false, inFlight = false;
    let latest: SoloFrame | undefined, lastSent = -1;
    const leaseId = operationId();
    type Update = Omit<Runtime3dRequest, 'attemptId' | 'leaseId'>;
    const pending: Update[] = [];
    const send = async (update: Update) => {
      if (cancelled) return;
      if (inFlight) { if (!['claim', 'frame'].includes(update.type)) pending.push(update); return; }
      inFlight = true;
      try {
        const result = await client.runtime(view.code, token, { attemptId: activeId, leaseId, ...update });
        if (cancelled) return;
        if (!result.accepted) { claimed = false; return; }
        if (update.type === 'claim' && !claimed) { claimed = true; if (result.program) setProgram({ id: activeId, value: result.program }); }
      } catch (e) { if (!cancelled) setRuntimeError({ id: activeId, value: e instanceof Error ? e.message : c.arenaDisconnected }); }
      finally { inFlight = false; const next = pending.shift(); if (next) void send(next); }
    };
    void send({ type: 'claim' });
    publish.current = update => {
      if (update.frame) latest = update.frame;
      if (update.type !== 'frame') { if (update.type === 'finish' || update.type === 'error') finished = true; void send(update); }
    };
    const timer = setInterval(() => {
      if (latest) setLocalFrame({ id: activeId, value: latest });
      if (!claimed || inFlight) return;
      if (latest && latest.time !== lastSent && !finished) { lastSent = latest.time; void send({ type: 'frame', frame: latest }); }
      else void send({ type: 'claim' });
    }, 500);
    return () => { cancelled = true; clearInterval(timer); publish.current = () => {}; };
  }, [activeId, view.role, view.settings.engine, view.code, client, token]);
  const close = () => { dialog.current?.close(); dialog.current?.show(); setExpanded(false); trigger.current?.focus({ preventScroll: true }); };
  const expand = () => { dialog.current?.close(); dialog.current?.showModal(); setExpanded(true); };
  const active = view.activeAttempt, result = !active ? view.attempts.at(-1) : undefined;
  const attempt = active ?? result;
  const current = active && program && localFrame && !active.frame.awaitingConfirmation ? localFrame : attempt?.frame ?? initialSoloFrame(view.settings.challenge);
  const title = arenaTitle(view.settings);
  return <section className="class-arena class-solo-arena" aria-label={c.soloArena}>
    <header><div><span className="class-eyebrow">{c.formats.challenge}</span><h2>{title}</h2></div><button ref={trigger} onClick={expand}><Expand size={16} aria-hidden="true" />{c.projector}</button></header>
    <dialog open ref={dialog} className={`class-solo-view${expanded ? ' class-projector class-solo-projector' : ''}`} aria-label={c.projector} onCancel={e => { e.preventDefault(); close(); }}>
      {expanded && <header><strong>{view.settings.title} · {title}</strong><button autoFocus onClick={close}><Minimize2 size={16} aria-hidden="true" />{c.closeProjector}</button></header>}
      <div className="class-arena-scene class-solo-scene">
        <div className="class-arena-status"><span>{!live ? c.stale : active ? active.frame.awaitingConfirmation ? c.refereeWaiting : c.soloRunning : result ? c.latest : c.soloReady}</span><span>{c.round(attempt?.round ?? view.round)}</span></div>
        <div className="class-solo-run-heading"><strong>{attempt?.entryName ?? title}</strong><div className="class-solo-clock"><Timer size={16} aria-hidden="true" /><span>{en.sumo.timeLeft}</span><strong role="timer">{c.clock((attempt?.seconds ?? view.settings.roundSeconds) - current.time)}</strong></div></div>
        <ArenaStage3D settings={view.settings} runId={attempt?.id} stopped={!active} spectator={view.role !== 'teacher'} program={active ? program : undefined} pose={current.pose} onUpdate={update => publish.current(update)} />
        <p>{c.soloModel}</p>
      </div>
      {result && <div className="class-result class-solo-result" role="status"><div><strong>{result.entryName} · {result.void ? c.void : result.verdict.completed ? c.completed : c.incomplete}</strong><p>{c.preciseSeconds(result.verdict.seconds)} · {c.revision(result.revision)}</p>{result.verdict.error && <p>{result.verdict.error}</p>}<ul>{result.verdict.goals.map((goal, i) => <li key={i}>{goal.passed ? c.goalPassed : c.goalMissed}: {goal.label}</li>)}</ul></div></div>}
    </dialog>
    {runtimeError && <p role="alert">{runtimeError}</p>}
    <SoloBrief settings={view.settings} />
  </section>;
}
