import { BleClient } from '@capacitor-community/bluetooth-le';
import { UUID } from '../protocol/vmat';
import { deadline } from './bluetooth';
import type { BedTransport, DeviceIdentity } from './types';

let initialized: Promise<void> | undefined;
async function prepareBluetooth(enable = false): Promise<void> {
  initialized ??= BleClient.initialize({ androidNeverForLocation: true }).catch(() => {
    initialized = undefined;
    throw new Error('Autorise les appareils à proximité dans les paramètres Android de Dual Bed Sync.');
  });
  await initialized;
  if (!await BleClient.isEnabled()) {
    if (enable) await BleClient.requestEnable();
    else throw new Error('Active le Bluetooth du téléphone pour retrouver les sommiers.');
  }
}

export async function chooseNativeDevice(): Promise<DeviceIdentity> {
  await prepareBluetooth(true);
  const device = await BleClient.requestDevice();
  return { id: device.deviceId, name: device.name };
}

/** Android reconnects directly by the saved address: no browser permission picker. */
export class NativeTransport implements BedTransport {
  private static owners = new Map<string, NativeTransport>();
  private static closing = new Map<string, Promise<void>>();
  readonly mode = 'real' as const;
  model?: string;
  firmware?: string;
  private closed = false;
  private linked = false;
  private listeners = new Set<() => void>();
  private constructor(private readonly device: DeviceIdentity) {}
  get id(): string { return this.device.id; }
  get name(): string { return this.device.name || 'Sommier mémorisé'; }
  get connected(): boolean { return this.linked && !this.closed; }

  static async connect(device: DeviceIdentity): Promise<NativeTransport> {
    await prepareBluetooth();
    if (this.owners.get(device.id)?.connected) throw new Error('Ce sommier est déjà connecté.');
    await this.closing.get(device.id);
    // Android can retain a stale GATT client after a lost link.
    await BleClient.disconnect(device.id).catch(() => {});
    const transport = new NativeTransport(device);
    this.owners.set(device.id, transport);
    try {
      await deadline(BleClient.connect(device.id, () => transport.ended(), { timeout: 10000 }).then(() => {
        if (transport.closed) {
          if (this.owners.get(device.id) === transport) void BleClient.disconnect(device.id).catch(() => {});
          throw new Error('Connexion annulée.');
        }
        transport.linked = true;
      }), 11000, () => transport.disconnect());
      const services = await transport.timed(BleClient.getServices(device.id));
      const find = (uuid: string) => services.find(service => service.uuid.toLowerCase() === uuid);
      const control = find(UUID.control);
      const movement = control?.characteristics.find(item => item.uuid.toLowerCase() === UUID.movement);
      const light = control?.characteristics.find(item => item.uuid.toLowerCase() === UUID.light);
      if (!control || !find(UUID.status) || !find(UUID.gap) ||
          !movement?.properties.write || !light?.properties.write || !light.properties.read) {
        throw new Error('Le profil V-MAT Basic CBI attendu est absent de ce récepteur.');
      }
      const info = find(UUID.info);
      for (const [field, uuid] of [['model', UUID.model], ['firmware', UUID.firmware]] as const) {
        if (!info?.characteristics.some(item => item.uuid.toLowerCase() === uuid && item.properties.read)) continue;
        try {
          transport[field] = new TextDecoder().decode(await transport.timed(BleClient.read(device.id, UUID.info, uuid, { timeout: 2000 })));
        } catch { if (!transport.connected) throw new Error('Connexion perdue pendant le diagnostic.'); }
      }
      if (!transport.connected) throw new Error('Connexion interrompue.');
      return transport;
    } catch (error) { transport.disconnect(); throw error; }
  }

  private timed<T>(operation: Promise<T>): Promise<T> {
    return deadline(operation, 1500, () => this.disconnect());
  }
  private assertConnected(): void {
    if (!this.connected) throw new Error('Le sommier est déconnecté.');
  }
  async writeMovement(packet: Uint8Array<ArrayBuffer>): Promise<void> {
    this.assertConnected();
    try { await this.timed(BleClient.write(this.id, UUID.control, UUID.movement, new DataView(packet.buffer, packet.byteOffset, packet.byteLength), { timeout: 2000 })); }
    catch (error) { this.disconnect(); throw error; }
  }
  async readLight(): Promise<DataView> {
    this.assertConnected();
    return this.timed(BleClient.read(this.id, UUID.control, UUID.light, { timeout: 2000 }));
  }
  async writeLight(packet: Uint8Array<ArrayBuffer>): Promise<void> {
    this.assertConnected();
    try { await this.timed(BleClient.write(this.id, UUID.control, UUID.light, new DataView(packet.buffer, packet.byteOffset, packet.byteLength), { timeout: 2000 })); }
    catch (error) { this.disconnect(); throw error; }
  }
  private ended = (): void => {
    if (this.closed) return;
    this.closed = true; this.linked = false;
    for (const listener of this.listeners) listener();
  };
  disconnect(): void {
    if (this.closed) return;
    this.ended();
    const closing = BleClient.disconnect(this.id).catch(() => {}).finally(() => {
      if (NativeTransport.closing.get(this.id) === closing) NativeTransport.closing.delete(this.id);
    });
    NativeTransport.closing.set(this.id, closing);
  }
  onDisconnect(listener: () => void): () => void {
    this.listeners.add(listener); return () => this.listeners.delete(listener);
  }
}
