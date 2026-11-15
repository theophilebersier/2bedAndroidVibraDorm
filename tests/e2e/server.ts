import { preview } from 'vite';

/** Own the server directly: predictable teardown on Windows and in CI. */
export default async function setup() {
  // A repository subpath exercises the same URL shape as GitHub Pages.
  const server = await preview({ base: '/2bedAndroidVibraDorm/', preview: { host: '127.0.0.1', port: 4173, strictPort: true } });
  return async () => {
    server.httpServer.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
  };
}
