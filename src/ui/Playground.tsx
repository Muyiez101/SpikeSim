import { useCallback, useMemo, useState } from 'react';
import { missions, missionWorldMap, worlds, missionsById } from '../missions/content';
import { missionGoalLabel } from '../missions/engine';
import { robotPresets } from '../sim/presets';
import { mapFiles } from '../sim/maps';
import type { SimCommand } from '../sim/types';
import { en } from '../shared/strings/en';
import { SimulatorStage } from './SimulatorStage';
import { maxProgramSteps, type PlaygroundDraft, type WorkspaceId } from '../progress/playground';
import { ProgramStepEditor } from './ProgramStepEditor';
import { ProgramFiles } from './ProgramFiles';
import { SaveConflict } from './SaveConflict';
import type { usePlaygroundDrafts } from './usePlaygroundDrafts';

const copy = en.playground;
type DraftController = ReturnType<typeof usePlaygroundDrafts>;

/** The existing command playground, backed by the deterministic simulator. */
export function Playground({ workspace, drafts }: { workspace: WorkspaceId; drafts: DraftController }) {
  const missionId = drafts.state.selected[workspace];
  return <PlaygroundSession key={`${workspace}:${missionId ?? 'free-play'}:${drafts.resetKey}`} workspace={workspace} missionId={missionId} draft={drafts.getDraft(missionId)} drafts={drafts} />;
}

