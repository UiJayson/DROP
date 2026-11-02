import { colors, radii, spacing, tapTarget, typeScale } from '@drop/ui-tokens';
import { useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { tapHaptic, type HapticKind } from './haptics';
import { pressInSpring, pressOutSpring } from './motion';
import { useReduceMotion } from './shell';
import { typeStyle } from './theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  testID,
  hint,
  size = 'regular',
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  testID?: string;
  hint?: string;
  size?: 'regular' | 'compact';
}) {
  const reduce = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  function animate(to: number) {
    if (reduce) {
      scale.setValue(to);
      return;
    }
    Animated.spring(scale, {
      toValue: to,
      ...(to < 1 ? pressInSpring : pressOutSpring),
    }).start();
  }

  const haptic: HapticKind =
    variant === 'danger' ? 'warning' : variant === 'primary' ? 'medium' : 'light';

  return (
    <Animated.View style={[{ transform: [{ scale }] }, styles.fill]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityState={{ disabled }}
        disabled={disabled}
        testID={testID}
        onPressIn={() => {
          setPressed(true);
          animate(0.97);
        }}
        onPressOut={() => {
          setPressed(false);
          animate(1);
        }}
        onPress={() => {
          void tapHaptic(haptic);
          onPress();
        }}
        style={[
          styles.button,
          size === 'compact' && styles.compact,
          variant === 'primary' && styles.primary,
          variant === 'secondary' && styles.secondary,
          variant === 'danger' && styles.danger,
          variant === 'ghost' && styles.ghost,
          pressed && variant === 'primary' && styles.primaryPressed,
          pressed && variant !== 'primary' && styles.pressedSurface,
          disabled && styles.disabled,
        ]}
      >
        <Text
          style={[
            styles.buttonLabel,
            variant === 'primary' ? styles.onPrimary : styles.onSurface,
            variant === 'danger' && styles.dangerLabel,
            disabled && styles.disabledLabel,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({
  label,
  onPress,
  testID,
  children,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        void tapHaptic('light');
        onPress();
      }}
      testID={testID}
      style={styles.iconButton}
    >
      {children}
    </Pressable>
  );
}

export function Chevron({ direction = 'left' }: { direction?: 'left' | 'down' }) {
  return (
    <View
      style={[styles.chevron, direction === 'down' ? styles.chevronDown : styles.chevronLeft]}
    />
  );
}

export function Header({
  title,
  onBack,
  trailing,
}: {
  title: string;
  onBack?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <IconButton label="Back" onPress={onBack} testID="back">
          <Chevron />
        </IconButton>
      ) : (
        <View style={styles.iconButton} />
      )}
      <Text accessibilityRole="header" style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      {trailing ?? <View style={styles.iconButton} />}
    </View>
  );
}

export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'yellow' | 'green' | 'orange';
}) {
  return (
    <View style={styles.pill} accessibilityRole="text">
      <View
        style={[
          styles.dot,
          tone === 'yellow' && styles.dotYellow,
          tone === 'green' && styles.dotGreen,
          tone === 'orange' && styles.dotOrange,
          tone === 'neutral' && styles.dotNeutral,
        ]}
      />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

export function Notice({ message }: { message: string }) {
  return (
    <View style={styles.notice} accessibilityRole="alert">
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  );
}

export function DemoBridge({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Prototype only. The other person would do this on their phone."
      onPress={() => {
        void tapHaptic('selection');
        onPress();
      }}
      testID={testID}
      style={styles.demo}
    >
      <Text style={styles.demoText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    width: '100%',
  },
  button: {
    minHeight: tapTarget.riderPrimaryHeightDp,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  compact: {
    minHeight: tapTarget.minDp,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  secondary: {
    backgroundColor: colors.surface3,
  },
  danger: {
    backgroundColor: colors.surface3,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressedSurface: {
    backgroundColor: colors.separator,
  },
  disabled: {
    backgroundColor: colors.surface3,
  },
  buttonLabel: {
    fontSize: typeScale.headline.fontSize,
    lineHeight: typeScale.headline.lineHeight,
    fontWeight: '600',
    textAlign: 'center',
  },
  onPrimary: {
    color: colors.onPrimary,
  },
  onSurface: {
    color: colors.textPrimary,
  },
  dangerLabel: {
    color: colors.danger,
  },
  disabledLabel: {
    color: colors.disabled,
  },
  iconButton: {
    width: tapTarget.minDp,
    height: tapTarget.minDp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: 12,
    height: 12,
    borderColor: colors.textPrimary,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
  },
  chevronLeft: {
    transform: [{ rotate: '45deg' }],
    marginLeft: 4,
  },
  chevronDown: {
    transform: [{ rotate: '-45deg' }],
    marginTop: -4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    minHeight: tapTarget.riderPrimaryHeightDp,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    ...typeStyle('headline'),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surface1,
    borderColor: colors.separator,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 36,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotYellow: { backgroundColor: colors.primary },
  dotGreen: { backgroundColor: colors.success },
  dotOrange: { backgroundColor: colors.warning },
  dotNeutral: { backgroundColor: colors.textSecondary },
  pillText: {
    color: colors.textPrimary,
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
    fontWeight: '600',
  },
  notice: {
    backgroundColor: colors.surface3,
    borderRadius: radii.card,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  noticeText: {
    color: colors.textPrimary,
    ...typeStyle('callout'),
  },
  demo: {
    minHeight: tapTarget.minDp,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.separator,
    paddingHorizontal: spacing.md,
  },
  demoText: {
    color: colors.textSecondary,
    ...typeStyle('footnote'),
    textAlign: 'center',
  },
});
