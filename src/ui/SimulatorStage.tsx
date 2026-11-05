import { useCallback, useEffect, useMemo, useState } from 'react';
import { DeterministicSimulator } from '../sim/engine';
import { robotPresets } from '../sim/presets';
import type { MapFile } from '../sim/map-types';
import type { RobotDesign } from '../sim/schemas';
import type { SimCommand, SimSnapshot } from '../sim/types';
import type { VisualProgram } from '../editor/program';
import { countProgramBlocks } from '../editor/program';
import type { Execution } from '../runtime/visual-runtime';
import { checkMission } from '../missions/engine';
import type { MissionFile } from '../missions/schemas';
import { en } from '../shared/strings/en';
import { SpikeRobot } from './SpikeRobot';
import { useSimulationPlayback } from './useSimulationPlayback';
import { useSimulationSound } from './useSimulationSound';

const DEG = 180 / Math.PI;
const copy = en.playground;

type StageProps = {
  map: MapFile;
  robotDesign?: RobotDesign;
  mission?: MissionFile;
  commands: SimCommand[];
  worldId: string;
  onMissionResult?: (stars: number, labels: { label: string; passed: boolean }[]) => void;
  onReset?: () => void;
  canRun?: boolean;
  visualProgram?: VisualProgram;
  onFrame?: (snapshot: SimSnapshot, execution: Execution | null, activeId?: string) => void;
  soundEnabled?: boolean;
  onSoundChange?: (value: boolean) => void;
};

/** A changed program or map starts a fresh playback and cancels the old one. */
export function SimulatorStage(props: StageProps) {
  return <StagePlayback key={JSON.stringify([props.map, props.mission, props.commands, props.canRun, props.visualProgram, props.robotDesign])} {...props} />;
}

