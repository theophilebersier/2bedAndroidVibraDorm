import { UUID } from '../protocol/vmat';
import type { BedTransport } from './types';

/** A timed-out GATT write is not cancelled by Promise.race: close its link. */
export async function deadline<T>(work: Promise<T>, timeout: number, abort: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        try { abort(); } finally { reject(new Error('Délai Bluetooth dépassé ; connexion fermée.')); }
      }, timeout);
    })]);
  } finally { clearTimeout(timer); }
}

export function bluetoothSupport(): string | null {
  if (!window.isSecureContext) return 'Ouvre l’application en HTTPS pour utiliser le Bluetooth.';
  if (!navigator.bluetooth) return 'Web Bluetooth indisponible. Utilise Chrome sur Android ou essaie la simulation.';
  return null;
}

/** Call directly from the click handler to retain the browser user gesture. */
export function chooseDevice(): Promise<BluetoothDevice> {
  const unsupported = bluetoothSupport();
  if (unsupported) return Promise.reject(new Error(unsupported));
  // Names/advertisements are not reliable proof of the selected app profile.
  return navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [UUID.control, UUID.status, UUID.gap, UUID.info],
  });
}

export class BluetoothTransport implements BedTransport {
  private static owners = new WeakMap<BluetoothDevice, BluetoothTransport>();
  readonly mode = 'real' as const;
  model?: string;
  firmware?: string;
  private listeners = new Set<() => void>();
  private closed = false;
  private movement!: BluetoothRemoteGATTCharacteristic;
  private light!: BluetoothRemoteGATTCharacteristic;
  private constructor(private device: BluetoothDevice) {
    device.addEventListener('gattserverdisconnected', this.disconnected);
  }
  get id(): string { return this.device.id; }
  get name(): string { return this.device.name || 'Sommier Bluetooth'; }
  get connected(): boolean { return !this.closed && Boolean(this.device.gatt?.connected); }
  private disconnected = (): void => {
    this.closed = true;
    this.device.removeEventListener('gattserverdisconnected', this.disconnected);
    for (const listener of this.listeners) listener();
  };

  static async connect(device: BluetoothDevice): Promise<BluetoothTransport> {
    const transport = new BluetoothTransport(device);
    BluetoothTransport.owners.set(device, transport);
    try {
      if (!device.gatt) throw new Error('Cet appareil ne propose pas de serveur GATT.');
      const connecting = device.gatt.connect().then(server => {
        if (transport.closed) {
          // An old native connect may resolve after a timeout and a fresh attempt.
          if (BluetoothTransport.owners.get(device) === transport) device.gatt?.disconnect();
          throw new Error('Connexion annulée.');
        }
        return server;
      });
      const server = await transport.timed(connecting, 10000);
      // Reacquire all handles on every connection, including reconnects.
      const control = await transport.timed(server.getPrimaryService(UUID.control));
      await transport.timed(server.getPrimaryService(UUID.status));
      await transport.timed(server.getPrimaryService(UUID.gap));
      transport.movement = await transport.timed(control.getCharacteristic(UUID.movement));
      transport.light = await transport.timed(control.getCharacteristic(UUID.light));
      if (!transport.movement.properties.write || !transport.light.properties.write || !transport.light.properties.read) {
        throw new Error('Le profil CBI attendu (écriture avec réponse et lecture lumière) est absent.');
      }
      // Optional diagnostics. Missing DIS is permitted; transport errors are not.
      try {
        const info = await transport.timed(server.getPrimaryService(UUID.info));
        for (const [field, uuid] of [['model', UUID.model], ['firmware', UUID.firmware]] as const) {
          try {
            const characteristic = await transport.timed(info.getCharacteristic(uuid));
            transport[field] = new TextDecoder().decode(await transport.timed(characteristic.readValue()));
          } catch { if (!transport.connected) throw new Error('Connexion perdue pendant le diagnostic.'); }
        }
      } catch { if (!transport.connected) throw new Error('Connexion perdue pendant le diagnostic.'); }
      if (!transport.connected) throw new Error('Connexion interrompue.');
      return transport;
    } catch (error) { transport.disconnect(); throw error; }
  }

  private timed<T>(operation: Promise<T>, timeout = 1500): Promise<T> {
    return deadline(operation, timeout, () => this.disconnect());
  }
  async writeMovement(packet: Uint8Array<ArrayBuffer>): Promise<void> {
    if (!this.connected) throw new Error('Le sommier est déconnecté.');
    await this.timed(this.movement.writeValueWithResponse(packet));
  }
  async readLight(): Promise<DataView> {
    if (!this.connected) throw new Error('Le sommier est déconnecté.');
    return this.timed(this.light.readValue());
  }
  async writeLight(packet: Uint8Array<ArrayBuffer>): Promise<void> {
    if (!this.connected) throw new Error('Le sommier est déconnecté.');
    await this.timed(this.light.writeValueWithResponse(packet));
  }
  disconnect(): void {
    if (this.closed) return;
    this.device.gatt?.disconnect();
    if (!this.closed) this.disconnected();
  }
  onDisconnect(listener: () => void): () => void {
    this.listeners.add(listener); return () => this.listeners.delete(listener);
  }
}
