import { expect, it } from 'vitest';
import { OperationLane } from '../../src/control/lane';
import { deferred } from './fixtures';

it('STOP overtakes queued motion while an admitted write finishes', async () => {
  const lane = new OperationLane(); const gate = deferred(); const order: string[] = [];
  const first = lane.run(async () => { order.push('first'); await gate.promise; });
  let held = true;
  const second = lane.run(async () => { order.push('stale-motion'); }, () => held);
  const stop = lane.run(async () => { order.push('stop'); }, () => true, 0);
  held = false; gate.resolve();
  expect(await second).toBe(false); await Promise.all([first, stop]);
  expect(order).toEqual(['first', 'stop']);
});
it('keeps processing STOP after a failed ordinary operation', async () => {
  const lane = new OperationLane();
  const failed = lane.run(async () => { throw new Error('write failed'); });
  const stopped = lane.run(async () => {}, () => true, 0);
  await expect(failed).rejects.toThrow('write failed'); expect(await stopped).toBe(true);
});
