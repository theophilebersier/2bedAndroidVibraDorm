import type { Page } from '@playwright/test';

/** Exercise the real Capacitor wrappers over a simulated Android plugin bridge. */
export async function mockAndroid(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const suffix = '-9f03-0de5-96c5-b8f4f3081186';
    const uuid = (value: string) => `0000${value}${suffix}`;
    const state = { requests: 0, connects: [] as string[], writes: [] as { id: string; byte: number }[],
      links: {} as Record<string, boolean>, light: '00 00 00', diagnostic: '', shared: false,
      emit: (plugin: string, event: string, value: unknown) => {
        for (const entry of callbacks.values()) if (entry.plugin === plugin && entry.event === event) entry.callback(value);
      } };
    const callbacks = new Map<string, { plugin: string; event: string; callback: (data: unknown) => void }>();
    let nextCallback = 0;
    const methods = (names: string[]) => [...names.map(name => ({ name, rtype: 'promise' })), { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }];
    const services = [
      { uuid: uuid('1525'), characteristics: [
        { uuid: uuid('1526'), properties: { write: true } },
        { uuid: uuid('1529'), properties: { write: true, read: true } },
      ] }, { uuid: uuid('1527'), characteristics: [] },
      { uuid: '00001800-0000-1000-8000-00805f9b34fb', characteristics: [] },
    ];
    Object.defineProperty(navigator, 'bluetooth', { configurable: true, value: undefined });
    Object.assign(window, { androidBridge: {}, __native: state, Capacitor: {
      PluginHeaders: [
        { name: 'Preferences', methods: methods(['get', 'set']) },
        { name: 'App', methods: methods(['minimizeApp']) },
        { name: 'Filesystem', methods: methods(['writeFile']) },
        { name: 'Share', methods: methods(['share']) },
        { name: 'BluetoothLe', methods: methods(['initialize', 'isEnabled', 'requestEnable', 'requestDevice', 'connect', 'disconnect', 'getServices', 'read', 'write']) },
      ],
      nativeCallback: (plugin: string, method: string, options: any, callback: (value: unknown) => void) => {
        if (method !== 'addListener') throw new Error('Unexpected callback');
        const id = String(nextCallback++); callbacks.set(id, { plugin, event: options.eventName, callback }); return id;
      },
      nativePromise: async (plugin: string, method: string, options: any = {}) => {
        if (method === 'removeListener') { callbacks.delete(options.callbackId); return; }
        if (plugin === 'Preferences') {
          if (method === 'get') return { value: sessionStorage.getItem(`native:${options.key}`) };
          if (method === 'set') { sessionStorage.setItem(`native:${options.key}`, options.value); return; }
        }
        if (plugin === 'App' && method === 'minimizeApp') return;
        if (plugin === 'Filesystem' && method === 'writeFile') {
          state.diagnostic = options.data; return { uri: 'file:///cache/dual-bed-sync-diagnostic.json' };
        }
        if (plugin === 'Share' && method === 'share') { state.shared = true; return {}; }
        if (plugin === 'BluetoothLe') {
          switch (method) {
            case 'initialize': case 'requestEnable': return;
            case 'isEnabled': return { value: true };
            case 'requestDevice': return { deviceId: `AA:BB:CC:DD:EE:0${++state.requests}`, name: `Private native ${state.requests}` };
            case 'connect': state.connects.push(options.deviceId); state.links[options.deviceId] = true; return;
            case 'disconnect': state.links[options.deviceId] = false; state.emit('BluetoothLe', `disconnected|${options.deviceId}`, {}); return;
            case 'getServices': return { services };
            case 'read': return { value: state.light };
            case 'write':
              if (!state.links[options.deviceId]) throw new Error('Disconnected');
              if (options.characteristic === uuid('1526')) state.writes.push({ id: options.deviceId, byte: parseInt(options.value.replaceAll(' ', '').slice(0, 2), 16) });
              else state.light = options.value;
              return;
          }
        }
        throw new Error(`Unexpected plugin method: ${plugin}.${method}`);
      },
    } });
  });
}
