import { executeVisualProgram } from '../runtime/visual-runtime';
import { checkMission } from '../missions/engine';
import { en } from '../shared/strings/en';
import { attemptSchema, challengeEquipment, validateSoloProgram } from './challenges';

/** The host evaluates locked programs; clients never submit scores. */
export function runSoloAttempt(input: unknown) {
  const attempt = attemptSchema.parse(input);
  const { mission, map, robot } = challengeEquipment(attempt.challenge);
  const execution = executeVisualProgram(validateSoloProgram(attempt.program), map, robot, 1, attempt.seconds);
  const checked = checkMission(mission, execution.result, map, execution);
  const time = execution.result.end.t;
  const error = execution.error
    ? execution.error.code === 'limit' && time >= attempt.seconds - 1 / 120
      ? en.classroom.timeUp
      : en.studio.runtimeErrors[execution.error.code]
    : execution.limitedPreview ? en.classroom.soloIncomplete : null;
  return {
    snapshots: execution.result.snapshots,
    verdict: {
      completed: checked.passed && !error,
      goals: checked.goals.map(g => ({ label: g.label, passed: g.passed })),
      seconds: Math.round(time * 1000) / 1000,
      error,
    },
  };
}
