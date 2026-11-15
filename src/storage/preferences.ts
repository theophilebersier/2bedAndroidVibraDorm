export interface Preferences { level: number; minutes: number }
const key = 'dual-bed-sync:preferences:v1';
export function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<Preferences>;
    return {
      level: Number.isInteger(saved.level) && saved.level! >= 1 && saved.level! <= 255 ? saved.level! : 180,
      minutes: Number.isInteger(saved.minutes) && saved.minutes! >= 0 && saved.minutes! <= 1439 ? saved.minutes! : 30,
    };
  } catch { return { level: 180, minutes: 30 }; }
}
export function savePreferences(value: Preferences): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing/storage full: continue in memory. */ }
}
