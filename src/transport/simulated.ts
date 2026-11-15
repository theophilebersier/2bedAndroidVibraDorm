import type { BedTransport, Side } from './types';

/** In-memory only: this module never imports or calls Web Bluetooth. */
export class SimulatedTransport implements BedTransport {
  readonly mode = 'demo' as const;
  readonly id: string;
  readonly name: string;
  readonly model = 'V-MAT CBI · simulation';
  readonly firmware = 'simulation';
  connected = true;
  readonly packets: number[][] = [];
  private light = Uint8Array.of(0, 0, 0);
  private listeners = new Set<() => void>();
  failNext = false;

  constructor(side: Side) {
    this.id = `demo-${side}`;
    this.name = side === 'left' ? 'Sommier gauche simulé' : 'Sommier droit simulé';
  }
  private async operation(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 8));
    if (!this.connected) throw new Error('Connexion simulée perdue.');
    if (this.failNext) { this.failNext = false; throw new Error('Écriture simulée en échec.'); }
  }
  async writeMovement(packet: Uint8Array<ArrayBuffer>): Promise<void> {
    await this.operation(); this.packets.push([...packet]);
  }
  async readLight(): Promise<DataView> {
    await this.operation(); return new DataView(this.light.slice().buffer);
  }
  async writeLight(packet: Uint8Array<ArrayBuffer>): Promise<void> {
    await this.operation(); this.light = packet.slice();
  }
  disconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    for (const listener of this.listeners) listener();
  }
  onDisconnect(listener: () => void): () => void {
    this.listeners.add(listener); return () => this.listeners.delete(listener);
  }
}