/** Render recorded deterministic snapshots in the map's millimeter coordinates. */
function StagePlayback({ map, mission, commands, worldId, onMissionResult, onReset, canRun = true, visualProgram, onFrame, soundEnabled, onSoundChange, robotDesign }: StageProps) {
  const [showTrail, setShowTrail] = useState(true);
  const [showSensors, setShowSensors] = useState(false);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [showError, setShowError] = useState(false);
  const [localSound, setSound] = useState(false);
  const sound = soundEnabled ?? localSound;
  const [expanded, setExpanded] = useState(false);
  const robot = robotDesign ?? robotPresets[mission?.robotPreset ?? 'driving-base'];
  const initial = useMemo(() => new DeterministicSimulator({ map, robot, seed: 1 }).snapshot(), [map, robot]);
  const legacyRun = useMemo(() => visualProgram || commands.length === 0 || !canRun ? null
    : new DeterministicSimulator({ map, robot, seed: 1 }).run(commands), [commands, map, robot, canRun, visualProgram]);
  const hasBlocks = visualProgram && countProgramBlocks(visualProgram) > 0;
  const run = visualProgram ? execution?.result ?? null : legacyRun;
  useEffect(() => {
    if (!visualProgram || !hasBlocks || !canRun) return;
    const worker = new Worker(new URL('../runtime/simulation.worker.ts', import.meta.url), { type: 'module' });
    const fallback = (code: 'limit' | 'unsupported') => setExecution({ result: new DeterministicSimulator({ map, robot }).run([]), trace: [], output: [], error: { code } });
    let watchdog = window.setTimeout(() => { worker.terminate(); fallback('unsupported'); }, 10000);
    worker.onmessage = (event: MessageEvent<Execution | { type: 'ready' }>) => {
      if ('type' in event.data) {
        window.clearTimeout(watchdog);
        watchdog = window.setTimeout(() => { worker.terminate(); fallback('limit'); }, 1800);
        return;
      }
      window.clearTimeout(watchdog); worker.terminate();
      if (event.data.result) setExecution(event.data); else fallback('unsupported');
    };
    worker.onerror = () => { window.clearTimeout(watchdog); worker.terminate(); fallback('unsupported'); };
    worker.postMessage({ program: visualProgram, map, robot, seed: 1 });
    return () => { window.clearTimeout(watchdog); worker.terminate(); };
  }, [visualProgram, hasBlocks, map, robot, canRun]);
  const onComplete = useCallback(() => {
    if (!mission || !run || execution?.error) return;
    const verdict = checkMission(mission, run, map, execution ?? undefined);
    onMissionResult?.(verdict.stars, verdict.goals.map(({ label, passed }) => ({ label, passed })));
  }, [mission, run, map, onMissionResult, execution]);
  const { status, frame, speed, setSpeed, play, pause, reset, seek, stop } = useSimulationPlayback(run, onComplete);
  const unlockSound = useSimulationSound(run, run?.snapshots[frame]?.t ?? 0, status === 'running', speed, sound);
  const resetStage = useCallback(() => { reset(); setShowError(false); onReset?.(); }, [reset, onReset]);
  const playStage = useCallback(() => { if (run) { onReset?.(); if (execution?.error) setShowError(true); else { unlockSound(); play(); } } }, [run, play, onReset, execution, unlockSound]);
  const stepStage = useCallback(() => {
    if (!run || execution?.error) { if (execution?.error) setShowError(true); return; }
    const time = run.snapshots[frame]?.t ?? 0;
    const next = execution?.trace.find((entry) => entry.end > time + 0.0001)?.end ?? time + 0.1;
    seek(next);
  }, [run, execution, frame, seek]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if (event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key === 'Enter')) {
        event.preventDefault();
        if (status === 'running') pause();
        else playStage();
      }
      if (event.key === 'Escape') { stop(); setExpanded(false); }
      if (event.key === 'F10') { event.preventDefault(); stepStage(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, pause, playStage, stop, stepStage]);

  const current = run?.snapshots[frame] ?? initial;
  const activeId = showError ? execution?.error?.blockId : status === 'ready' ? undefined : execution?.trace.find((entry) => entry.end > current.t + 0.00001 && entry.start <= current.t)?.blockId;
  useEffect(() => { onFrame?.(current, showError ? execution : status === 'ready' ? null : execution && { ...execution, error: undefined }, activeId); }, [current, execution, onFrame, activeId, showError, status]);
  const width = map.size.width;
  const height = map.size.height;
  const points = (items: [number, number][]) => items.map(([x, y]) => `${x},${y}`).join(' ');
  const trail = run?.snapshots.slice(0, frame + 1).map((s) => `${s.robot.x},${s.robot.y}`).join(' ');
  const distancePort = robot.devices.find((device) => device.type === 'distance')?.port;
  const distanceValue = distancePort ? current.sensors[distancePort] : undefined;
  const distanceLabel = typeof distanceValue !== 'number' ? copy.noDistanceSensor
    : distanceValue < 0 ? copy.outOfRange : copy.centimeters(distanceValue);

  return (
    <div className={`sim-stage sim-stage-${worldId}${expanded ? ' sim-stage-expanded' : ''}`} data-status={status}>
      <svg className="sim-canvas" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={copy.stage}>
        <rect width={width} height={height} fill={map.surface.base} />
        {map.surface.layers.map((layer, i) => layer.type === 'line' ? (
          <polyline key={i} points={points(layer.points)} fill="none" stroke={layer.color} strokeWidth={layer.width} strokeLinecap="round" strokeLinejoin="round" />
        ) : layer.shape === 'circle' ? (
          <circle key={i} cx={layer.x} cy={layer.y} r={layer.r} fill={layer.color} />
        ) : (
          <rect key={i} x={layer.x - (layer.w ?? 0) / 2} y={layer.y - (layer.h ?? 0) / 2} width={layer.w} height={layer.h} fill={layer.color} />
        ))}
        {map.zones.map((zone) => zone.shape === 'rect' ? (
          <rect key={zone.id} x={zone.x - zone.w / 2} y={zone.y - zone.h / 2} width={zone.w} height={zone.h}
            fill={zone.color ?? '#b9e769'} fillOpacity={0.35} stroke={zone.color ?? '#b9e769'} strokeWidth={4} strokeDasharray="20 15" rx={8} />
        ) : (
          <circle key={zone.id} cx={zone.x} cy={zone.y} r={zone.r}
            fill={zone.color ?? '#b9e769'} fillOpacity={0.35} stroke={zone.color ?? '#b9e769'} strokeWidth={4} strokeDasharray="20 15" />
        ))}
        {map.walls.map((wall, i) => (
          <polyline key={i} points={points(wall.points)} fill="none" stroke="#3b4664" strokeWidth={wall.thickness} strokeLinejoin="round" />
        ))}
        {map.zones.map((zone) => <text key={`label-${zone.id}`} x={zone.x} y={zone.y + (zone.shape === 'circle' ? zone.r : zone.h / 2) + 20} textAnchor="middle" fontSize={18} fontWeight={600} fill="#374259">{zone.label ?? zone.id}</text>)}
        {current.objects.map((object) => {
          const design = map.objects.find((item) => item.id === object.id);
          const size = design?.size ?? 60;
          return design?.kind === 'ball' || design?.kind === 'cylinder' ? (
            <circle key={object.id} cx={object.x} cy={object.y} r={size / 2} fill={design.color} stroke="#172342" strokeWidth={3} />
          ) : (
            <rect key={object.id} x={object.x - size / 2} y={object.y - size / 2} width={size} height={size}
              fill={design?.color ?? '#a88cff'} stroke="#172342" strokeWidth={3} rx={8} />
          );
        })}
        {showTrail && trail && <polyline points={trail} fill="none" stroke="#ff8e80" strokeWidth={5} strokeDasharray="16 10" strokeLinecap="round" />}
        {showSensors && <line x1={current.robot.x} y1={current.robot.y} x2={current.robot.x + Math.cos(current.robot.heading) * (typeof distanceValue === 'number' && distanceValue > 0 ? distanceValue + 86 : 250)} y2={current.robot.y + Math.sin(current.robot.heading) * (typeof distanceValue === 'number' && distanceValue > 0 ? distanceValue + 86 : 250)} stroke="#e45252" strokeWidth={4} strokeDasharray="12 8" />}
        <g data-testid="sim-robot" transform={`translate(${current.robot.x} ${current.robot.y}) rotate(${current.robot.heading * DEG + 90})`}>
          <g transform={`translate(${-robot.width / 2} ${-robot.length / 2}) scale(${robot.width / 140} ${robot.length / 130})`}>
            <SpikeRobot wheelSpin={current.robot.wheels[0] ?? 0} />
          </g>
          <g transform="translate(-20, -18)">{current.hub.matrix.flatMap((row, y) => row.map((value, x) => <rect key={`${x}:${y}`} x={x * 8} y={y * 8} width={6} height={6} rx={1} fill={value > 0 ? '#fff3a8' : '#343444'} opacity={value > 0 ? value / 100 : 0.8} />))}</g>
          <circle cx={31} cy={2} r={5} fill={current.hub.statusColor} />
        </g>
      </svg>
      <div className="sim-hud">
        <div className="sim-hud-left">
          <span className={`sim-status sim-status-${status}`} role="status">
            <span className="status-dot" aria-hidden="true" />{copy.status[status]}
          </span>
          <span className="sim-time">{copy.time(current.t)}</span>
        </div>
        <div className="sim-hud-right">
          <span>{copy.distance}: <strong>{distanceLabel}</strong></span>
          <span>{copy.heading}: <strong>{copy.degrees(current.robot.heading * DEG)}</strong></span>
        </div>
      </div>
      {showError && execution?.error && <div className="sim-run-error" role="alert">{en.studio.runtimeErrors[execution.error.code]}</div>}
      <div className="sim-controls">
        <button className="sim-btn sim-btn-run" onClick={status === 'running' ? pause : playStage} disabled={!run || !canRun} title="F5 / Ctrl+Enter">
          {hasBlocks && !execution ? en.studio.preparing : status === 'running' ? copy.pause : copy.run}
        </button>
        <button className="sim-btn" onClick={stop} disabled={!run || status === 'ready'}>{en.studio.stop}</button>
        <button className="sim-btn" onClick={stepStage} disabled={!run} title="F10">{en.studio.step}</button>
        <button className="sim-btn" onClick={resetStage}>{copy.reset}</button>
        <div className="sim-speed" role="group" aria-label={copy.playbackSpeed}>
          {[0.5, 1, 2, 4].map((value) => (
            <button key={value} className={speed === value ? 'is-active' : ''} aria-pressed={speed === value} onClick={() => setSpeed(value)}>
              {copy.speed(value)}
            </button>
          ))}
        </div>
      </div>
      <div className="sim-view-tools">
        <button className="sim-btn" onClick={() => setShowTrail(!showTrail)} aria-pressed={showTrail}>{showTrail ? copy.hidePath : copy.showPath}</button>
        <button className="sim-btn" aria-pressed={showSensors} onClick={() => setShowSensors(!showSensors)}>{en.studio.sensorLens}</button>
        <button className="sim-btn" aria-pressed={sound} onClick={() => { if (!sound) unlockSound(true); if (onSoundChange) onSoundChange(!sound); else setSound(!sound); }}>{en.studio.sound}</button>
        <button className="sim-btn" aria-pressed={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? en.studio.restoreLayout : en.studio.fullStage}</button>
        <input type="range" aria-label={en.studio.replay} min={0} max={run?.end.t || 1} step={0.01} value={current.t} disabled={!run} onChange={(event) => seek(Number(event.target.value))} />
      </div>
    </div>
  );
}
