export const fontFamily = {
  ios: 'SF Pro',
  android: 'Inter, Roboto',
  web: 'Inter, Roboto, system-ui, sans-serif',
} as const;

export const typeScale = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  fare: { fontSize: 36, lineHeight: 44, fontWeight: '700' },
} as const;

export type TypeStyle = keyof typeof typeScale;
