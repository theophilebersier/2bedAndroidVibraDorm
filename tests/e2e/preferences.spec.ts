import { expect, test } from '@playwright/test';
import { connectBoth, mockBluetooth } from './bluetooth-mock';
import { mockAndroid } from './native-mock';

for (const android of [false, true]) {
  test(`${android ? 'Android' : 'web'}: optional lighting migrates hidden, persists both choices and preserves beds and light values`, async ({ page }) => {
    if (android) await mockAndroid(page); else await mockBluetooth(page);
    await page.addInitScript(native => {
      const key = 'dual-bed-sync:preferences:v1';
      const storage = native ? sessionStorage : localStorage;
      const storedKey = native ? `native:${key}` : key;
      if (!storage.getItem(storedKey)) storage.setItem(storedKey, JSON.stringify({ level: 102, minutes: 60 }));
    }, android);
    await page.goto('./'); await connectBoth(page);
    await expect(page.locator('.light-panel')).toBeHidden();
    await expect(page.locator('#light-on')).toBeDisabled();
    const settings = async () => page.getByRole('button', { name: 'Configurer les sommiers', exact: true }).click();
    const close = async () => page.getByRole('button', { name: 'Revenir à la télécommande' }).click();
    const toggle = page.getByRole('checkbox', { name: 'Afficher les commandes d’éclairage' });
    const stored = () => page.evaluate(native => {
      const key = 'dual-bed-sync:preferences:v1';
      return JSON.parse((native ? sessionStorage.getItem(`native:${key}`) : localStorage.getItem(key))!);
    }, android);
    await settings(); await expect(toggle).not.toBeChecked(); await toggle.check(); await close();
    await expect(page.locator('.light-panel')).toBeVisible();
    await expect.poll(stored).toMatchObject({ level: 102, minutes: 60, showLight: true });
    await page.reload();
    await expect(page.locator('#status-right')).toHaveText('Connecté');
    await expect(page.locator('.light-panel')).toBeVisible();
    await expect(page.locator('#brightness')).toHaveValue('40');
    await expect(page.locator('#light-timer')).toHaveValue('60');
    await settings(); await expect(toggle).toBeChecked(); await toggle.uncheck(); await close();
    await expect.poll(stored).toMatchObject({ level: 102, minutes: 60, showLight: false });
    await page.reload();
    await expect(page.locator('.light-panel')).toBeHidden();
    await expect(page.locator('#status-left')).toHaveText('Connecté');
    await expect(page.locator('#status-right')).toHaveText('Connecté');
    const state = await page.evaluate(native => {
      const bridge = native ? (window as any).__native : (window as any).__ble;
      return { requests: bridge.requests, writes: bridge.writes };
    }, android);
    expect(state).toEqual({ requests: 0, writes: [] });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
