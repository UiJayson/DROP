import { colors, radii, spacing } from '@drop/ui-tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { prefersStaticMotion } from './routing';

const MotionContext = createContext(false);

export function useReduceMotion(): boolean {
  return useContext(MotionContext);
}

export function AppShell({ children }: { children: ReactNode }) {
  const [reduce, setReduce] = useState(prefersStaticMotion);

  useEffect(() => {
    if (prefersStaticMotion()) {
      return undefined;
    }
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) {
          setReduce(value);
        }
      })
      .catch(() => {
        // Accessibility queries are optional.
      });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <MotionContext.Provider value={reduce}>
        <View style={styles.root}>
          <StatusBar style="light" />
          <View style={styles.column}>{children}</View>
        </View>
      </MotionContext.Provider>
    </SafeAreaProvider>
  );
}

export function Screen({
  children,
  testID,
  padded = false,
}: {
  children: ReactNode;
  testID: string;
  padded?: boolean;
}) {
  return (
    <LinearGradient
      colors={[colors.gradTop, colors.gradMid, colors.gradBottom]}
      locations={[0, 0.42, 1]}
      style={[styles.screen, padded && styles.padded]}
      testID={testID}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.bg,
  },
  screen: {
    flex: 1,
  },
  padded: {
    padding: spacing.md,
  },
  sheet: {
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
});

export function Sheet({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={[colors.gradSheetTop, colors.gradSheetBottom]}
      style={[styles.sheet, style]}
    >
      {children}
    </LinearGradient>
  );
}

export const sheetRadius = radii.sheet;
