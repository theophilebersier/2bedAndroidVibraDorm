import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isAndroid } from '../platform';

/** Best effort feedback, never awaited by motor control or STOP. */
export function feedback(enabled: boolean, stopped: boolean): void {
  if (!enabled || document.hidden) return;
  void Promise.resolve().then(async () => {
    if (isAndroid()) await Haptics.impact({ style: stopped ? ImpactStyle.Medium : ImpactStyle.Light });
    else navigator.vibrate?.(stopped ? 20 : 12);
  }).catch(() => {});
}
