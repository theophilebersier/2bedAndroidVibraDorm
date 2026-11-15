import { expect, test } from '@playwright/test';
import { connectBoth } from './bluetooth-mock';
import { mockAndroid } from './native-mock';

test('Galaxy S24 portrait: all large controls fit without scrolling or clipping, including Android insets and long names', async ({ page }) => {
  await mockAndroid(page); await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('./'); await connectBoth(page);
  await page.getByRole('button', { name: 'Configurer les sommiers', exact: true }).click();
  await page.getByLabel('Interface simplifiée · grands boutons', { exact: true }).check();
  await page.getByLabel('Nom du côté gauche').fill('WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW');
  await page.getByLabel('Nom du côté droit').fill('WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW');
  await page.getByRole('button', { name: 'Revenir à la télécommande' }).click();
  for (const height of [780, 700]) {
    await page.setViewportSize({ width: 360, height });
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--safe-area-top', '24px');
      document.documentElement.style.setProperty('--safe-area-bottom', '24px');
    });
    const bounds = await page.evaluate(() => ({ height: innerHeight, scroll: document.documentElement.scrollHeight, width: innerWidth, contentWidth: document.documentElement.scrollWidth }));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.height + 1);
    expect(bounds.contentWidth).toBeLessThanOrEqual(bounds.width);
    const controls = await page.locator('button[data-movement], #stop, button[data-target], #open-setup').evaluateAll(buttons => buttons.map(button => {
      const box = button.getBoundingClientRect();
      return { id: button.id || button.getAttribute('data-movement') || button.getAttribute('data-target'), top: box.top, bottom: box.bottom,
        width: box.width, height: box.height, reachable: document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.closest('button') === button };
    }));
    for (const control of controls) {
      expect(control.top, `${control.id} top`).toBeGreaterThanOrEqual(24);
      expect(control.bottom, `${control.id} bottom`).toBeLessThanOrEqual(height - 24);
      expect(control.width).toBeGreaterThanOrEqual(44);
      expect(control.height).toBeGreaterThanOrEqual(44);
      expect(control.reachable, `${control.id} visible touch surface`).toBe(true);
    }
  }
  const up = page.locator('[data-movement="allUp"]');
  await up.focus(); await page.keyboard.down('Space');
  await expect.poll(() => page.evaluate(() => (window as any).__native.writes.filter((w: any) => w.byte === 16).length)).toBeGreaterThanOrEqual(2);
  await page.keyboard.up('Space');
  await expect(page.locator('#movement-status')).toContainText('Arrêt demandé');
  expect(await page.evaluate(() => (window as any).__native.writes.at(-1).byte)).toBe(255);
  const layout = await page.locator('.flat-button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().top));
  expect(layout[0]).toBe(layout[1]);
  await page.getByRole('button', { name: 'Configurer les sommiers', exact: true }).click();
  await page.getByLabel('Retour tactile des commandes', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Revenir à la télécommande' }).click();
  await page.reload(); await expect(page.locator('#app')).toHaveAttribute('data-simple', 'true');
});
