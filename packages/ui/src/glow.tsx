import { surfaceGlow, vanta } from '@drop/ui-tokens';
import { useId, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

type GlowKind = 'card' | 'header';

export function GlowSurface({
  children,
  kind = 'card',
  radius = vanta.cardRadius,
  style,
  clip = true,
}: {
  children?: ReactNode;
  kind?: GlowKind;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  clip?: boolean;
}) {
  const rawId = useId().replace(/:/g, '');
  const glowId = `glow-${rawId}`;
  const rimId = `rim-${rawId}`;
  const [box, setBox] = useState({ width: 0, height: 0 });
  const recipe = surfaceGlow[kind];
  const topRadius = kind === 'header' ? 0 : radius;
  const bottomRadius = radius;

  return (
    <View
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width !== box.width || height !== box.height) {
          setBox({ width, height });
        }
      }}
      style={[
        styles.surface,
        {
          backgroundColor: clip ? vanta.surface : 'transparent',
          overflow: clip ? 'hidden' : 'visible',
          borderTopLeftRadius: topRadius,
          borderTopRightRadius: topRadius,
          borderBottomLeftRadius: bottomRadius,
          borderBottomRightRadius: bottomRadius,
        },
        style,
      ]}
    >
      {box.width > 0 && box.height > 0 ? (
        <Svg
          width={box.width}
          height={box.height}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id={glowId} cx={recipe.cx} cy={recipe.cy} rx="78%" ry="72%">
              <Stop offset="0%" stopColor={recipe.inner} />
              <Stop offset="46%" stopColor={recipe.mid} />
              <Stop offset="100%" stopColor={recipe.outer} />
            </RadialGradient>
            <LinearGradient id={rimId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={vanta.rimTop} />
              <Stop offset="100%" stopColor={vanta.rimBottom} />
            </LinearGradient>
          </Defs>
          <Rect
            x={0.5}
            y={0.5}
            width={Math.max(box.width - 1, 0)}
            height={Math.max(box.height - 1, 0)}
            rx={bottomRadius}
            ry={bottomRadius}
            fill={`url(#${glowId})`}
            stroke={`url(#${rimId})`}
            strokeWidth={1}
          />
        </Svg>
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function GlowCard({
  children,
  style,
  contentStyle,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <GlowSurface kind="card" style={style}>
      <View style={[styles.cardPad, contentStyle]}>{children}</View>
    </GlowSurface>
  );
}

export function HeaderSheet({
  children,
  style,
  clip = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  clip?: boolean;
}) {
  return (
    <GlowSurface kind="header" radius={vanta.sheetRadius} style={style} clip={clip}>
      <View style={styles.headerPad}>{children}</View>
    </GlowSurface>
  );
}

const styles = StyleSheet.create({
  surface: {
    position: 'relative',
  },
  content: {
    zIndex: 1,
  },
  cardPad: {
    padding: 16,
  },
  headerPad: {
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
});
