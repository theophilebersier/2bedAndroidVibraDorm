import { expect, test } from '@playwright/test';
import { connectBoth, mockBluetooth } from './bluetooth-mock';

const errors = new WeakMap<object, string[]>();
test.beforeEach(({ page }) => {
  const messages: string[] = []; errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
});
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });
async function showLight(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: 'Configurer les sommiers', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Afficher les commandes d’éclairage' }).check();
  await page.getByRole('button', { name: 'Revenir à la télécommande' }).click();
}
async function holdButton(page: import('@playwright/test').Page, name: string): Promise<void> {
  const button = page.getByRole('button', { name, exact: true });
  await button.scrollIntoViewIfNeeded(); const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
}

test('starts disconnected, simulation requires an explicit choice, layout fits', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Le confort, à deux.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lever le dossier', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Essayer sans connecter de lit' }).click();
  await expect(page.locator('#demo-banner')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lever le dossier', exact: true })).toBeEnabled();
  await showLight(page);
  await page.getByRole('button', { name: 'Allumer / appliquer' }).click();
  await expect(page.locator('#light-state')).toContainText('Gauche : 71 %');
  await page.getByRole('button', { name: 'Éteindre', exact: true }).click();
  await expect(page.locator('#light-state')).toContainText('éteint');
});

test('simulation never invokes an available Bluetooth API', async ({ page }) => {
  await mockBluetooth(page); await page.goto('./');
  await page.getByRole('button', { name: 'Essayer sans connecter de lit' }).click();
  await showLight(page);
  await page.getByRole('button', { name: 'Allumer / appliquer' }).click();
  await expect(page.locator('#light-state')).toContainText('71 %');
  expect(await page.evaluate(() => (window as any).__ble.requests)).toBe(0);
});

test('real GATT path: no movement during setup, hold/release reaches both receivers', async ({ page }) => {
  await mockBluetooth(page); await page.goto('./'); await connectBoth(page);
  expect(await page.evaluate(() => (window as any).__ble.writes)).toEqual([]);
  await holdButton(page, 'Lever le dossier');
  await expect.poll(async () => page.evaluate(() => (window as any).__ble.writes.filter((w: any) => w.byte === 11).length)).toBeGreaterThanOrEqual(2);
  await page.mouse.move(2, 2); await page.mouse.up();
  await expect(page.locator('#movement-status')).toContainText('Arrêt demandé');
  const writes = await page.evaluate(() => (window as any).__ble.writes);
  for (const side of [0, 1]) expect(writes.filter((w: any) => w.side === side).at(-1).byte).toBe(255);
});

test('a lost receiver blocks both and reconnection does not restart motion', async ({ page }) => {
  await mockBluetooth(page); await page.goto('./'); await connectBoth(page);
  await holdButton(page, 'Lever les jambes');
  await page.evaluate(() => (window as any).__ble.devices[1].gatt.disconnect());
  await expect(page.locator('#status-right')).toHaveText('Non connecté');
  await expect(page.getByRole('button', { name: 'Lever les jambes', exact: true })).toBeDisabled();
  await page.mouse.up();
  await page.getByRole('button', { name: 'Configurer les sommiers', exact: true }).click();
  await page.locator('[data-connect="right"]').click();
  await expect(page.locator('[data-connect="right"]')).toHaveText('Déconnecter');
  await page.getByRole('button', { name: 'Revenir à la télécommande' }).click();
  const before = await page.evaluate(() => (window as any).__ble.writes.length);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => (window as any).__ble.writes.length)).toBe(before);
});

test('keyboard focus loss requests STOP', async ({ page }) => {
  await mockBluetooth(page); await page.goto('./'); await connectBoth(page);
  const up = page.getByRole('button', { name: 'Lever le dossier', exact: true });
  await up.focus(); await page.keyboard.down('Space');
  await expect(page.locator('#selection-state')).toHaveText('En mouvement');
  await page.keyboard.press('Tab');
  await expect(page.locator('#movement-status')).toContainText('Arrêt demandé');
  await page.keyboard.up('Space');
});

test('page visibility loss ends a held command', async ({ page }) => {
  await mockBluetooth(page); await page.goto('./'); await connectBoth(page);
  await holdButton(page, 'Baisser le dossier');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('#movement-status')).toContainText('Arrêt demandé');
});

test('offline shell reloads disconnected without resuming the simulation', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.getByRole('button', { name: 'Essayer sans connecter de lit' }).click();
  await context.setOffline(true); await page.reload();
  await expect(page.getByRole('heading', { name: 'Le confort, à deux.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lever le dossier', exact: true })).toBeDisabled();
  await expect(page.locator('#demo-banner')).toBeHidden();
});

test('diagnostic download contains no device identity', async ({ page }) => {
  await mockBluetooth(page); await page.goto('./'); await connectBoth(page);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Diagnostic', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('dual-bed-sync-diagnostic.json');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  expect(text).not.toContain('Private'); expect(text).not.toContain('private-');
  expect(JSON.parse(text).hardwareValidated).toBe(false);
});

test('reload restores the same left/right receivers without a picker or a motor command', async ({ page }) => {
  await mockBluetooth(page); await page.goto('./'); await connectBoth(page);
  await page.reload();
  await expect(page.locator('#status-left')).toHaveText('Connecté');
  await expect(page.locator('#status-right')).toHaveText('Connecté');
  expect(await page.evaluate(() => (window as any).__ble.requests)).toBe(0);
  expect(await page.evaluate(() => (window as any).__ble.connects)).toEqual([0, 1]);
  expect(await page.evaluate(() => (window as any).__ble.writes)).toEqual([]);
  await page.getByRole('button', { name: 'Configurer les sommiers', exact: true }).click();
  await expect(page.locator('#device-left')).toHaveText('Private Bluetooth 0');
  await expect(page.locator('#device-right')).toHaveText('Private Bluetooth 1');
});

