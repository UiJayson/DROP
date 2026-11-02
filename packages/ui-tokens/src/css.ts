import { colors } from './colors';

/** CSS variables for the admin site. Mobile apps read the JS tokens directly. */
export function darkCssVariables(): Record<string, string> {
  return {
    '--drop-bg': colors.bg,
    '--drop-surface-1': colors.surface1,
    '--drop-surface-2': colors.surface2,
    '--drop-surface-3': colors.surface3,
    '--drop-separator': colors.separator,
    '--drop-grad-top': colors.gradTop,
    '--drop-grad-bottom': colors.gradBottom,
    '--drop-primary': colors.primary,
    '--drop-on-primary': colors.onPrimary,
    '--drop-text-primary': colors.textPrimary,
    '--drop-text-secondary': colors.textSecondary,
    '--drop-text-tertiary': colors.textTertiary,
    '--drop-success': colors.success,
    '--drop-danger': colors.danger,
    '--drop-warning': colors.warning,
  };
}
