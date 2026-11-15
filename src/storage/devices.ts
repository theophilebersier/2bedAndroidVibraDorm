import { SIDES, type Side } from '../transport/types';
import { deviceKey, readStored, writeStored } from './persistent';
import { isAndroid } from '../platform';

export interface RememberedDevice { id: string; automatic: boolean }
export type RememberedDevices = Partial<Record<Side, RememberedDevice>>;

export function readDevices(): RememberedDevices {
  try {
    const value: unknown = JSON.parse(readStored(deviceKey) ?? '{}');
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

export async function saveDevices(value: RememberedDevices): Promise<void> {
  try { await writeStored(deviceKey, JSON.stringify(value)); }
  catch {
    if (isAndroid()) throw new Error('Impossible de mémoriser les sommiers dans Android. Libère du stockage puis réessaie.');
    // The web app can continue for the current session if localStorage is unavailable.
  }
}
