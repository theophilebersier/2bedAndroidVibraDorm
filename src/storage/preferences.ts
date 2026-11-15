import { preferenceKey, readStored, writeStored } from './persistent';
import type { Target } from '../transport/types';

export type Theme = 'system' | 'light' | 'dark';
export interface Preferences {
  level: number; minutes: number; showLight: boolean;
  theme: Theme; leftName: string; rightName: string;
  defaultTarget: Target; simpleMode: boolean; haptics: boolean;
}
const defaults: Preferences = {
  level: 180, minutes: 30, showLight: false,
  theme: 'system', leftName: '', rightName: '',
  defaultTarget: 'both', simpleMode: false, haptics: true,
};
export function cleanName(value: unknown): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 32) : '';
}
export function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(readStored(preferenceKey) ?? '{}') as Partial<Preferences>;
    return {
      showLight: saved.showLight === true,
      level: Number.isInteger(saved.level) && saved.level! >= 1 && saved.level! <= 255 ? saved.level! : defaults.level,
      minutes: Number.isInteger(saved.minutes) && saved.minutes! >= 0 && saved.minutes! <= 1439 ? saved.minutes! : defaults.minutes,
      theme: saved.theme === 'light' || saved.theme === 'dark' ? saved.theme : 'system',
      leftName: cleanName(saved.leftName), rightName: cleanName(saved.rightName),
      defaultTarget: saved.defaultTarget === 'left' || saved.defaultTarget === 'right' ? saved.defaultTarget : 'both',
      simpleMode: saved.simpleMode === true,
      haptics: typeof saved.haptics === 'boolean' ? saved.haptics : true,
    };
  } catch { return { ...defaults }; }
}
// Keep rapid edits in order on the asynchronous native storage bridge.
let saving = Promise.resolve();
export function savePreferences(value: Preferences): Promise<void> {
  const snapshot = JSON.stringify(value);
  saving = saving.catch(() => {}).then(() => writeStored(preferenceKey, snapshot));
  return saving;
}
