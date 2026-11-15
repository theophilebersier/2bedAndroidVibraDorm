import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { UUID } from '../../src/protocol/vmat';
import { deferred } from './fixtures';

const ble = vi.hoisted(() => ({
  initialize: vi.fn(), isEnabled: vi.fn(), requestEnable: vi.fn(), requestDevice: vi.fn(),
  connect: vi.fn(), disconnect: vi.fn(), getServices: vi.fn(), read: vi.fn(), write: vi.fn(),
}));
vi.mock('@capacitor-community/bluetooth-le', () => ({ BleClient: ble }));
const profile = () => [
  { uuid: UUID.control, characteristics: [
    { uuid: UUID.movement, properties: { write: true } },
    { uuid: UUID.light, properties: { write: true, read: true } },
  ] },
  { uuid: UUID.status, characteristics: [] }, { uuid: UUID.gap, characteristics: [] },
];
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks();
  ble.initialize.mockResolvedValue(undefined); ble.isEnabled.mockResolvedValue(true);
  ble.connect.mockResolvedValue(undefined); ble.disconnect.mockResolvedValue(undefined);
  ble.getServices.mockResolvedValue(profile()); ble.write.mockResolvedValue(undefined);
  ble.read.mockResolvedValue(new DataView(Uint8Array.of(128, 0, 30).buffer));
  ble.requestDevice.mockResolvedValue({ deviceId: 'private-address', name: 'Private receiver' });
});
afterEach(() => vi.useRealTimers());

it('connects directly by a remembered Android ID with no selection dialog or motor write', async () => {
  const { NativeTransport } = await import('../../src/transport/native');
  const transport = await NativeTransport.connect({ id: 'remembered-address' });
  expect(ble.initialize).toHaveBeenCalledWith({ androidNeverForLocation: true });
  expect(ble.connect).toHaveBeenCalledWith('remembered-address', expect.any(Function), { timeout: 10000 });
  expect(transport.connected).toBe(true);
  expect(ble.requestDevice).not.toHaveBeenCalled(); expect(ble.write).not.toHaveBeenCalled();
  transport.disconnect();
});
it('discovers the profile again and refuses incompatible receivers', async () => {
  ble.getServices.mockResolvedValue([{ uuid: UUID.control, characteristics: [] }]);
  const { NativeTransport } = await import('../../src/transport/native');
  await expect(NativeTransport.connect({ id: 'incompatible' })).rejects.toThrow('profil');
  expect(ble.disconnect).toHaveBeenCalledWith('incompatible'); expect(ble.write).not.toHaveBeenCalled();
});
it('writes with response on the exact characteristics and preserves packet offsets', async () => {
  const { NativeTransport } = await import('../../src/transport/native');
  const transport = await NativeTransport.connect({ id: 'receiver' });
  await transport.writeMovement(Uint8Array.of(99, 16, 99).subarray(1, 2));
  const [, service, characteristic, packet] = ble.write.mock.calls[0];
  expect([service, characteristic, packet.byteLength, packet.getUint8(0)]).toEqual([UUID.control, UUID.movement, 1, 16]);
  await transport.writeLight(Uint8Array.of(128, 0, 30));
  expect(ble.write.mock.calls[1][2]).toBe(UUID.light);
  expect((await transport.readLight()).getUint8(0)).toBe(128);
  transport.disconnect();
});
it('closes a failed movement and reports a lost connection once', async () => {
  const { NativeTransport } = await import('../../src/transport/native');
  const transport = await NativeTransport.connect({ id: 'receiver' }); const lost = vi.fn();
  transport.onDisconnect(lost); ble.write.mockRejectedValue(new Error('native error'));
  await expect(transport.writeMovement(Uint8Array.of(16))).rejects.toThrow('native error');
  expect(transport.connected).toBe(false); expect(lost).toHaveBeenCalledOnce();
  ble.connect.mock.calls[0][1]('receiver'); expect(lost).toHaveBeenCalledOnce();
});
it('an old disconnected transport cannot disconnect the restored owner', async () => {
  const { NativeTransport } = await import('../../src/transport/native');
  const old = await NativeTransport.connect({ id: 'receiver' });
  ble.connect.mock.calls[0][1]('receiver');
  const current = await NativeTransport.connect({ id: 'receiver' });
  const count = ble.disconnect.mock.calls.length; old.disconnect();
  expect(ble.disconnect).toHaveBeenCalledTimes(count); expect(current.connected).toBe(true);
  current.disconnect();
});
it('waits for native disconnect cleanup before reconnecting the same ID', async () => {
  const { NativeTransport } = await import('../../src/transport/native');
  const old = await NativeTransport.connect({ id: 'receiver' }); const cleanup = deferred();
  ble.disconnect.mockImplementationOnce(() => cleanup.promise); old.disconnect();
  const next = NativeTransport.connect({ id: 'receiver' });
  await Promise.resolve(); await Promise.resolve(); expect(ble.connect).toHaveBeenCalledOnce();
  cleanup.resolve(); const current = await next; expect(current.connected).toBe(true); current.disconnect();
});
it('expires a stalled native write and prevents subsequent writes through the closed owner', async () => {
  vi.useFakeTimers();
  const { NativeTransport } = await import('../../src/transport/native');
  const transport = await NativeTransport.connect({ id: 'receiver' });
  ble.write.mockImplementationOnce(() => new Promise(() => {}));
  const operation = transport.writeMovement(Uint8Array.of(16)); const rejected = expect(operation).rejects.toThrow('Délai Bluetooth');
  await vi.advanceTimersByTimeAsync(1501); await rejected;
  expect(transport.connected).toBe(false);
  await expect(transport.writeMovement(Uint8Array.of(16))).rejects.toThrow('déconnecté');
  expect(ble.write).toHaveBeenCalledOnce();
});
it('only opens the native chooser on an explicit request, and can enable Bluetooth then', async () => {
  ble.isEnabled.mockResolvedValue(false); ble.requestEnable.mockResolvedValue(undefined);
  const { chooseNativeDevice } = await import('../../src/transport/native');
  expect(await chooseNativeDevice()).toEqual({ id: 'private-address', name: 'Private receiver' });
  expect(ble.requestEnable).toHaveBeenCalledOnce(); expect(ble.requestDevice).toHaveBeenCalledOnce();
});
it('does not prompt to enable Bluetooth during an automatic restoration', async () => {
  ble.isEnabled.mockResolvedValue(false);
  const { NativeTransport } = await import('../../src/transport/native');
  await expect(NativeTransport.connect({ id: 'receiver' })).rejects.toThrow('Active le Bluetooth');
  expect(ble.requestEnable).not.toHaveBeenCalled(); expect(ble.connect).not.toHaveBeenCalled();
});
