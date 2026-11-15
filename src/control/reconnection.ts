import { BluetoothTransport } from '../transport/bluetooth';
import { SIDES, sideLabel, type BedTransport, type Side } from '../transport/types';
import type { RememberedDevices } from '../storage/devices';

interface ReconnectionOptions {
  remembered: RememberedDevices;
  devices: Partial<Record<Side, BluetoothDevice>>;
  available(): boolean;
  idle(): boolean;
  connected(side: Side): boolean;
  attach(side: Side, transport: BedTransport): void;
  changed(busy: boolean, side: Side | null, message: string): void;
  getDevices?(): Promise<BluetoothDevice[]>;
  connect?(device: BluetoothDevice): Promise<BedTransport>;
}

/** Restores permissions, never opens a picker and never issues a motor command. */
export class Reconnection {
  private timer?: ReturnType<typeof setTimeout>;
  private running = false;
  private generation = 0;
  private again = false;
  private retries = 0;
  constructor(private readonly options: ReconnectionOptions) {}

  resume(delay = 0): void {
    this.retries = 0;
    this.schedule(delay);
  }
  suspend(): void {
    clearTimeout(this.timer);
    this.generation++;
    this.again = false;
  }
  private schedule(delay: number): void {
    clearTimeout(this.timer);
    if (!this.options.available()) return;
    if (this.running) { this.again = true; return; }
    this.timer = setTimeout(() => { void this.restore(); }, delay);
  }
  private async restore(): Promise<void> {
    const o = this.options;
    if (!o.available()) return;
    const missing = SIDES.filter(side => o.remembered[side]?.automatic && !o.connected(side));
    if (!missing.length) return;
    // Do not interrupt a hold, a STOP, a light operation or a manual pairing.
    if (!o.idle()) { this.schedule(500); return; }
    this.running = true;
    const generation = this.generation;
    const valid = () => generation === this.generation && o.available() && o.idle();
    let failed = false;
    let message = 'Recherche des sommiers mémorisés…';
    o.changed(true, null, message);
    try {
      let granted: BluetoothDevice[] = [];
      if (missing.some(side => !o.devices[side])) {
        const getDevices = o.getDevices ?? (() => navigator.bluetooth?.getDevices?.() ?? Promise.resolve([]));
        try { granted = await getDevices(); }
        catch { /* Keep the attribution; the user can renew permission with a click. */ }
      }
      for (const side of missing) {
        if (!valid()) break;
        const saved = o.remembered[side];
        if (!saved?.automatic || o.connected(side)) continue;
        const device = o.devices[side]?.id === saved.id ? o.devices[side] : granted.find(item => item.id === saved.id);
        if (!device) {
          message = 'Autorisation Bluetooth à renouveler : ouvrez la configuration et touchez « Reconnecter ».';
          continue;
        }
        o.devices[side] = device;
        o.changed(true, side, `Reconnexion du lit ${sideLabel(side)}…`);
        let transport: BedTransport | undefined;
        try {
          transport = await (o.connect ?? BluetoothTransport.connect)(device);
          if (!valid() || o.remembered[side]?.id !== saved.id || !o.remembered[side]?.automatic) {
            transport.disconnect(); break;
          }
          o.attach(side, transport);
          message = 'Sommiers mémorisés reconnectés. Aucun mouvement repris.';
        } catch {
          transport?.disconnect();
          failed = true;
          message = `Lit ${sideLabel(side)} indisponible. Rapprochez-vous ou touchez « Reconnecter » dans la configuration.`;
        }
      }
    } finally {
      this.running = false;
      o.changed(false, null, generation === this.generation ? message : '');
      if (this.again) { this.again = false; this.schedule(0); }
      else if (valid() && failed && this.retries < 2) this.schedule([1000, 3000][this.retries++]);
    }
  }
}
