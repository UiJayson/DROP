import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

/** Side-view keke illustration. Transparent outside the drawing. */
export function KekeArt({ width = 168 }: { width?: number }) {
  const height = Math.round(width * 0.62);
  return (
    <Svg width={width} height={height} viewBox="0 0 168 104">
      <Ellipse cx="86" cy="92" rx="58" ry="8" fill="rgba(0,0,0,0.45)" />
      <Path d="M18 70h96l14-22H62L48 70H18z" fill="#F2C14D" />
      <Path d="M62 48h48l12 16H70L62 48z" fill="#FFE08A" />
      <Path d="M78 50h22l6 12H84L78 50z" fill="#1A1C22" opacity="0.85" />
      <Path d="M114 48h16l10 18h-20l-6-18z" fill="#FFC629" />
      <Rect x="22" y="58" width="28" height="12" rx="3" fill="#17181C" />
      <Circle cx="40" cy="74" r="14" fill="#121316" />
      <Circle cx="40" cy="74" r="6" fill="#3A3D44" />
      <Circle cx="118" cy="74" r="14" fill="#121316" />
      <Circle cx="118" cy="74" r="6" fill="#3A3D44" />
      <Circle cx="146" cy="70" r="10" fill="#121316" />
      <Circle cx="146" cy="70" r="4" fill="#3A3D44" />
      <Path d="M128 62h22" stroke="#E9E9E9" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function KekeGlyph({ size = 18, color = '#E9E9E9' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 15h12l2-4H8L6 15H3z" fill={color} />
      <Circle cx="7" cy="17.5" r="2" fill={color} />
      <Circle cx="16" cy="17.5" r="2" fill={color} />
      <Circle cx="20.5" cy="16" r="1.6" fill={color} />
    </Svg>
  );
}
