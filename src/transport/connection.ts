import { isAndroid } from '../platform';
import { BluetoothTransport, bluetoothSupport, chooseDevice as chooseWebDevice } from './bluetooth';
import { NativeTransport, chooseNativeDevice } from './native';
import type { RememberedDevices } from '../storage/devices';
import { SIDES, type BedTransport, type DeviceIdentity } from './types';

export const connectionSupport = (): string | null => isAndroid() ? null : bluetoothSupport();

/** Keep the web picker in the original user gesture; no await before this dispatch. */
export function chooseDevice(): Promise<DeviceIdentity> {
  return isAndroid() ? chooseNativeDevice() : chooseWebDevice();
}
export function connectDevice(device: DeviceIdentity): Promise<BedTransport> {
  return isAndroid() ? NativeTransport.connect(device) : BluetoothTransport.connect(device as BluetoothDevice);
}
export function getRememberedDevices(saved: RememberedDevices): Promise<DeviceIdentity[]> {
  if (isAndroid()) return Promise.resolve(SIDES.flatMap(side => saved[side] ? [{ id: saved[side]!.id }] : []));
  return navigator.bluetooth?.getDevices?.() ?? Promise.resolve([]);
}
