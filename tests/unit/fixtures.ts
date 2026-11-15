import type { BedTransport, Side } from '../../src/transport/types';

export function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

export class FakeTransport implements BedTransport {
  readonly mode = 'real' as const;
  readonly name = 'Private device name';
  readonly model = 'Private model';
  readonly firmware = 'Private firmware';
  readonly id: string;
  connected = true;
  writes: number[][] = [];
  lightWrites: number[][] = [];
  light = Uint8Array.of(0, 0, 0);
  failMove = false;
  failRead = false;
  gate: Promise<void> | null = null;
  readGate: Promise<void> | null = null;
  private listeners = new Set<() => void>();

  constructor(side: Side) { this.id = `private-device-${side}`; }
  async writeMovement(packet: Uint8Array<ArrayBuffer>): Promise<void> {
    this.writes.push([...packet]);
    if (this.gate) { const waiting = this.gate; this.gate = null; await waiting; }
    if (!this.connected) throw new Error('disconnected');
    if (this.failMove && packet[0] !== 0xff) throw new Error('write failed');
  }
  async readLight(): Promise<DataView> {
    if (this.readGate) await this.readGate;
    if (this.failRead) throw new Error('bad read');
    return new DataView(this.light.slice().buffer);
  }
  async writeLight(packet: Uint8Array<ArrayBuffer>): Promise<void> {
    this.lightWrites.push([...packet]); this.light = packet.slice();
  }
  disconnect(): void {
    this.connected = false; for (const listener of this.listeners) listener();
  }
  onDisconnect(listener: () => void): () => void {
    this.listeners.add(listener); return () => this.listeners.delete(listener);
  }
}
