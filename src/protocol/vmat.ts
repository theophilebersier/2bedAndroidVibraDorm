// Protocol reference and attribution: docs/PROTOCOLE_BLE.md, THIRD_PARTY_NOTICES.md.
const vendor = (short: string) => `0000${short}-9f03-0de5-96c5-b8f4f3081186`;
export const UUID = {
  control: vendor('1525'), status: vendor('1527'), movement: vendor('1526'),
  light: vendor('1529'), gap: '00001800-0000-1000-8000-00805f9b34fb',
  info: '0000180a-0000-1000-8000-00805f9b34fb',
  model: '00002a24-0000-1000-8000-00805f9b34fb',
  firmware: '00002a26-0000-1000-8000-00805f9b34fb',
} as const;

export const MOVEMENTS = {
  backUp: 0x0b, backDown: 0x0a, legsUp: 0x09, legsDown: 0x08,
  allDown: 0x00,
} as const;
export type Movement = keyof typeof MOVEMENTS;
export const movementPacket = (command: Movement): Uint8Array<ArrayBuffer> => {
  if (!Object.hasOwn(MOVEMENTS, command)) throw new Error('Commande inconnue.');
  return Uint8Array.of(MOVEMENTS[command]);
};
export const stopPacket = (): Uint8Array<ArrayBuffer> => Uint8Array.of(0xff);

export interface LightState { level: number; minutes: number }
export function lightPacket(level: number, minutes: number): Uint8Array<ArrayBuffer> {
  if (!Number.isInteger(level) || level < 0 || level > 255 ||
      !Number.isInteger(minutes) || minutes < 0 || minutes > 1439) {
    throw new Error('Réglage de lumière invalide.');
  }
  return Uint8Array.of(level, minutes >> 8, minutes & 0xff);
}
export function parseLight(value: DataView): LightState {
  if (value.byteLength < 3) throw new Error('Réponse de lumière incomplète.');
  return { level: value.getUint8(0), minutes: value.getUint16(1, false) };
}
