import { Capacitor } from '@capacitor/core';

export const isAndroid = (): boolean => Capacitor.getPlatform() === 'android';
