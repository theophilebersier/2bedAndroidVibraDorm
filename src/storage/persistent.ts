import { Preferences } from '@capacitor/preferences';
import { isAndroid } from '../platform';

export const deviceKey = 'dual-bed-sync:devices:v1';
export const preferenceKey = 'dual-bed-sync:preferences:v1';
const cache = new Map<string, string | null>();

/** SharedPreferences survives process death; localStorage remains the web fallback. */
export async function initializeStorage(): Promise<void> {
  if (!isAndroid()) return;
  for (const key of [deviceKey, preferenceKey]) cache.set(key, (await Preferences.get({ key })).value);
}
export function readStored(key: string): string | null {
  return isAndroid() ? cache.get(key) ?? null : localStorage.getItem(key);
}
export async function writeStored(key: string, value: string): Promise<void> {
  if (isAndroid()) {
    await Preferences.set({ key, value });
    cache.set(key, value);
  } else localStorage.setItem(key, value);
}
