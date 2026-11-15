import { beforeEach, expect, it, vi } from 'vitest';
const native = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock('@capacitor/preferences', () => ({ Preferences: native }));
vi.mock('../../src/platform', () => ({ isAndroid: () => true }));
beforeEach(() => { vi.resetModules(); vi.resetAllMocks(); });

it('reads Android preferences before returning remembered devices after process restart', async () => {
  native.get.mockImplementation(async ({ key }) => ({ value: key.includes('devices') ? '{"left":{"id":"saved-address","automatic":true}}' : null }));
  const storage = await import('../../src/storage/persistent'); await storage.initializeStorage();
  const devices = await import('../../src/storage/devices');
  expect(devices.readDevices()).toEqual({ left: { id: 'saved-address', automatic: true } });
});
it('awaits the durable Android write before acknowledging an assignment', async () => {
  let finish!: () => void;
  native.set.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  const devices = await import('../../src/storage/devices');
  let saved = false; const operation = devices.saveDevices({ left: { id: 'receiver', automatic: true } }).then(() => { saved = true; });
  await Promise.resolve(); expect(saved).toBe(false);
  finish(); await operation; expect(saved).toBe(true);
  expect(native.set).toHaveBeenCalledWith({ key: 'dual-bed-sync:devices:v1', value: '{"left":{"id":"receiver","automatic":true}}' });
});
it('reports a failed durable write rather than promising that the bed is remembered', async () => {
  native.set.mockRejectedValue(new Error('disk full'));
  const { saveDevices } = await import('../../src/storage/devices');
  await expect(saveDevices({ left: { id: 'receiver', automatic: true } })).rejects.toThrow('Impossible de mémoriser');
});
