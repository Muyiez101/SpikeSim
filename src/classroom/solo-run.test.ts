// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { fromCommands, type VisualProgram } from '../editor/program';
import { executeVisualProgram } from '../runtime/visual-runtime';
import { en } from '../shared/strings/en';
import { challengeIds, challengeEquipment, initialSoloFrame, soloStandings, type AttemptResult, type ChallengeId } from './challenges';
import { runSoloAttempt } from './solo-run';
import { importProgram } from './files';

function attempt(challenge: ChallengeId, program: VisualProgram, seconds = 120) {
  return { id: randomUUID(), round: 1, entryId: randomUUID(), entryName: 'Ada', revision: 1, program, challenge, seconds, startedAt: 1000 };
}
describe('timed arena scoring', () => {
  for (const id of challengeIds) it(`${id} has a passing reference under the competition rules`, () => {
    const { mission } = challengeEquipment(id);
    const input = attempt(id, mission.visualReference ?? fromCommands(mission.reference));
    const result = runSoloAttempt(input);
    expect(result.verdict.error).toBeNull();
    expect(result.verdict.completed).toBe(true);
    expect(result.verdict.goals.every(g => g.passed)).toBe(true);
    expect(result.verdict.seconds).toBeLessThan(120);
    expect(runSoloAttempt(input)).toEqual(result);
  });
  it('honours teacher deadlines above the ordinary 30-second forever preview', () => {
    const wait = fromCommands([{ type: 'wait', durationMs: 1000 }]).blocks.blocks[0].next!.block;
    const program = fromCommands([]);
    program.blocks.blocks[0].next = { block: { type: 'spike_forever', inputs: { DO: { block: wait } } } };
    const { map, robot } = challengeEquipment('basics-4');
    expect(executeVisualProgram(program, map, robot).limitedPreview).toBe(true);
    for (const seconds of [10, 45, 120]) {
      const result = runSoloAttempt(attempt('basics-4', program, seconds));
      expect(result.verdict.completed).toBe(false);
      expect(result.verdict.seconds).toBeCloseTo(seconds, 2);
      expect(result.verdict.error).toBe(en.classroom.timeUp);
      expect(result.snapshots.at(-1)!.t).toBeLessThanOrEqual(seconds + 1 / 120);
    }
  });
  it('rejects an unknown arena and never completes an empty failed program', () => {
    const empty = attempt('basics-4', fromCommands([]));
    expect(runSoloAttempt(empty).verdict.completed).toBe(false);
    expect(() => runSoloAttempt({ ...empty, challenge: 'unscored-fll' })).toThrow();
    expect(() => runSoloAttempt({ ...empty, seconds: 1000 })).toThrow();
  });
  it('ranks success before fast failures, shares equal ranks and excludes void attempts', () => {
    const result = (entryId: string, completed: boolean, seconds: number, goals = 2, voided = false): AttemptResult => ({
      ...attempt('basics-4', fromCommands([])), entryId, finishedAt: 2000, void: voided,
      frame: initialSoloFrame('basics-4'),
      verdict: { completed, seconds, goals: [0, 1].map(i => ({ label: String(i), passed: i < goals })), error: completed ? null : 'Incomplete' },
    });
    const entries = ['fast-fail', 'slow-success', 'tie', 'not-run'].map(id => ({ id, name: id }));
    const rows = soloStandings(entries, [result('fast-fail', false, 0), result('slow-success', true, 8), result('tie', true, 8), result('fast-fail', true, 1, 2, true)]);
    expect(rows.map(r => [r.entryId, r.rank])).toEqual([['slow-success', 1], ['tie', 1], ['fast-fail', 3], ['not-run', 4]]);
    expect(rows[2].seconds).toBeNull();
    expect(rows[2].attempts).toBe(1);
  });
  it('imports normal project blocks into the fixed arena without importing its equipment', async () => {
    const program = fromCommands([{ type: 'move', distanceMm: 580, speedPercent: 70 }]);
    const file = new File([JSON.stringify({ schemaVersion: 1, kind: 'spikesim-program', name: 'My route', missionId: 'basics-4', steps: [], visualProgram: program })], 'route.rlproj');
    expect(await importProgram(file, 'challenge')).toEqual(program);
    await expect(importProgram(new File(['{}'], 'broken.rlproj'), 'challenge')).rejects.toThrow();
  });
});
