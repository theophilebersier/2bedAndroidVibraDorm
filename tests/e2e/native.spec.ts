import { expect, test } from '@playwright/test';
import { connectBoth } from './bluetooth-mock';
import { mockAndroid } from './native-mock';

test.beforeEach(async ({ page }) => { await mockAndroid(page); });

test('Android bridge restores SharedPreferences after a fresh page without Web Bluetooth or another chooser', async ({ page }) => {
  await page.goto('./'); await connectBoth(page);
  expect(await page.evaluate(() => (window as any).__native.writes)).toEqual([]);
  expect(await page.evaluate(() => navigator.bluetooth)).toBeUndefined();
  await expect(page.locator('.version')).toHaveText('ANDROID · v0.4.0');
  await expect(page.locator('#apk-download')).toBeHidden();
  await page.reload();
  await expect(page.locator('#status-left')).toHaveText('Connecté');
  await expect(page.locator('#status-right')).toHaveText('Connecté');
  expect(await page.evaluate(() => (window as any).__native.requests)).toBe(0);
  expect(await page.evaluate(() => (window as any).__native.connects)).toEqual(['AA:BB:CC:DD:EE:01', 'AA:BB:CC:DD:EE:02']);
  expect(await page.evaluate(() => (window as any).__native.writes)).toEqual([]);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
});

test('Android pause stops a held command and resume reconnects without repeating it', async ({ page }) => {
  await page.goto('./'); await connectBoth(page);
  const up = page.locator('[data-movement="allUp"]');
  await up.focus(); await page.keyboard.down('Space');
  await expect.poll(() => page.evaluate(() => (window as any).__native.writes.filter((w: any) => w.byte === 16).length)).toBeGreaterThanOrEqual(2);
  await page.evaluate(() => (window as any).__native.emit('App', 'appStateChange', { isActive: false }));
  await expect(page.locator('#movement-status')).toContainText('Arrêt demandé');
  expect(await page.evaluate(() => (window as any).__native.writes.at(-1).byte)).toBe(255);
  await page.keyboard.up('Space');
  await page.evaluate(() => {
    const native = (window as any).__native;
    for (const id of Object.keys(native.links)) {
      native.links[id] = false; native.emit('BluetoothLe', `disconnected|${id}`, {});
    }
    native.writes = []; native.emit('App', 'appStateChange', { isActive: true });
  });
  await expect(page.locator('#status-right')).toHaveText('Connecté');
  await expect(page.locator('#status-left')).toHaveText('Connecté');
  expect(await page.evaluate(() => (window as any).__native.requests)).toBe(2);
  await page.waitForTimeout(150); expect(await page.evaluate(() => (window as any).__native.writes)).toEqual([]);
});

test('Android intentional disconnect persists, and reconnect reuses the address without a chooser', async ({ page }) => {
  await page.goto('./'); await connectBoth(page);
  await page.getByRole('button', { name: 'Configurer les sommiers', exact: true }).click();
  await page.locator('[data-connect="left"]').click();
  await expect(page.locator('[data-connect="left"]')).toHaveText('Reconnecter');
  await page.reload(); await expect(page.locator('#status-right')).toHaveText('Connecté');
  await expect(page.locator('#status-left')).toHaveText('Non connecté');
  await page.getByRole('button', { name: 'Configurer les sommiers', exact: true }).click();
  await page.locator('[data-connect="left"]').click();
  await expect(page.locator('[data-connect="left"]')).toHaveText('Déconnecter');
  expect(await page.evaluate(() => (window as any).__native.requests)).toBe(0);
});

test('native diagnostics exclude Bluetooth addresses and names', async ({ page }) => {
  await page.goto('./'); await connectBoth(page);
  await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__native.shared)).toBe(true);
  const text = await page.evaluate(() => (window as any).__native.diagnostic);
  expect(text).not.toContain('AA:BB'); expect(text).not.toContain('Private native');
});