test('return from another app reconnects lost receivers without repeating the held command', async ({ page }) => {
  await mockBluetooth(page); await page.goto('./'); await connectBoth(page);
  await holdButton(page, 'Lever le dossier');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('#movement-status')).toContainText('Arrêt demandé');
  await page.mouse.up();
  await page.evaluate(() => {
    const ble = (window as any).__ble;
    ble.devices.forEach((device: any) => device.gatt.disconnect());
    ble.writes = [];
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await expect(page.locator('#status-right')).toHaveText('Connecté');
  await expect(page.locator('#status-left')).toHaveText('Connecté');
  expect(await page.evaluate(() => (window as any).__ble.requests)).toBe(2);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__ble.writes)).toEqual([]);
  await expect(page.locator('#selection-state')).toHaveText('Connecté');
});

test('intentional disconnection survives reload and manual reconnect enables remembering again', async ({ page }) => {
  await mockBluetooth(page); await page.goto('./'); await connectBoth(page);
  await page.getByRole('button', { name: 'Configurer les sommiers', exact: true }).click();
  await page.locator('[data-connect="left"]').click();
  await expect(page.locator('[data-connect="left"]')).toHaveText('Reconnecter');
  await page.reload();
  await expect(page.locator('#status-right')).toHaveText('Connecté');
  await expect(page.locator('#status-left')).toHaveText('Non connecté');
  expect(await page.evaluate(() => (window as any).__ble.connects)).toEqual([1]);
  await page.getByRole('button', { name: 'Configurer les sommiers', exact: true }).click();
  await page.locator('[data-connect="left"]').click();
  await expect(page.locator('[data-connect="left"]')).toHaveText('Déconnecter');
  await page.reload();
  await expect(page.locator('#status-left')).toHaveText('Connecté');
  expect(await page.evaluate(() => (window as any).__ble.requests)).toBe(0);
});

test('a browser without getDevices offers manual permission renewal after reload', async ({ page }) => {
  await mockBluetooth(page, false); await page.goto('./'); await connectBoth(page);
  await page.reload();
  await page.getByRole('button', { name: 'Configurer les sommiers', exact: true }).click();
  await expect(page.locator('#setup-status')).toContainText('Autorisation Bluetooth à renouveler');
  await expect(page.locator('[data-connect="left"]')).toHaveText('Reconnecter');
  expect(await page.evaluate(() => (window as any).__ble.requests)).toBe(0);
  await page.locator('[data-connect="left"]').click();
  await expect(page.locator('[data-connect="left"]')).toHaveText('Déconnecter');
});

test('a transient connection failure is retried without asking for another device', async ({ page }) => {
  await mockBluetooth(page); await page.goto('./'); await connectBoth(page);
  await page.evaluate(() => {
    const ble = (window as any).__ble;
    ble.failures = 1; ble.devices[1].gatt.disconnect(); ble.writes = [];
  });
  await expect(page.locator('#status-right')).toHaveText('Connecté', { timeout: 10000 });
  expect(await page.evaluate(() => (window as any).__ble.requests)).toBe(2);
  expect(await page.evaluate(() => (window as any).__ble.connects.filter((side: number) => side === 1).length)).toBe(3);
  expect(await page.evaluate(() => (window as any).__ble.writes)).toEqual([]);
});

test('Tout monter sends 0x10 only while held, to the selected beds, then STOP', async ({ page }) => {
  await mockBluetooth(page); await page.goto('./'); await connectBoth(page);
  await holdButton(page, 'Tout monter Maintenir le bouton');
  await expect.poll(async () => page.evaluate(() => (window as any).__ble.writes.filter((w: any) => w.byte === 16).length)).toBeGreaterThanOrEqual(2);
  await page.mouse.up();
  await expect(page.locator('#movement-status')).toContainText('Arrêt demandé');
  const writes = await page.evaluate(() => (window as any).__ble.writes);
  for (const side of [0, 1]) expect(writes.filter((w: any) => w.side === side).at(-1).byte).toBe(255);
  await page.getByRole('button', { name: 'Gauche', exact: true }).click();
  await expect(page.locator('#bed-title')).toHaveText('Le sommier gauche');
  await page.evaluate(() => { (window as any).__ble.writes = []; });
  await holdButton(page, 'Tout monter Maintenir le bouton');
  await expect.poll(async () => page.evaluate(() => (window as any).__ble.writes.filter((w: any) => w.byte === 16).length)).toBeGreaterThan(0);
  await page.mouse.up();
  expect(await page.evaluate(() => (window as any).__ble.writes.filter((w: any) => w.byte === 16).every((w: any) => w.side === 0))).toBe(true);
});

test('remembered real beds remain disconnected when returning in simulation', async ({ page }) => {
  await mockBluetooth(page); await page.goto('./'); await connectBoth(page);
  await page.getByRole('button', { name: 'Essayer sans connecter de lit' }).click();
  await expect(page.locator('#demo-banner')).toBeVisible();
  await page.evaluate(() => {
    (window as any).__ble.writes = [];
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__ble.connects)).toEqual([0, 1]);
  expect(await page.evaluate(() => (window as any).__ble.writes)).toEqual([]);
  await expect(page.locator('#status-left')).toHaveText('Simulé · connecté');
});
