/** Dark theme from docs/03-user-flows-ui.md. The apps stay dark at MVP. */
export const colors = {
  bg: '#09090B',
  surface1: '#171719',
  surface2: '#171719',
  surface3: '#242427',
  elevated: '#2C2C30',
  separator: '#39393F',
  gradTop: '#202024',
  gradMid: '#111113',
  gradBottom: '#09090B',
  gradSheetTop: '#242427',
  gradSheetBottom: '#171719',
  gradAccentTop: '#FFF6B0',
  gradAccentBottom: '#E09600',
  /** Brighter solid for small dots and text. Large fills use yellowMetallic. */
  primary: '#FFE14A',
  primaryPressed: '#E0B000',
  onPrimary: '#101012',
  textPrimary: '#F5F5F7',
  textSecondary: '#B7B7BF',
  textTertiary: '#9C9CA4',
  disabled: '#6E6E73',
  success: '#70DDA0',
  danger: '#FF756B',
  warning: '#FF9F0A',
} as const;

export type ColorToken = keyof typeof colors;

/** Light fallback recorded for a later accessibility setting. Not applied at MVP. */
export const lightColors = {
  bg: '#FFFFFF',
  surface: '#F4F5F7',
  textPrimary: '#111214',
  textSecondary: '#5F6368',
  primary: '#FFE14A',
  onPrimary: '#101012',
} as const;

/**
 * Glossy keke yellow. Bright highlight, electric middle, warm amber base.
 * Text on these fills stays #101012 so it meets WCAG AA.
 */
export const yellowMetallic = ['#FFF6B0', '#FFE14A', '#F5B400', '#E09600'] as const;

export const gradients = {
  screen: { top: colors.gradTop, mid: colors.gradMid, bottom: colors.gradBottom },
  sheet: { top: colors.gradSheetTop, bottom: colors.gradSheetBottom },
  accent: { top: colors.gradAccentTop, bottom: colors.gradAccentBottom },
  yellow: {
    colors: yellowMetallic,
    locations: [0, 0.38, 0.72, 1] as const,
  },
} as const;
