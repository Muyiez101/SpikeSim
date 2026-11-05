// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  emptyPlayground, getPlaygroundDraft, playgroundCommandSchema, playgroundKey,
  programStepsSchema, readPlayground, replacePlaygroundDraft, writePlayground,
  type PlaygroundDraft,
} from './playground';

const missionIds = ['basics-1', 'basics-2'];
const steps: PlaygroundDraft['steps'] = [
  { id: 'move-1', command: { type: 'move', distanceMm: 580, speedPercent: 60 } },
  { id: 'turn-1', command: { type: 'turn', degrees: -90, speedPercent: 40 } },
  { id: 'wait-1', command: { type: 'wait', durationMs: 2200 } },
];

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe('playground persistence', () => {
  it('restores separate mission and Free play programs, results, and workspace selections', () => {
    const store = storage();
    const mission: PlaygroundDraft = { missionId: 'basics-1', steps, outcome: { stars: 3, goals: [{ label: 'Reach the pad', passed: true }] } };
    const freePlay: PlaygroundDraft = { missionId: null, steps: [steps[1]], outcome: null };
    const state = replacePlaygroundDraft(replacePlaygroundDraft(emptyPlayground(missionIds), mission), freePlay);
    state.selected.home = 'basics-2';
    expect(writePlayground(store, state)).toBe(true);
    expect(readPlayground(store, missionIds)).toEqual({ state, saveStatus: 'saved' });
    expect(getPlaygroundDraft(state, 'basics-1')).toEqual(mission);
    expect(getPlaygroundDraft(state, null)).toEqual(freePlay);
    expect(getPlaygroundDraft(state, 'basics-2').steps).toEqual([]);
  });

  it('rejects corrupt, unsupported, and oversized saves without overwriting them', () => {
    const store = storage();
    for (const raw of ['{bad json', JSON.stringify({ ...emptyPlayground(missionIds), schemaVersion: 2 }), ' '.repeat(1_000_001)]) {
      store.setItem(playgroundKey, raw);
      expect(readPlayground(store, missionIds)).toEqual({ state: emptyPlayground(missionIds), saveStatus: 'recovered' });
      expect(store.getItem(playgroundKey)).toBe(raw);
    }
  });

  it('recovers removed mission selections while keeping valid drafts', () => {
    const store = storage();
    const state = emptyPlayground(missionIds);
    state.selected = { home: 'removed-mission', play: 'removed-mission' };
    state.drafts = [
      { missionId: 'removed-mission', steps, outcome: null },
      { missionId: 'basics-1', steps, outcome: null },
    ];
    expect(writePlayground(store, state)).toBe(true);
    const restored = readPlayground(store, missionIds);
    expect(restored.saveStatus).toBe('recovered');
    expect(restored.state.selected).toEqual({ home: 'basics-1', play: null });
    expect(restored.state.drafts).toEqual([state.drafts[1]]);
  });

  it('reports unavailable or full storage without pretending a save succeeded', () => {
    const state = emptyPlayground(missionIds);
    expect(readPlayground({ getItem: () => { throw new Error('Denied'); } }, missionIds).saveStatus).toBe('error');
    expect(readPlayground(null, missionIds).saveStatus).toBe('error');
    expect(writePlayground(null, state)).toBe(false);
    expect(writePlayground({ setItem: () => { throw new Error('Quota exceeded'); } }, state)).toBe(false);
  });

  it('replaces a single mission without losing another mission or mutating the old state', () => {
    const original = replacePlaygroundDraft(emptyPlayground(missionIds), { missionId: 'basics-1', steps, outcome: null });
    const updated = replacePlaygroundDraft(original, { missionId: 'basics-2', steps: [steps[2]], outcome: null });
    const cleared = replacePlaygroundDraft(updated, { missionId: 'basics-1', steps: [], outcome: null });
    expect(getPlaygroundDraft(original, 'basics-1').steps).toEqual(steps);
    expect(getPlaygroundDraft(cleared, 'basics-1').steps).toEqual([]);
    expect(getPlaygroundDraft(cleared, 'basics-2').steps).toEqual([steps[2]]);
  });
});

describe('saved command validation', () => {
  it('accepts reverse moves and left turns, but rejects invalid speeds and unbounded values', () => {
    expect(playgroundCommandSchema.safeParse({ type: 'move', distanceMm: -580, speedPercent: 60 }).success).toBe(true);
    expect(playgroundCommandSchema.safeParse(steps[1].command).success).toBe(true);
    for (const command of [
      { type: 'move', distanceMm: 580, speedPercent: 0 },
      { type: 'turn', degrees: 90, speedPercent: -40 },
      { type: 'move', distanceMm: 3001, speedPercent: 60 },
      { type: 'turn', degrees: 361, speedPercent: 40 },
      { type: 'wait', durationMs: 60_001 },
      { type: 'wait', durationMs: -1 },
      { type: 'move', distanceMm: Infinity, speedPercent: 60 },
      { type: 'move', distanceMm: NaN, speedPercent: 60 },
    ]) expect(playgroundCommandSchema.safeParse(command).success).toBe(false);
  });

  it('rejects duplicate step IDs, excessive step counts, and duplicate mission drafts', () => {
    expect(programStepsSchema.safeParse([steps[0], steps[0]]).success).toBe(false);
    expect(programStepsSchema.safeParse(Array.from({ length: 61 }, (_, i) => ({ ...steps[0], id: String(i) }))).success).toBe(false);
    const state = emptyPlayground(missionIds);
    const draft = { missionId: 'basics-1', steps, outcome: null };
    state.drafts = [draft, draft];
    expect(writePlayground(storage(), state)).toBe(false);
  });
});
