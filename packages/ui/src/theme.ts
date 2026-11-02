import { typeScale, type TypeStyle } from '@drop/ui-tokens';
import { type TextStyle } from 'react-native';

export function typeStyle(name: TypeStyle): TextStyle {
  const token = typeScale[name];
  return {
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    fontWeight: token.fontWeight as TextStyle['fontWeight'],
  };
}
