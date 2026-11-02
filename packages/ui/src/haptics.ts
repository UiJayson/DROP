import * as Haptics from 'expo-haptics';

export type HapticKind = 'light' | 'medium' | 'selection' | 'success' | 'warning';

/** Short system haptics. Missing hardware (web, desktop) is ignored. */
export async function tapHaptic(kind: HapticKind): Promise<void> {
  try {
    if (kind === 'selection') {
      await Haptics.selectionAsync();
      return;
    }
    if (kind === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    if (kind === 'warning') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    await Haptics.impactAsync(
      kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    );
  } catch {
    // Web and devices without a haptic engine.
  }
}
