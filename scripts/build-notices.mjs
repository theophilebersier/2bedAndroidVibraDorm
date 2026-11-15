import { readFile, writeFile } from 'node:fs/promises';
const packages = ['@capacitor/core', '@capacitor/android', '@capacitor/app', '@capacitor/preferences',
  '@capacitor/filesystem', '@capacitor/share', '@capacitor/synapse', '@capacitor-community/bluetooth-le'];
let text = 'Dual Bed Sync — runtime component licences\n\n';
for (const name of packages) {
  const directory = `node_modules/${name}`;
  const info = JSON.parse(await readFile(`${directory}/package.json`, 'utf8'));
  let license;
  for (const filename of ['LICENSE', 'LICENSE.md', 'LICENSE.txt']) {
    try { license = await readFile(`${directory}/${filename}`, 'utf8'); break; } catch {}
  }
  if (!license) throw new Error(`Missing licence for ${name}`);
  text += `${name} ${info.version}\n${'='.repeat(64)}\n${license}\n\n`;
}
await writeFile('public/THIRD_PARTY_LICENSES.txt', text);