function PlaygroundSession({ workspace, missionId, draft, drafts }: { workspace: WorkspaceId; missionId: string | null; draft: PlaygroundDraft; drafts: DraftController }) {
  const { steps, outcome } = draft;
  const program = useMemo(() => steps.map((step) => step.command), [steps]);
  const [hintLevel, setHintLevel] = useState(0);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(() => new Set());
  const canRun = invalidFields.size === 0;
  const mission = missionId ? missionsById[missionId] : null;
  const map = useMemo(() => mission ? missionWorldMap(mission) : mapFiles['open-floor'], [mission]);
  const robot = robotPresets[mission?.robotPreset ?? 'driving-base'];
  const activeWorld = mission ? worlds.find((world) => world.id === mission.worldId) : null;
  const worldMissions = activeWorld ? missions.filter((item) => activeWorld.missionIds.includes(item.id)) : [];
  const hintCount = mission?.hints.length ?? 0;
  const hint = mission && hintLevel > 0 ? mission.hints[hintLevel - 1] : null;
  const { setOutcome } = drafts;
  const clearOutcome = useCallback(() => { setOutcome(missionId, null); }, [setOutcome, missionId]);
  const onMissionResult = useCallback(
    (stars: number, goals: { label: string; passed: boolean }[]) => { setOutcome(missionId, { stars, goals }); }, [setOutcome, missionId],
  );

  const addCommand = (command: SimCommand) => {
    if (steps.length >= maxProgramSteps) return;
    drafts.updateSteps(missionId, [...steps, { id: crypto.randomUUID(), command }]);
  };
  const selectMission = (id: string | null) => { drafts.selectMission(workspace, id); };
  const onValidity = useCallback((fieldId: string, valid: boolean) => {
    setInvalidFields((current) => {
      if (current.has(fieldId) === !valid) return current;
      const next = new Set(current);
      if (valid) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  }, []);
  const removeStep = (id: string) => {
    drafts.updateSteps(missionId, steps.filter((step) => step.id !== id));
    setInvalidFields((current) => new Set([...current].filter((field) => !field.startsWith(`${id}:`))));
  };

  return (
    <div className="playground">
      <aside className="pg-left">
        <div className="pg-panel">
          <h1 className="pg-panel-title">{copy.title}</h1>
          {drafts.saveStatus === 'conflict' ? <SaveConflict drafts={drafts} /> : <div className={`pg-save-status pg-save-${drafts.saveStatus}`} role={drafts.saveStatus === 'error' ? 'alert' : 'status'}>
            {copy.saveStatus[drafts.saveStatus]}
            {drafts.saveStatus === 'error' && <button className="pg-save-retry" onClick={drafts.retrySave}>{copy.retrySave}</button>}
          </div>}
          <ProgramFiles draft={draft} canExport={canRun} getDraft={drafts.getDraft}
            onNamed={(name) => { drafts.nameProgram(missionId, name); }}
            onImport={(imported) => {
              setInvalidFields(new Set()); setHintLevel(0);
              drafts.importProgram(workspace, imported);
            }} />
          {steps.length > 0 && <p className="pg-edit-hint">{copy.editHint}</p>}
          <div className="pg-program">
            {steps.length === 0 ? <p className="pg-empty">{copy.empty}</p> : steps.map((step, index) => (
              <ProgramStepEditor key={step.id} step={step} index={index} onValidity={onValidity}
                onChange={(command) => drafts.updateSteps(missionId, steps.map((item) => item.id === step.id ? { ...item, command } : item))}
                onRemove={() => removeStep(step.id)} />
            ))}
          </div>
          {!canRun && <p className="pg-field-error" role="alert">{copy.fixFields}</p>}
          <fieldset className="pg-palette" disabled={steps.length >= maxProgramSteps} aria-label={en.workspace.palette}>
            <button onClick={() => addCommand({ type: 'move', distanceMm: 300, speedPercent: 60 })}>{copy.moveForward}</button>
            <button onClick={() => addCommand({ type: 'move', distanceMm: -300, speedPercent: 60 })}>{copy.moveBack}</button>
            <button onClick={() => addCommand({ type: 'turn', degrees: 90, speedPercent: 40 })}>{copy.turnRight}</button>
            <button onClick={() => addCommand({ type: 'turn', degrees: -90, speedPercent: 40 })}>{copy.turnLeft}</button>
            <button onClick={() => addCommand({ type: 'turn', degrees: 45, speedPercent: 40 })}>{copy.turnHalf}</button>
            <button onClick={() => addCommand({ type: 'wait', durationMs: 1000 })}>{copy.wait}</button>
          </fieldset>
          {steps.length >= maxProgramSteps && <p className="pg-edit-hint">{copy.stepLimit(maxProgramSteps)}</p>}
          <button className="pg-clear" onClick={() => { drafts.updateSteps(missionId, []); setInvalidFields(new Set()); }} disabled={steps.length === 0}>{copy.clear}</button>
        </div>
      </aside>
      <div className="pg-center">
        <SimulatorStage map={map} mission={mission ?? undefined} commands={program} worldId={map.id} onMissionResult={onMissionResult} onReset={clearOutcome} canRun={canRun} />
        {outcome && canRun && (
          <div className={`pg-outcome ${outcome.stars > 0 ? 'pg-outcome-win' : ''}`} role="status">
            <h2 className="pg-panel-title pg-last-run">{copy.lastRun}</h2>
            <div className="pg-stars" aria-label={copy.result(outcome.stars)}>
              {[1, 2, 3].map((n) => <span key={n} aria-hidden="true" className={n <= outcome.stars ? 'on' : ''}>★</span>)}
            </div>
            <ul className="pg-goals">
              {outcome.goals.map((goal) => (
                <li key={goal.label} className={goal.passed ? 'done' : ''}>
                  <span aria-label={goal.passed ? copy.goalPassed : copy.goalMissed}>{goal.passed ? '✓' : '○'}</span> {goal.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <aside className="pg-right">
        <div className="pg-panel">
          <label className="pg-panel-title" htmlFor="playground-world">{copy.world}</label>
          <select id="playground-world" value={activeWorld?.id ?? ''} onChange={(event) => selectMission(worlds.find((world) => world.id === event.target.value)?.missionIds[0] ?? null)}>
            <option value="">{copy.freePlay}</option>
            {worlds.map((world) => <option key={world.id} value={world.id}>{world.title}</option>)}
          </select>
        </div>
        {mission ? (
          <div className="pg-panel pg-mission-panel">
            <h2 className="pg-mission-title">{mission.title}</h2>
            <p className="pg-mission-brief">{mission.brief}</p>
            <ul className="pg-goal-list">
              {mission.goals.map((goal, index) => <li key={index}>◆ {missionGoalLabel(goal)}</li>)}
            </ul>
            {hint && <div className="pg-hint">{hint.text}</div>}
            <div className="pg-hint-buttons">
              <button aria-label={copy.previousHint} onClick={() => setHintLevel(hintLevel - 1)} disabled={hintLevel === 0}>←</button>
              <span>{copy.hint(hintLevel, hintCount)}</span>
              <button aria-label={copy.nextHint} onClick={() => setHintLevel(hintLevel + 1)} disabled={hintLevel === hintCount}>→</button>
            </div>
            <div className="pg-mission-nav">
              {worldMissions.map((item) => (
                <button key={item.id} className={item.id === missionId ? 'is-active' : ''} aria-pressed={item.id === missionId} onClick={() => selectMission(item.id)}>{item.title}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="pg-panel">
            <h2 className="pg-panel-title">{copy.freePlay}</h2>
            <p className="pg-mission-brief">{copy.freePlayBrief}</p>
          </div>
        )}
        <div className="pg-panel">
          <h2 className="pg-panel-title">{copy.robot}</h2>
          <p className="pg-robot-line">{copy.robotDetails(robot.name, robot.wheelDiameter, robot.trackWidth)}</p>
        </div>
      </aside>
    </div>
  );
}
