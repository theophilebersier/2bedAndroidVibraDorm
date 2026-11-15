import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BedController } from '../../src/control/controller';
import { SimulatedTransport } from '../../src/transport/simulated';
import { deferred, FakeTransport } from './fixtures';

let controller: BedController;
let left: FakeTransport;
let right: FakeTransport;
beforeEach(() => {
  vi.useFakeTimers(); controller = new BedController({ repeatMs: 30, maxHoldMs: 100 });
  left = new FakeTransport('left'); right = new FakeTransport('right');
});
afterEach(async () => { await controller.stop(); vi.useRealTimers(); });
const attachBoth = () => { controller.attach('left', left); controller.attach('right', right); };

describe('motion admission, release and failure', () => {
  it('rejects combined motion when either side is missing', () => {
    controller.attach('left', left);
    expect(controller.start('backUp')).toBe(false);
    expect(left.writes).toEqual([]);
  });
  it('rejects assigning one physical receiver to both sides', () => {
    controller.attach('left', left);
    expect(() => controller.attach('right', left)).toThrow('autre côté');
    expect(left.connected).toBe(true);
  });
  it('does not disconnect an old owner when replacing an already closed session', () => {
    controller.attach('left', left); left.disconnect();
    const oldDisconnect = vi.spyOn(left, 'disconnect');
    const replacement = new FakeTransport('left'); controller.attach('left', replacement);
    expect(oldDisconnect).not.toHaveBeenCalled(); expect(replacement.connected).toBe(true);
  });
  it('sends to both sides and never repeats after release', async () => {
    attachBoth(); expect(controller.start('backUp')).toBe(true);
    await vi.advanceTimersByTimeAsync(40);
    expect(left.writes.length).toBeGreaterThanOrEqual(2);
    await controller.stop();
    const count = left.writes.length;
    await vi.advanceTimersByTimeAsync(500);
    expect(left.writes.length).toBe(count);
    expect(left.writes.at(-1)).toEqual([255]); expect(right.writes.at(-1)).toEqual([255]);
  });
  it('release during an in-flight write prevents later motion', async () => {
    attachBoth(); const gate = deferred(); left.gate = gate.promise;
    controller.start('legsUp'); const stopping = controller.stop();
    expect(controller.start('legsDown')).toBe(false);
    gate.resolve(); await stopping;
    await vi.advanceTimersByTimeAsync(100);
    expect(left.writes).toEqual([[9], [255]]);
    expect(right.writes).toEqual([[9], [255]]);
  });
  it('rejects a second action while a first action is held', () => {
    attachBoth(); expect(controller.start('backUp')).toBe(true);
    expect(controller.start('legsDown')).toBe(false);
  });
  it('requests STOP on both sides if one movement write fails', async () => {
    attachBoth(); right.failMove = true; controller.start('backUp');
    await vi.advanceTimersByTimeAsync(1);
    expect(left.writes.at(-1)).toEqual([255]); expect(right.writes.at(-1)).toEqual([255]);
    expect(controller.snapshot().fault).toBe(true); expect(controller.snapshot().active).toBeNull();
  });
  it('stops the reachable side after disconnection and does not resume on reconnect', async () => {
    attachBoth(); controller.start('backUp'); right.disconnect();
    await vi.advanceTimersByTimeAsync(1);
    expect(left.writes.at(-1)).toEqual([255]);
    const replacement = new FakeTransport('right'); controller.attach('right', replacement);
    await vi.advanceTimersByTimeAsync(200);
    expect(replacement.writes).toEqual([]); expect(controller.snapshot().active).toBeNull();
  });
  it('bounds a continuous hold', async () => {
    attachBoth(); controller.start('allDown'); await vi.advanceTimersByTimeAsync(110);
    expect(controller.snapshot().active).toBeNull(); expect(left.writes.at(-1)).toEqual([255]);
  });
  it('switching target cancels the old movement without starting the new one', async () => {
    attachBoth(); controller.start('legsDown'); await controller.setTarget('right');
    expect(controller.snapshot().target).toBe('right');
    expect(controller.snapshot().active).toBeNull(); expect(left.writes.at(-1)).toEqual([255]);
  });
  it('independent control leaves the other side free of movement packets', async () => {
    attachBoth(); await controller.setTarget('left'); left.writes = []; right.writes = [];
    controller.start('backDown');
    expect(left.writes).toEqual([[10]]); expect(right.writes).toEqual([]);
  });
});

describe('lighting and privacy', () => {
  it('uses a fresh read for each toggle and zeros the timer on OFF', async () => {
    attachBoth(); left.light = Uint8Array.of(10, 0, 30);
    await controller.light('toggle', 120, 30);
    expect(left.lightWrites).toEqual([[0, 0, 0]]);
    expect(right.lightWrites).toEqual([[120, 0, 30]]);
    expect(controller.snapshot().beds.left.light?.level).toBe(0);
  });
  it('does not turn a failed read into a guessed toggle', async () => {
    attachBoth(); left.light = Uint8Array.of(2);
    await controller.light('toggle', 180, 30);
    expect(left.lightWrites).toEqual([]); expect(controller.snapshot().fault).toBe(true);
    expect(controller.snapshot().beds.left.light).toBeNull();
    expect(right.lightWrites).toEqual([[180, 0, 30]]);
  });
  it('blocks movement while a light operation owns the GATT lane', async () => {
    attachBoth(); const gate = deferred(); left.readGate = gate.promise;
    const setting = controller.light('on', 180, 0);
    expect(controller.start('backUp')).toBe(false);
    gate.resolve(); await setting;
  });
  it('keeps exported diagnostics free of device identity and raw errors', async () => {
    attachBoth(); controller.start('backUp'); await controller.stop();
    const json = JSON.stringify(controller.diagnostics());
    expect(json).not.toContain('private-device'); expect(json).not.toContain('Private');
    expect(json).not.toContain('firmware'); expect(json).toContain('movement-started');
  });
  it('rejects mixing simulated and real transports', async () => {
    expect(() => controller.attach('left', new SimulatedTransport('left'))).toThrow('mode');
    await controller.setMode('demo');
    expect(() => controller.attach('left', left)).toThrow('mode');
  });
});
