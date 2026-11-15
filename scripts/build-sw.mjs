import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = path.resolve('dist');
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]));
  return nested.flat();
}
const files = (await walk(root)).filter(file => !file.endsWith(`${path.sep}sw.js`)).sort();
const hash = createHash('sha256');
for (const file of files) hash.update(await readFile(file));
const version = hash.digest('hex').slice(0, 16);
const urls = ['./', ...files.map(file => './' + path.relative(root, file).split(path.sep).join('/'))];
const worker = `// Generated from the exact build assets. No Bluetooth or command persistence.
const PREFIX = 'dual-bed-sync:' + self.registration.scope + ':';
const CACHE = PREFIX + '${version}';
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
// Deliberately no skipWaiting/client reload: updates activate after old pages close.
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const allowed = ASSETS.map(asset => new URL(asset, self.registration.scope).href);
  if (!allowed.includes(url.href)) return;
  // All allowlisted responses are public static files of this exact build.
  // Ignore server Vary: Origin differences between precache and module requests.
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request, { ignoreVary: true })) || fetch(event.request)));
});
`;
await writeFile(path.join(root, 'sw.js'), worker);
console.log(`Offline shell generated: ${files.length} assets, ${version}`);
