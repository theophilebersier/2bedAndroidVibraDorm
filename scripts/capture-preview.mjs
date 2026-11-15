import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4180', '--strictPort'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Preview server did not start.')), 15000);
    server.stdout.on('data', data => { if (data.toString().includes('4180')) { clearTimeout(timer); resolve(); } });
    server.once('error', reject);
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
  });
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  for (const [name, width, height] of [['desktop', 1440, 1100], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const response = await page.goto('http://127.0.0.1:4180/');
    if (response.status() !== 200) throw new Error('HTTP preview failed.');
    await page.getByRole('button', { name: 'Essayer sans connecter de lit' }).click();
    await page.getByRole('button', { name: 'Allumer / appliquer' }).click();
    await page.getByText('État de la lumière relu sur les sommiers sélectionnés.').waitFor();
    await page.screenshot({ path: `docs/preview-${name}.png`, fullPage: true });
    await page.setViewportSize({ width: 320, height: 740 });
    if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw new Error('Horizontal overflow at 320px.');
    await page.close();
  }
  console.log('HTTP 200, desktop/mobile captures saved, layout verified down to 320px.');
} finally { if (browser) await browser.close(); server.kill(); }
