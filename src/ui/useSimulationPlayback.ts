import { useCallback, useEffect, useRef, useState } from 'react';
import type { SimResult } from '../sim/types';

type PlayStatus = 'ready' | 'running' | 'paused' | 'stopped' | 'complete';

/** Plays recorded simulation time; changing speed only affects future time. */
export function useSimulationPlayback(run: SimResult | null, onComplete: () => void) {
  const [status, setStatus] = useState<PlayStatus>('ready');
  const [frame, setFrame] = useState(0);
  const [speed, setSpeed] = useState(1);
  const elapsed = useRef(0);
  const lastTime = useRef(0);

  useEffect(() => {
    if (status !== 'running' || !run) return;
    lastTime.current = performance.now();
    let request: number;
    const tick = (now: number) => {
      elapsed.current = Math.min(run.end.t, elapsed.current + (now - lastTime.current) / 1000 * speed);
      lastTime.current = now;
      // Command boundaries add extra snapshots, so frame spacing is not uniform.
      let low = 0;
      let high = run.snapshots.length - 1;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (run.snapshots[middle].t <= elapsed.current) low = middle;
        else high = middle - 1;
      }
      setFrame(low);
      if (elapsed.current >= run.end.t) {
        setStatus('complete');
        onComplete();
      } else {
        request = requestAnimationFrame(tick);
      }
    };
    request = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(request); };
  }, [run, status, speed, onComplete]);

  const play = useCallback(() => {
    if (!run) return;
    if (status === 'ready' || status === 'complete' || status === 'stopped') {
      elapsed.current = 0;
      setFrame(0);
    }
    setStatus('running');
  }, [run, status]);

  const pause = useCallback(() => {
    if (status === 'running') setStatus('paused');
  }, [status]);

  const reset = useCallback(() => {
    elapsed.current = 0;
    setFrame(0);
    setStatus('ready');
  }, []);

  const seek = useCallback((seconds: number) => {
    if (!run) return;
    elapsed.current = Math.max(0, Math.min(run.end.t, seconds));
    let index = 0;
    while (index + 1 < run.snapshots.length && run.snapshots[index + 1].t <= elapsed.current) index++;
    setFrame(index);
    setStatus(elapsed.current >= run.end.t ? 'complete' : 'paused');
    if (elapsed.current >= run.end.t) onComplete();
  }, [run, onComplete]);
  const stop = useCallback(() => { setStatus('stopped'); }, []);

  return { status, frame, speed, setSpeed, play, pause, reset, seek, stop };
}
