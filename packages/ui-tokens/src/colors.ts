/** Dark theme from docs/03-user-flows-ui.md. The apps stay dark at MVP. */
export const colors = {
  bg: '#0A0A0B',
  surface1: '#141416',
  surface2: '#1C1C1F',
  surface3: '#26262A',
  separator: '#2E2E33',
  gradTop: '#1A1A1D',
  gradBottom: '#0A0A0B',
  gradSheetTop: '#222226',
  gradSheetBottom: '#161618',
  gradAccentTop: '#FFD45C',
  gradAccentBottom: '#FFB800',
  primary: '#FFC629',
  primaryPressed: '#E0AC1A',
  onPrimary: '#0A0A0B',
  textPrimary: '#F5F5F7',
  textSecondary: '#A1A1A6',
  textTertiary: '#8A8A90',
  disabled: '#6E6E73',
  success: '#34C77B',
  danger: '#FF5A4F',
  warning: '#FF9F0A',
} as const;

export type ColorToken = keyof typeof colors;

/** Light fallback recorded for a later accessibility setting. Not applied at MVP. */
export const lightColors = {
  bg: '#FFFFFF',
  surface: '#F4F5F7',
  textPrimary: '#111214',
  textSecondary: '#5F6368',
  primary: '#FFC629',
  onPrimary: '#0A0A0B',
} as const;

export const gradients = {
  screen: { top: colors.gradTop, bottom: colors.gradBottom },
  sheet: { top: colors.gradSheetTop, bottom: colors.gradSheetBottom },
  accent: { top: colors.gradAccentTop, bottom: colors.gradAccentBottom },
} as const;
