export interface Preferences { level: number; minutes: number; showLight: boolean }
import { preferenceKey, readStored, writeStored } from './persistent';
export function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(readStored(preferenceKey) ?? '{}') as Partial<Preferences>;
    return {
      showLight: saved.showLight === true,
      level: Number.isInteger(saved.level) && saved.level! >= 1 && saved.level! <= 255 ? saved.level! : 180,
      minutes: Number.isInteger(saved.minutes) && saved.minutes! >= 0 && saved.minutes! <= 1439 ? saved.minutes! : 30,
    };
  } catch { return { level: 180, minutes: 30, showLight: false }; }
}
export function savePreferences(value: Preferences): void {
  void writeStored(preferenceKey, JSON.stringify(value)).catch(() => { /* Light preferences are optional. */ });
}
