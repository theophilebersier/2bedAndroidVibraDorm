import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { isAndroid } from '../platform';
import type { Theme } from '../storage/preferences';

export const systemTheme = matchMedia('(prefers-color-scheme: dark)');
export function applyTheme(theme: Theme): void {
  const dark = theme === 'dark' || (theme === 'system' && systemTheme.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101913' : '#f5f2ed');
  if (isAndroid()) void SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
}
