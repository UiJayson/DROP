import './images';
import { vanta } from '@drop/ui-tokens';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import kekeSource from '../assets/keke/keke.png';
const kekeAspect = 279 / 260;

/** Cut-out Bajaj RE photograph. See docs/reference/CREDITS.md. */
export function KekeArt({ width = 220, glow = false }: { width?: number; glow?: boolean }) {
  const height = Math.round(width * kekeAspect);
  return (
    <View style={{ width, height }}>
      {glow ? (
        <Svg width={width * 0.55} height={height * 0.28} style={styles.glow} pointerEvents="none">
          <Defs>
            <RadialGradient id="headlight" cx="70%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="rgba(255,214,120,0.55)" />
              <Stop offset="100%" stopColor="rgba(255,198,41,0)" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#headlight)" />
        </Svg>
      ) : null}
      <Image
        source={kekeSource}
        style={{ width, height }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    left: 0,
    top: '42%',
  },
});

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
