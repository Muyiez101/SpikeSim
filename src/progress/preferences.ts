import { z } from 'zod';
import { brand } from '../shared/brand';
import type { Preferences } from '../shared/types';

export const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark']),
  textSize: z.enum(['small', 'medium', 'large']),
  reducedMotion: z.boolean(),
  sound: z.boolean(),
});
export const defaultPreferences: Preferences = {
  theme: 'light', textSize: 'medium', reducedMotion: false, sound: false,
};
export function readPreferences(storage: Pick<Storage, 'getItem'>): Preferences {
  try {
    const raw = storage.getItem(brand.storageKey);
    if (!raw) return { ...defaultPreferences };
    const parsed = preferencesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : { ...defaultPreferences };
  } catch { return { ...defaultPreferences }; }
}
export function writePreferences(storage: Pick<Storage, 'setItem'>, value: Preferences): boolean {
  try { storage.setItem(brand.storageKey, JSON.stringify(preferencesSchema.parse(value))); return true; }
  catch { return false; }
}
