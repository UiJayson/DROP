import { product } from '@drop/shared';
import { colors, radii, spacing, typeScale } from '@drop/ui-tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { initSentry } from './src/sentry';

export default function App() {
  useEffect(() => {
    void initSentry();
  }, []);

  return (
    <LinearGradient
      colors={[colors.gradTop, colors.gradBottom]}
      style={styles.screen}
      testID="placeholder-screen"
    >
      <StatusBar style="light" />
      <Text accessibilityRole="header" style={styles.wordmark}>
        {product.name}
      </Text>
      <Text style={styles.audience}>Passenger</Text>
      <Text style={styles.tagline}>{product.tagline}</Text>
      <View style={styles.chip}>
        <Text style={styles.chipText}>{product.setupLabel}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  wordmark: {
    color: colors.primary,
    fontSize: typeScale.largeTitle.fontSize,
    lineHeight: typeScale.largeTitle.lineHeight,
    fontWeight: typeScale.largeTitle.fontWeight,
  },
  audience: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: typeScale.headline.fontSize,
    lineHeight: typeScale.headline.lineHeight,
    fontWeight: typeScale.headline.fontWeight,
  },
  tagline: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typeScale.body.fontSize,
    lineHeight: typeScale.body.lineHeight,
    textAlign: 'center',
  },
  chip: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  chipText: {
    color: colors.onPrimary,
    fontSize: typeScale.callout.fontSize,
    lineHeight: typeScale.callout.lineHeight,
    fontWeight: '600',
  },
});
