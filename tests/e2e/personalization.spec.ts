import { expect, test, type Page } from '@playwright/test';
import { connectBoth, mockBluetooth } from './bluetooth-mock';
import { mockAndroid } from './native-mock';

const settings = (page: Page) => page.getByRole('button', { name: 'Configurer les sommiers', exact: true }).click();
const close = (page: Page) => page.getByRole('button', { name: 'Revenir à la télécommande' }).click();
for (const android of [false, true]) {
  test(`${android ? 'Android' : 'web'} personalization persists without motion, favorite selects only its bed, disabled haptics stay off`, async ({ page }) => {
    if (android) await mockAndroid(page); else await mockBluetooth(page);
    await page.goto('./'); await connectBoth(page); await settings(page);
    await page.getByLabel('Thème', { exact: true }).selectOption('dark');
    await page.getByLabel('Nom du côté gauche').fill('Théo');
    await page.getByLabel('Nom du côté droit').fill('Nathalie');
    await page.getByLabel('Sélection à l’ouverture').selectOption('left');
    await page.getByLabel('Interface simplifiée · grands boutons', { exact: true }).check();
    await page.getByLabel('Retour tactile des commandes', { exact: true }).uncheck();
    await expect(page.locator('#preferences-status')).toHaveText('Réglages enregistrés.');
    await close(page);
    await expect(page.locator('button[data-target="both"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.bed-stage')).toBeHidden();
    await expect(page.locator('#name-left')).toHaveText('Théo');
    expect(await page.evaluate(native => ((window as any)[native ? '__native' : '__ble']).writes, android)).toEqual([]);
    await page.reload();
    await expect(page.locator('#status-left')).toHaveText('Connecté');
    await expect(page.locator('#status-right')).toHaveText('Connecté');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('button[data-target="left"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#bed-title')).toHaveText('Théo');
    await expect(page.locator('#name-right')).toHaveText('Nathalie');
    await expect(page.locator('.bed-stage')).toBeHidden();
    const size = await page.locator('[data-movement="backUp"]').boundingBox();
    expect(size!.height).toBeGreaterThanOrEqual(72);
    await expect(page.locator('.light-panel')).toBeHidden();
    const idle = await page.evaluate(native => {
      const state = (window as any)[native ? '__native' : '__ble'];
      return { requests: state.requests, writes: state.writes };
    }, android);
    expect(idle).toEqual({ requests: 0, writes: [] });
    const up = page.getByRole('button', { name: 'Lever le dossier', exact: true });
    await up.focus(); await page.keyboard.down('Space');
    await expect(page.locator('#selection-state')).toHaveText('En mouvement');
    await page.keyboard.up('Space');
    await expect(page.locator('#movement-status')).toContainText('Arrêt demandé');
    const movement = await page.evaluate(native => ((window as any)[native ? '__native' : '__ble']).writes.filter((w: any) => w.byte === 11), android);
    expect(movement.length).toBeGreaterThan(0);
    expect(movement.every((w: any) => android ? w.id.endsWith('01') : w.side === 0)).toBe(true);
    if (android) expect(await page.evaluate(() => (window as any).__native.haptics)).toEqual([]);
    await settings(page);
    await expect(page.getByLabel('Retour tactile des commandes', { exact: true })).not.toBeChecked();
    await page.getByLabel('Interface simplifiée · grands boutons', { exact: true }).uncheck();
    await page.getByLabel('Sélection à l’ouverture').selectOption('right');
    await expect(page.locator('#preferences-status')).toHaveText('Réglages enregistrés.');
    await close(page); await page.reload();
    await expect(page.locator('.bed-stage')).toBeVisible();
    await expect(page.locator('button[data-target="right"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#bed-title')).toHaveText('Nathalie');
  });

  test(`${android ? 'Android' : 'web'} theme follows the system only in automatic mode and names are text`, async ({ page }) => {
    if (android) await mockAndroid(page);
    await page.emulateMedia({ colorScheme: 'dark' }); await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await settings(page); await page.getByLabel('Thème', { exact: true }).selectOption('light');
    await page.emulateMedia({ colorScheme: 'light' }); await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByLabel('Thème', { exact: true }).selectOption('system');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByLabel('Nom du côté gauche').fill('<img src=x onerror=alert(1)>');
    await expect(page.locator('#setup-name-left')).toContainText('<img src=x onerror=alert(1)>');
    expect(await page.locator('#setup-name-left img').count()).toBe(0);
    await page.getByLabel('Nom du côté gauche').fill('');
    await close(page); await expect(page.locator('#name-left')).toHaveText('Lit gauche');
    if (android) expect((await page.evaluate(() => (window as any).__native.bars)).at(-1)).toBe('LIGHT');
  });
}

test('native tactile feedback occurs once per start/end and a broken or pending vibrator cannot delay STOP', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mockAndroid(page); await page.goto('./');
  expect(await page.evaluate(() => (window as any).__native.haptics)).toEqual([]);
  await connectBoth(page);
  for (const behavior of ['normal', 'hapticsFail', 'hapticsPending']) {
    await page.evaluate(key => {
      const state = (window as any).__native; state.haptics = [];
      state.hapticsFail = key === 'hapticsFail'; state.hapticsPending = key === 'hapticsPending';
    }, behavior);
    await page.getByRole('button', { name: 'Lever le dossier', exact: true }).focus();
    await page.keyboard.down('Space');
    await expect(page.locator('#selection-state')).toHaveText('En mouvement');
    await page.waitForTimeout(100);
    await page.keyboard.up('Space');
    await expect(page.locator('#movement-status')).toContainText('Arrêt demandé');
    await expect.poll(() => page.evaluate(() => (window as any).__native.haptics)).toEqual(['LIGHT', 'MEDIUM']);
    expect(await page.evaluate(() => (window as any).__native.writes.at(-1).byte)).toBe(255);
  }
  expect(errors).toEqual([]);
});
