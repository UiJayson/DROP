import { fontFace, fontFallback, typeScale, type TypeStyle } from '@drop/ui-tokens';
import { Platform, type TextStyle } from 'react-native';

const weightFace = {
  '400': 'regular',
  '500': 'medium',
  '600': 'semibold',
  '700': 'bold',
} as const;

/** Loaded face, with a system stack on web if the file has not arrived yet. */
export function fontFamilyFor(face: keyof typeof fontFace): string {
  const name = fontFace[face];
  return Platform.OS === 'web' ? `${name}, ${fontFallback}` : name;
}

export function typeStyle(name: TypeStyle): TextStyle {
  const token = typeScale[name];
  const face = token.family === 'mono' ? 'mono' : weightFace[token.fontWeight];
  return {
    fontFamily: fontFamilyFor(face),
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    letterSpacing: token.letterSpacing,
    fontWeight: 'normal',
    ...('tabular' in token && token.tabular ? { fontVariant: ['tabular-nums'] as const } : {}),
  };
}
