import { useCallback, useEffect, useRef } from 'react';
import type { SimResult } from '../sim/types';

/** Synthesize offline tones from the same clock as the visible replay. */
export function useSimulationSound(run: SimResult | null, time: number, running: boolean, speed: number, enabled: boolean) {
  const context = useRef<AudioContext | null>(null);
  const tones = useRef(new Map<number, OscillatorNode>());
  const unlock = useCallback((force = false) => {
    if ((!enabled && !force) || !window.AudioContext) return;
    context.current ??= new AudioContext();
    void context.current.resume();
  }, [enabled]);
  useEffect(() => {
    const audio = context.current;
    const playing = tones.current;
    const sounds = run?.events.filter((event) => event.type === 'sound') ?? [];
    const active = new Set<number>();
    if (audio && running && enabled) sounds.forEach((event, index) => {
      const end = event.data.t + event.data.durationMs / 1000;
      if (time < event.data.t || time >= end) return;
      active.add(index);
      if (playing.has(index)) return;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = event.data.frequency;
      gain.gain.setValueAtTime(0, audio.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, audio.currentTime + 0.01);
      gain.gain.setTargetAtTime(0, audio.currentTime + Math.max(0.01, (end - time) / speed - 0.02), 0.01);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(); playing.set(index, oscillator);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
    for (const [index, oscillator] of playing) if (!active.has(index)) { oscillator.stop(); playing.delete(index); }
  }, [run, time, running, speed, enabled]);
  useEffect(() => {
    const playing = tones.current;
    return () => { for (const oscillator of playing.values()) oscillator.stop(); playing.clear(); void context.current?.close(); };
  }, []);
  return unlock;
}
