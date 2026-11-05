import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playgroundKey, type ProgramStep } from '../progress/playground';
import { usePlaygroundDrafts } from './usePlaygroundDrafts';

describe('app-level playground drafts', () => {
  let root: Root;
  let container: HTMLDivElement;
  let drafts: ReturnType<typeof usePlaygroundDrafts>;
  const steps: ProgramStep[] = [{ id: 'move-1', command: { type: 'move', distanceMm: 580, speedPercent: 60 } }];

  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    function Harness() { drafts = usePlaygroundDrafts(); return null; }
    act(() => root.render(<Harness />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('keeps unsaved edits in memory and retries them without losing another draft', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    act(() => { drafts.updateSteps('basics-1', steps); });
    expect(drafts.saveStatus).toBe('error');
    expect(drafts.getDraft('basics-1').steps).toEqual(steps);
    act(() => { drafts.selectMission('home', 'basics-2'); });
    act(() => { drafts.updateSteps('basics-2', [{ id: 'wait-1', command: { type: 'wait', durationMs: 1000 } }]); });
    expect(drafts.getDraft('basics-1').steps).toEqual(steps);
    expect(window.localStorage.getItem(playgroundKey)).toBeNull();
    write.mockRestore();
    act(() => { drafts.retrySave(); });
    expect(drafts.saveStatus).toBe('saved');
    const stored = JSON.parse(window.localStorage.getItem(playgroundKey) ?? '{}');
    expect(stored.drafts).toHaveLength(2);
    expect(stored.selected.home).toBe('basics-2');
  });

  it('clears only the edited program result and rejects invalid commands', () => {
    act(() => { drafts.updateSteps('basics-1', steps); });
    act(() => { drafts.setOutcome('basics-1', { stars: 3, goals: [{ label: 'Reached the pad', passed: true }] }); });
    act(() => { drafts.updateSteps('basics-2', steps); });
    expect(drafts.getDraft('basics-1').outcome?.stars).toBe(3);
    act(() => { drafts.updateSteps('basics-1', [{ ...steps[0], command: { type: 'move', distanceMm: 580, speedPercent: 0 } }]); });
    expect(drafts.getDraft('basics-1').outcome?.stars).toBe(3);
    expect(drafts.getDraft('basics-1').steps).toEqual(steps);
    act(() => { drafts.updateSteps('basics-1', []); });
    expect(drafts.getDraft('basics-1').outcome).toBeNull();
    expect(drafts.getDraft('basics-2').steps).toEqual(steps);
  });

  it('imports into the selected workspace, preserves other programs, and clears untrusted results', () => {
    act(() => { drafts.updateSteps('basics-1', steps); drafts.setOutcome('basics-1', { stars: 3, goals: [] }); });
    act(() => { drafts.updateSteps(null, steps); });
    act(() => { drafts.importProgram('play', { schemaVersion: 1, kind: 'spikesim-program', name: 'New route', missionId: 'basics-1', steps }); });
    expect(drafts.state.selected.play).toBe('basics-1');
    expect(drafts.getDraft('basics-1').outcome).toBeNull();
    expect(drafts.getDraft('basics-1').name).toBe('New route');
    expect(drafts.getDraft('basics-1').steps[0].id).not.toBe(steps[0].id);
    expect(drafts.getDraft('basics-1').steps[0].command).toEqual(steps[0].command);
    expect(drafts.getDraft(null).steps).toEqual(steps);
    act(() => { drafts.updateSteps('basics-1', steps); });
    expect(drafts.getDraft('basics-1').name).toBe('New route');
  });

  it('detects a foreign write before its event arrives and loads it only when chosen', () => {
    act(() => { drafts.updateSteps('basics-1', steps); });
    const remote = { ...drafts.state, drafts: [{ missionId: 'basics-1', steps: [{ id: 'remote', command: { type: 'wait', durationMs: 2500 } }], outcome: null }] };
    const raw = JSON.stringify(remote);
    window.localStorage.setItem(playgroundKey, raw);
    act(() => { drafts.updateSteps('basics-1', []); });
    expect(drafts.saveStatus).toBe('conflict');
    expect(drafts.getDraft('basics-1').steps).toEqual([]);
    expect(window.localStorage.getItem(playgroundKey)).toBe(raw);
    act(() => { drafts.retrySave(); });
    expect(window.localStorage.getItem(playgroundKey)).toBe(raw);
    act(() => { drafts.useSavedVersion(); });
    expect(drafts.saveStatus).toBe('saved');
    expect(drafts.getDraft('basics-1').steps).toEqual(remote.drafts[0].steps);
    expect(drafts.resetKey).toBe(1);
  });

  it('retains local work when a foreign save is broken and can explicitly keep this tab', () => {
    act(() => { drafts.updateSteps('basics-1', steps); });
    window.localStorage.setItem(playgroundKey, '{bad json');
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: playgroundKey })); });
    expect(drafts.saveStatus).toBe('conflict');
    expect(drafts.savedVersionUnavailable).toBe(true);
    act(() => { expect(drafts.useSavedVersion()).toBe(false); });
    expect(drafts.getDraft('basics-1').steps).toEqual(steps);
    expect(window.localStorage.getItem(playgroundKey)).toBe('{bad json');
    act(() => { drafts.keepThisTab(); });
    expect(drafts.saveStatus).toBe('saved');
    expect(JSON.parse(window.localStorage.getItem(playgroundKey) ?? '{}').drafts[0].steps).toEqual(steps);
  });
});
