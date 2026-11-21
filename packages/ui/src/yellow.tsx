import { yellowMetallic } from '@drop/ui-tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Glossy keke yellow for pills, tabs, chips, and pins.
 * A bright top highlight, an electric middle, and a warm amber base.
 */
export function YellowFill({
  children,
  style,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      colors={[...yellowMetallic]}
      locations={[0, 0.38, 0.72, 1]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={style}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      {children ? <View style={styles.front}>{children}</View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  front: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
