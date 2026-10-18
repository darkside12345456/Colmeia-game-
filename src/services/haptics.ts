// Vibração leve (secção 8), desligável nas Definições.
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNative } from './platform';

export class HapticsService {
  enabled = true;
  light(): void {
    this.vibrate(ImpactStyle.Light, 10);
  }
  medium(): void {
    this.vibrate(ImpactStyle.Medium, 25);
  }
  private vibrate(style: ImpactStyle, ms: number): void {
    if (!this.enabled) return;
    try {
      if (isNative) void Haptics.impact({ style });
      else navigator.vibrate?.(ms);
    } catch {
      /* sem vibração disponível */
    }
  }
}
