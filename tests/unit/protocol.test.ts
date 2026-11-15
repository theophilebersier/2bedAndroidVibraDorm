import { describe, expect, it } from 'vitest';
import { lightPacket, movementPacket, parseLight, stopPacket, UUID } from '../../src/protocol/vmat';

describe('wire contract from pinned V-MAT Basic CBI reference', () => {
  it.each([['backUp', 0x0b], ['backDown', 0x0a], ['legsUp', 0x09], ['legsDown', 0x08], ['allDown', 0x00], ['allUp', 0x10]] as const)('encodes %s', (command, byte) => {
    expect([...movementPacket(command)]).toEqual([byte]);
  });
  it('uses the exact movement characteristic and fresh release packets', () => {
    expect(UUID.movement).toBe('00001526-9f03-0de5-96c5-b8f4f3081186');
    const first = stopPacket(); first[0] = 0;
    expect([...stopPacket()]).toEqual([0xff]);
  });
  it('rejects unknown and inherited property names as motor commands', () => {
    for (const command of ['unknown', 'constructor', '__proto__']) {
      expect(() => movementPacket(command as never)).toThrow('inconnue');
    }
  });
  it('encodes timer minutes in big endian without overflow', () => {
    expect([...lightPacket(128, 1439)]).toEqual([128, 5, 159]);
    expect([...lightPacket(0, 0)]).toEqual([0, 0, 0]);
  });
  it.each([[256, 0], [-1, 0], [NaN, 0], [2.5, 1], [1, -1], [1, 1440], [1, Infinity]])('rejects invalid light fields %s, %s', (level, minutes) => {
    expect(() => lightPacket(level, minutes)).toThrow();
  });
  it('rejects short reads and respects DataView offset', () => {
    expect(() => parseLight(new DataView(new ArrayBuffer(2)))).toThrow();
    const bytes = Uint8Array.of(99, 200, 1, 44, 88);
    expect(parseLight(new DataView(bytes.buffer, 1, 3))).toEqual({ level: 200, minutes: 300 });
  });
});
