import { SIDES, type Side } from '../transport/types';

export interface RememberedDevice { id: string; automatic: boolean }
export type RememberedDevices = Partial<Record<Side, RememberedDevice>>;
const key = 'dual-bed-sync:devices:v1';

export function readDevices(): RememberedDevices {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result: RememberedDevices = {};
    for (const side of SIDES) {
      const record = (value as RememberedDevices)[side];
      if (record && typeof record.id === 'string' && record.id.length > 0 &&
          record.id.length <= 1024 && typeof record.automatic === 'boolean') {
        result[side] = { id: record.id, automatic: record.automatic };
      }
    }
    // A corrupt attribution must never reconnect one receiver as both beds.
    if (result.left?.id === result.right?.id) return {};
    return result;
  } catch { return {}; }
}

export function saveDevices(value: RememberedDevices): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Continue in memory if storage is unavailable. */ }
}
