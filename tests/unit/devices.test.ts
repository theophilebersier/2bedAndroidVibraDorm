import { afterEach, expect, it, vi } from 'vitest';
import { readDevices, saveDevices } from '../../src/storage/devices';

afterEach(() => vi.unstubAllGlobals());
function storage(value: string | null) {
  const mock = { getItem: vi.fn(() => value), setItem: vi.fn() };
  vi.stubGlobal('localStorage', mock); return mock;
}
it('restores assignments and an intentional disconnection without extra identity fields', () => {
  storage(JSON.stringify({ left: { id: 'first', automatic: true, name: 'private' }, right: { id: 'second', automatic: false } }));
  expect(readDevices()).toEqual({ left: { id: 'first', automatic: true }, right: { id: 'second', automatic: false } });
});
it('rejects duplicate assignments, corrupt data and invalid records', () => {
  for (const value of ['null', '[]', '{bad', JSON.stringify({ left: { id: 'same', automatic: true }, right: { id: 'same', automatic: true } }), JSON.stringify({ left: { id: '', automatic: true }, right: { id: 'id', automatic: 'yes' } })]) {
    storage(value); expect(readDevices()).toEqual({});
  }
});
it('saves only local assignments and tolerates denied storage', async () => {
  const mock = storage(null); await saveDevices({ left: { id: 'id', automatic: true } });
  expect(mock.setItem).toHaveBeenCalledWith('dual-bed-sync:devices:v1', '{"left":{"id":"id","automatic":true}}');
  mock.getItem.mockImplementation(() => { throw new Error('denied'); });
  mock.setItem.mockImplementation(() => { throw new Error('full'); });
  expect(readDevices()).toEqual({}); await expect(saveDevices({})).resolves.toBeUndefined();
});
