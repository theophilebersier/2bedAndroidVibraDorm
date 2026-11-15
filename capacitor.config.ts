import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ch.bersier.dualbedsync',
  appName: 'Dual Bed Sync',
  webDir: 'dist',
  android: { backgroundColor: '#f5f2ed' },
  plugins: {
    SystemBars: { insetsHandling: 'native', initialViewportFitValueHint: 'cover', style: 'LIGHT' },
    BluetoothLe: {
      displayStrings: {
        scanning: 'Recherche des sommiers…', cancel: 'Annuler',
        availableDevices: 'Choisir le sommier', noDeviceFound: 'Aucun appareil trouvé',
      },
    },
  },
};
export default config;
