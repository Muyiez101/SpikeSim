import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeterministicSimulator } from '../sim/engine';
import { mapFiles } from '../sim/maps';
import { robotPresets } from '../sim/presets';
import { useSimulationPlayback } from './useSimulationPlayback';

describe('simulation playback', () => {
  let root: Root;
  let container: HTMLDivElement;
  let now: number;
  let nextId: number;
  let frames: Map<number, FrameRequestCallback>;
  let controls: ReturnType<typeof useSimulationPlayback>;
  const complete = vi.fn();
  const run = new DeterministicSimulator({ map: mapFiles['open-floor'], robot: robotPresets['driving-base'] }).run([
    { type: 'wait', durationMs: 10000 },
  ]);

  beforeEach(() => {
    now = 0;
    nextId = 0;
    frames = new Map();
    complete.mockClear();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextId, callback); return nextId; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    function Harness() {
      controls = useSimulationPlayback(run, complete);
      return null;
    }
    act(() => root.render(<Harness />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const advanceTo = (time: number) => {
    now = time;
    const pending = [...frames.values()];
    frames.clear();
    act(() => pending.forEach((callback) => callback(now)));
  };
  const displayedTime = () => run.snapshots[controls.frame].t;

  it('changes speed without rescaling time already played', () => {
    act(() => controls.play());
    advanceTo(2000);
    expect(displayedTime()).toBeCloseTo(2, 1);
    act(() => controls.setSpeed(2));
    advanceTo(2500);
    expect(displayedTime()).toBeCloseTo(3, 1);
    act(() => controls.setSpeed(0.5));
    advanceTo(4500);
    expect(displayedTime()).toBeCloseTo(4, 1);
  });

  it('resumes at double speed without counting the paused time twice', () => {
    act(() => controls.setSpeed(2));
    act(() => controls.play());
    advanceTo(1000);
    act(() => controls.pause());
    advanceTo(6000);
    expect(displayedTime()).toBeCloseTo(2, 1);
    expect(frames.size).toBe(0);
    act(() => controls.play());
    advanceTo(6500);
    expect(displayedTime()).toBeCloseTo(3, 1);
  });

  it('cancels reset playback and finishes a later run exactly once', () => {
    act(() => controls.play());
    advanceTo(2000);
    act(() => controls.reset());
    advanceTo(20000);
    expect(controls.status).toBe('ready');
    expect(displayedTime()).toBe(0);
    expect(complete).not.toHaveBeenCalled();
    act(() => controls.play());
    advanceTo(31000);
    expect(controls.status).toBe('complete');
    expect(displayedTime()).toBe(run.end.t);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });
});
