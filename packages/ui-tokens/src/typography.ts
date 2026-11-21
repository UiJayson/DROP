/**
 * Kredete's type, used across DROP.
 * Bricolage Grotesque carries every reading role. Geist Mono is only for
 * figures that should stay tabular: PIN and code cells, and timers.
 * Fares stay in Bricolage and ask for tabular numbers when the cut has them.
 * Weights name the real font files. Screens set fontWeight to normal so the
 * browser does not synthesize a second bold.
 */
export const fontFace = {
  regular: 'BricolageGrotesque_400Regular',
  medium: 'BricolageGrotesque_500Medium',
  semibold: 'BricolageGrotesque_600SemiBold',
  bold: 'BricolageGrotesque_700Bold',
  mono: 'GeistMono_500Medium',
} as const;

export const fontFallback = 'system-ui, sans-serif';

export const typeScale = {
  display: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    family: 'text',
  },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: 0, family: 'text' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: 0, family: 'text' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400', letterSpacing: 0, family: 'text' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500', letterSpacing: 0, family: 'text' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0, family: 'text' },
  button: { fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: 0, family: 'text' },
  fare: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    family: 'text',
    tabular: true,
  },
  digits: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '500',
    letterSpacing: 0,
    family: 'mono',
    tabular: true,
  },
  timer: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '500',
    letterSpacing: 0,
    family: 'mono',
    tabular: true,
  },
} as const;

export type TypeStyle = keyof typeof typeScale;
