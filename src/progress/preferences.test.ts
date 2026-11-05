import { describe, expect, it } from 'vitest';
import { defaultPreferences, readPreferences, writePreferences } from './preferences';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('preferences', () => {
  it('uses the defaults when storage is empty or invalid', () => {
    const store = storage();
    expect(readPreferences(store)).toEqual(defaultPreferences);
    store.setItem('spikesim.preferences.v1', '{bad json');
    expect(readPreferences(store)).toEqual(defaultPreferences);
  });

  it('round trips valid settings', () => {
    const store = storage();
    const value = { theme: 'dark' as const, textSize: 'large' as const, reducedMotion: true, sound: true };
    expect(writePreferences(store, value)).toBe(true);
    expect(readPreferences(store)).toEqual(value);
  });
});
