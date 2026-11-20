import { vanta } from '@drop/ui-tokens';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

/**
 * Three-quarter Nigerian keke: one steered front wheel, two rear wheels,
 * a canopy on posts, and an open cabin.
 */
export function KekeArt({ width = 220, glow = false }: { width?: number; glow?: boolean }) {
  const height = Math.round(width * 0.58);
  return (
    <Svg width={width} height={height} viewBox="0 0 400 230">
      {glow ? <Ellipse cx="96" cy="142" rx="36" ry="14" fill="rgba(255,214,120,0.35)" /> : null}
      <Ellipse cx="200" cy="208" rx="120" ry="10" fill="rgba(0,0,0,0.4)" />

      <Circle cx="286" cy="162" r="24" fill="#0E0F12" />
      <Circle cx="286" cy="162" r="8" fill="#4A4C54" />

      <Path d="M138 84 L300 64 L312 92 L150 112 Z" fill={vanta.yellow} />
      <Path d="M150 94 L292 76 L300 90 L158 108 Z" fill="#E6AE12" />

      <Path d="M156 108 L154 176" stroke="#141416" strokeWidth="7" strokeLinecap="round" />
      <Path d="M262 96 L270 176" stroke="#141416" strokeWidth="7" strokeLinecap="round" />

      <Path d="M162 112 L256 98 L264 168 L170 180 Z" fill="#101216" />
      <Path d="M186 132 L236 122 L240 148 L190 158 Z" fill="#2A2C32" />

      <Path d="M140 100 L176 90 L170 136 L134 144 Z" fill="#1A1C22" />
      <Path d="M162 168 L272 156 L284 184 L170 194 Z" fill={vanta.yellow} />
      <Path d="M172 174 L266 164 L272 176 L178 184 Z" fill="#141416" />

      <Path d="M148 132 L100 152" stroke="#1A1C20" strokeWidth="8" strokeLinecap="round" />
      <Path d="M136 116 L108 98" stroke="#22242A" strokeWidth="5" strokeLinecap="round" />
      <Circle cx="84" cy="176" r="30" fill="#0E0F12" />
      <Circle cx="84" cy="176" r="11" fill="#4A4C54" />
      <Circle cx="84" cy="176" r="4" fill="#E8E8EA" />

      <Circle cx="128" cy="140" r="8" fill="#FFF6D0" />
      <Circle cx="128" cy="140" r="3.5" fill="#FFFFFF" />

      <Circle cx="248" cy="188" r="34" fill="#0E0F12" />
      <Circle cx="248" cy="188" r="13" fill="#4A4C54" />
      <Circle cx="248" cy="188" r="5" fill="#E8E8EA" />
    </Svg>
  );
}

export function KekeGlyph({ size = 16, color = '#E9E9E9' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 16.5h4.2l1.2-3.2h7.2l1.6 3.2H20" stroke={color} strokeWidth="1.6" fill="none" />
      <Path d="M9 9.5h6.2l1.4 3.6H10.2L9 9.5z" fill={color} />
      <Path d="M8.2 9.5h2.2l-.6 3.6H7.4L8.2 9.5z" fill={color} opacity="0.55" />
      <Circle cx="7.2" cy="17.6" r="1.7" fill={color} />
      <Circle cx="15.4" cy="17.6" r="1.7" fill={color} />
      <Circle cx="19.4" cy="16.6" r="1.35" fill={color} />
    </Svg>
  );
}

export function YellowStar({ size = 12 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2.6l2.7 6.3 6.8.6-5.2 4.4 1.6 6.6L12 16.8 6.1 20.5l1.6-6.6L2.5 9.5l6.8-.6L12 2.6z"
        fill={vanta.yellow}
      />
    </Svg>
  );
}
