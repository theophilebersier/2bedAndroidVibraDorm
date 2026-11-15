export type Side = 'left' | 'right';
export type Target = Side | 'both';
export type Mode = 'real' | 'demo';
export interface BedTransport {
  readonly id: string;
  readonly name: string;
  readonly mode: Mode;
  readonly connected: boolean;
  readonly model?: string;
  readonly firmware?: string;
  writeMovement(packet: Uint8Array<ArrayBuffer>): Promise<void>;
  readLight(): Promise<DataView>;
  writeLight(packet: Uint8Array<ArrayBuffer>): Promise<void>;
  disconnect(): void;
  onDisconnect(listener: () => void): () => void;
}
export const SIDES: Side[] = ['left', 'right'];
export const sideLabel = (side: Side): string => side === 'left' ? 'gauche' : 'droit';
