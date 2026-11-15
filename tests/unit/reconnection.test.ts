import { afterEach, expect, it, vi } from 'vitest';
import { Reconnection } from '../../src/control/reconnection';
import type { RememberedDevices } from '../../src/storage/devices';
import type { BedTransport, Side } from '../../src/transport/types';
import { deferred, FakeTransport } from './fixtures';

afterEach(() => vi.useRealTimers());
function fixture() {
  vi.useFakeTimers();
  const remembered: RememberedDevices = { left: { id: 'left-id', automatic: true }, right: { id: 'right-id', automatic: true } };
  const devices: Partial<Record<Side, BluetoothDevice>> = {};
  const connected = new Set<Side>();
  let foreground = true; let idle = true;
  const granted = [{ id: 'unrelated' }, { id: 'right-id' }, { id: 'left-id' }] as BluetoothDevice[];
  const connect = vi.fn(async (device: BluetoothDevice): Promise<BedTransport> => new FakeTransport(device.id === 'left-id' ? 'left' : 'right'));
  const attach = vi.fn((side: Side, _transport: BedTransport) => { connected.add(side); });
  const changed = vi.fn();
  const getDevices = vi.fn(async () => granted);
  const recovery = new Reconnection({ remembered, devices, available: () => foreground, idle: () => idle, connected: side => connected.has(side), attach, changed, getDevices, connect });
  return { recovery, remembered, devices, connected, connect, attach, changed, getDevices,
    hide: () => { foreground = false; recovery.suspend(); }, show: () => { foreground = true; recovery.resume(); },
    busy: () => { idle = false; }, ready: () => { idle = true; } };
}
it('restores exact IDs in their original sides without motor writes or a picker', async () => {
  const f = fixture(); f.recovery.resume(); await vi.advanceTimersByTimeAsync(0);
  expect(f.connect.mock.calls.map(([device]) => device.id)).toEqual(['left-id', 'right-id']);
  expect(f.attach.mock.calls.map(([side]) => side)).toEqual(['left', 'right']);
  for (const [, transport] of f.attach.mock.calls) expect((transport as FakeTransport).writes).toEqual([]);
});
it('does not reopen a deliberately disconnected receiver', async () => {
  const f = fixture(); f.remembered.left!.automatic = false;
  f.recovery.resume(); await vi.advanceTimersByTimeAsync(0);
  expect(f.attach.mock.calls.map(([side]) => side)).toEqual(['right']);
});
it('waits for foreground and for movement/accessory operations to finish', async () => {
  const f = fixture(); f.hide(); f.recovery.resume(); await vi.advanceTimersByTimeAsync(1000);
  expect(f.getDevices).not.toHaveBeenCalled();
  f.busy(); f.show(); await vi.advanceTimersByTimeAsync(1000); expect(f.connect).not.toHaveBeenCalled();
  f.ready(); await vi.advanceTimersByTimeAsync(500); expect(f.attach).toHaveBeenCalledTimes(2);
});
it('discards a connection completing after pagehide and serializes the next restoration', async () => {
  const f = fixture(); const pending = deferred<BedTransport>();
  f.connect.mockImplementationOnce(() => pending.promise);
  f.recovery.resume(); await vi.advanceTimersByTimeAsync(0);
  f.hide(); f.show(); expect(f.connect).toHaveBeenCalledTimes(1);
  const old = new FakeTransport('left'); pending.resolve(old); await vi.advanceTimersByTimeAsync(1);
  expect(old.connected).toBe(false);
  expect(f.attach).toHaveBeenCalledTimes(2);
  expect(f.connect).toHaveBeenCalledTimes(3);
});
it('bounds retries when receivers are out of range and restarts on a later return', async () => {
  const f = fixture(); f.connect.mockRejectedValue(new Error('out of range'));
  f.recovery.resume(); await vi.advanceTimersByTimeAsync(60000);
  expect(f.connect).toHaveBeenCalledTimes(6);
  f.hide(); f.show(); await vi.advanceTimersByTimeAsync(0); expect(f.connect).toHaveBeenCalledTimes(8);
});
it('keeps attribution if permissions are revoked or getDevices fails', async () => {
  const f = fixture(); f.getDevices.mockRejectedValue(new Error('denied'));
  f.recovery.resume(); await vi.advanceTimersByTimeAsync(60000);
  expect(f.connect).not.toHaveBeenCalled(); expect(f.remembered.left?.id).toBe('left-id');
  expect(f.changed).toHaveBeenLastCalledWith(false, null, expect.stringContaining('Autorisation'));
});
it('uses in-memory devices on return even if persistent permission retrieval is unavailable', async () => {
  const f = fixture(); f.devices.left = { id: 'left-id' } as BluetoothDevice;
  f.devices.right = { id: 'right-id' } as BluetoothDevice;
  f.getDevices.mockRejectedValue(new Error('unsupported'));
  f.recovery.resume(); await vi.advanceTimersByTimeAsync(0);
  expect(f.getDevices).not.toHaveBeenCalled(); expect(f.attach).toHaveBeenCalledTimes(2);
});
