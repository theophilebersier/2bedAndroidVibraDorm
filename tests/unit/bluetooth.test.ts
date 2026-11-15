import { afterEach, expect, it, vi } from 'vitest';
import { BluetoothTransport, deadline } from '../../src/transport/bluetooth';
import { UUID } from '../../src/protocol/vmat';
import { deferred } from './fixtures';

afterEach(() => vi.useRealTimers());
it('closes a stalled link on timeout instead of allowing late queued writes', async () => {
  vi.useFakeTimers(); const abort = vi.fn();
  const result = deadline(new Promise<void>(() => {}), 1500, abort);
  const rejected = expect(result).rejects.toThrow('Délai Bluetooth');
  await vi.advanceTimersByTimeAsync(1501); await rejected;
  expect(abort).toHaveBeenCalledOnce();
});

function mockDevice(write = true) {
  const device = new EventTarget() as EventTarget & { id: string; name: string; gatt: any };
  device.id = 'test-id'; device.name = 'test';
  const characteristic = { properties: { write, read: true }, readValue: vi.fn(async () => new DataView(new ArrayBuffer(3))), writeValueWithResponse: vi.fn(async () => {}) };
  const getCharacteristic = vi.fn(async () => characteristic);
  const getPrimaryService = vi.fn(async () => ({ getCharacteristic }));
  device.gatt = { connected: false, connect: vi.fn(async () => { device.gatt.connected = true; return { getPrimaryService }; }), disconnect: vi.fn(() => { device.gatt.connected = false; device.dispatchEvent(new Event('gattserverdisconnected')); }) };
  return { device: device as unknown as BluetoothDevice, getPrimaryService, characteristic, gatt: device.gatt };
}
it('validates all required services and never sends movement during connection', async () => {
  const mock = mockDevice(); const transport = await BluetoothTransport.connect(mock.device);
  expect(mock.getPrimaryService.mock.calls.map(call => call[0])).toEqual([UUID.control, UUID.status, UUID.gap, UUID.info]);
  expect(mock.characteristic.writeValueWithResponse).not.toHaveBeenCalled(); transport.disconnect();
});
it('rejects write-without-response-only controllers', async () => {
  const mock = mockDevice(false);
  await expect(BluetoothTransport.connect(mock.device)).rejects.toThrow('profil CBI');
  expect(mock.gatt.disconnect).toHaveBeenCalled();
});
it('closes a connect that completes after the onboarding deadline', async () => {
  vi.useFakeTimers(); const mock = mockDevice(); const pending = deferred<any>();
  mock.gatt.connect = () => pending.promise;
  const connection = BluetoothTransport.connect(mock.device);
  const rejected = expect(connection).rejects.toThrow('Délai Bluetooth');
  await vi.advanceTimersByTimeAsync(10001); await rejected;
  mock.gatt.connected = true; pending.resolve({}); await vi.advanceTimersByTimeAsync(1);
  expect(mock.gatt.connected).toBe(false);
});
