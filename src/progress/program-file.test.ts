// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { exportProgramFile, maxProgramFileBytes, parseProgramFile } from './program-file';
import type { PlaygroundDraft } from './playground';
import { templateRobot, practiceWorlds, competitionFields } from '../sim/gears-catalog';

const draft: PlaygroundDraft = {
  missionId: 'basics-1',
  steps: [{ id: 'move-1', command: { type: 'move', distanceMm: -580, speedPercent: 70 } }],
  outcome: { stars: 3, goals: [{ label: 'Reach the pad', passed: true }] },
};

describe('program files', () => {
  it('restores bundled worlds and robot ports and rejects unbundled scene paths', () => {
    const robot=templateRobot('crane');
    const file=exportProgramFile('Crane course',{...draft,missionId:null,scene:practiceWorlds[0].id,robotTemplate:'crane',robot});
    const restored=parseProgramFile(file.content,[]);
    expect(restored.ok&&restored.program.robot).toEqual(robot);
    expect(restored.ok&&restored.program.scene).toBe(practiceWorlds[0].id);
    const data=JSON.parse(file.content);
    for(const scene of ['https://example.com/world.json','worlds/missions/../../index.html','world:missing'])expect(parseProgramFile(JSON.stringify({...data,scene}),[]).ok).toBe(false);
    expect(parseProgramFile(JSON.stringify({...data,scene:competitionFields[0].file}),[]).ok).toBe(true);
  });
  it('round trips the exact program and mission without transferring a score', () => {
    const file = exportProgramFile('  My reverse route  ', draft);
    expect(file.name).toBe('spikesim-My-reverse-route.rlproj');
    expect(parseProgramFile(file.content, ['basics-1'])).toEqual({ ok: true, program: {
      schemaVersion: 1, kind: 'spikesim-program', name: 'My reverse route', missionId: 'basics-1', steps: draft.steps,
    } });
    expect(file.content).not.toContain('stars');
    expect(parseProgramFile(exportProgramFile('Free play', { ...draft, missionId: null }).content, []).ok).toBe(true);
  });

  it('rejects unknown missions, unsupported formats, invalid commands, and oversized files', () => {
    const valid = JSON.parse(exportProgramFile('Example', draft).content);
    expect(parseProgramFile(JSON.stringify(valid), [])).toEqual({ ok: false, error: 'unknownMission' });
    for (const content of ['{bad json', 'null', JSON.stringify({ ...valid, schemaVersion: 2 }), JSON.stringify({ ...valid, kind: 'robot' }), JSON.stringify({ ...valid, steps: [draft.steps[0], draft.steps[0]] }), JSON.stringify({ ...valid, steps: [{ id: 'bad', command: { type: 'move', distanceMm: 20, speedPercent: 0 } }] })]) {
      expect(parseProgramFile(content, ['basics-1'])).toEqual({ ok: false, error: 'invalid' });
    }
    expect(parseProgramFile(' '.repeat(maxProgramFileBytes + 1), [])).toEqual({ ok: false, error: 'tooLarge' });
    expect(parseProgramFile('é'.repeat(maxProgramFileBytes), [])).toEqual({ ok: false, error: 'tooLarge' });
  });

  it('creates a safe filename and strips unrelated imported fields', () => {
    const file = exportProgramFile('../../CON: unsafe?', draft);
    expect(file.name).toBe('spikesim-CON-unsafe.rlproj');
    const incoming = { ...JSON.parse(file.content), outcome: draft.outcome, python: 'malicious()', extra: true };
    const result = parseProgramFile(JSON.stringify(incoming), ['basics-1']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.program).not.toHaveProperty('outcome');
      expect(result.program).not.toHaveProperty('python');
      expect(result.program).not.toHaveProperty('extra');
    }
  });
});
