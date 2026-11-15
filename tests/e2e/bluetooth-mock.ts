import type { Page } from '@playwright/test';
export async function mockBluetooth(page: Page, persistent = true): Promise<void> {
  await page.addInitScript(({ persistent }) => {
    const grants: number[] = JSON.parse(sessionStorage.getItem('mock-grants') ?? '[]');
    const state = { requests: 0, gets: 0, failures: 0, permissions: true, connects: [] as number[], writes: [] as { side: number; byte: number; kind: string }[], devices: [] as MockDevice[] };
    class MockDevice extends EventTarget {
      id: string; name: string; light = Uint8Array.of(0, 0, 0);
      gatt: { connected: boolean; connect: () => Promise<unknown>; disconnect: () => void };
      constructor(public side: number) {
        super(); this.id = `private-${side}`; this.name = `Private Bluetooth ${side}`;
        this.gatt = {
          connected: false,
          connect: async () => {
            state.connects.push(side);
            if (state.failures > 0) { state.failures--; throw new Error('Out of range'); }
            this.gatt.connected = true;
            return { getPrimaryService: async () => ({
              getCharacteristic: async (uuid: string) => ({
                properties: { read: true, write: true },
                readValue: async () => new DataView(this.light.slice().buffer),
                writeValueWithResponse: async (bytes: Uint8Array) => {
                  if (!this.gatt.connected) throw new Error('Disconnected');
                  const kind = uuid.startsWith('00001526') ? 'motor' : 'light';
                  state.writes.push({ side, byte: bytes[0], kind });
                  if (kind === 'light') this.light = new Uint8Array(bytes);
                },
              }),
            }) };
          },
          disconnect: () => { this.gatt.connected = false; this.dispatchEvent(new Event('gattserverdisconnected')); },
        };
      }
    }
    state.devices = grants.map(side => new MockDevice(side));
    Object.defineProperty(navigator, 'bluetooth', { configurable: true, value: {
      requestDevice: async () => {
        state.requests++;
        const side = Math.max(-1, ...grants) + 1;
        grants.push(side); sessionStorage.setItem('mock-grants', JSON.stringify(grants));
        const device = new MockDevice(side); state.devices.push(device); return device;
      },
      ...(persistent ? { getDevices: async () => { state.gets++; return state.permissions ? state.devices : []; } } : {}),
    } });
    Object.assign(window, { __ble: state });
  }, { persistent });
}
export async function connectBoth(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Configurer les sommiers', exact: true }).click();
  await page.locator('[data-connect="left"]').click();
  await page.locator('[data-connect="left"]').getByText('Déconnecter').waitFor();
  await page.locator('[data-connect="right"]').click();
  await page.locator('[data-connect="right"]').getByText('Déconnecter').waitFor();
  await page.getByRole('button', { name: 'Revenir à la télécommande' }).click();
}
