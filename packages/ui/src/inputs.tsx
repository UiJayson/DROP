import { colors, radii, spacing, tapTarget, typeScale } from '@drop/ui-tokens';
import { formatNaira } from '@drop/shared';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { tapHaptic } from './haptics';
import { enterSpring } from './motion';
import { useReduceMotion } from './shell';
import { typeStyle } from './theme';

export function FareStepper({
  amountKobo,
  minKobo,
  onStep,
}: {
  amountKobo: number;
  minKobo: number;
  onStep: (direction: -1 | 1) => void;
}) {
  const atMin = amountKobo <= minKobo;
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease fare by 50 naira"
        accessibilityState={{ disabled: atMin }}
        disabled={atMin}
        testID="fare-minus"
        onPress={() => {
          void tapHaptic('selection');
          onStep(-1);
        }}
        style={[styles.step, atMin && styles.stepDisabled]}
      >
        <Text style={[styles.stepGlyph, atMin && styles.stepGlyphDisabled]}>−</Text>
      </Pressable>
      <View
        style={styles.fareBlock}
        accessibilityRole="text"
        accessibilityLabel={`Fare ${formatNaira(amountKobo)}`}
      >
        <Text
          style={styles.fare}
          maxFontSizeMultiplier={1.6}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatNaira(amountKobo)}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase fare by 50 naira"
        testID="fare-plus"
        onPress={() => {
          void tapHaptic('selection');
          onStep(1);
        }}
        style={styles.step}
      >
        <Text style={styles.stepGlyph}>+</Text>
      </Pressable>
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  testID,
  hint,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  testID?: string;
  hint?: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  secureTextEntry?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        testID={testID}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        style={styles.input}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
  autoFocus = false,
  testID,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.search}>
      <View style={styles.searchMark} accessibilityElementsHidden>
        <View style={styles.searchCircle} />
        <View style={styles.searchHandle} />
      </View>
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        autoFocus={autoFocus}
        autoCorrect={false}
        testID={testID}
        style={styles.searchInput}
        clearButtonMode="while-editing"
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText('')}
          style={styles.clear}
        >
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ChoiceRow({
  label,
  detail,
  selected,
  onPress,
  testID,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      accessibilityState={{ selected }}
      onPress={() => {
        void tapHaptic('selection');
        onPress();
      }}
      testID={testID}
      style={[styles.choice, selected && styles.choiceOn]}
    >
      <Text style={[styles.choiceLabel, selected && styles.choiceLabelOn]}>{label}</Text>
      {detail ? (
        <Text style={[styles.choiceDetail, selected && styles.choiceLabelOn]}>{detail}</Text>
      ) : null}
    </Pressable>
  );
}

export function PinDigits({ value, length = 4 }: { value: string; length?: number }) {
  const cells = Array.from({ length }, (_, index) => value[index] ?? '');
  return (
    <View
      style={styles.pinRow}
      accessibilityLabel={
        value.length === length ? `PIN ${value}` : `PIN, ${value.length} of ${length} digits`
      }
    >
      {cells.map((digit, index) => (
        <View key={index} style={styles.pinCell}>
          <Text style={styles.pinDigit}>{digit}</Text>
        </View>
      ))}
    </View>
  );
}

export function PinPad({
  onDigit,
  onBackspace,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  return (
    <View style={styles.pad}>
      {keys.map((key) => {
        if (key === '') {
          return <View key="gap" style={styles.padGap} />;
        }
        const isDelete = key === 'del';
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={isDelete ? 'Delete digit' : key}
            testID={isDelete ? 'pin-delete' : `pin-${key}`}
            onPress={() => {
              void tapHaptic('selection');
              if (isDelete) {
                onBackspace();
              } else {
                onDigit(key);
              }
            }}
            style={styles.padKey}
          >
            <Text style={[styles.padGlyph, isDelete && styles.padDelete]}>
              {isDelete ? 'Del' : key}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stars({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.stars} accessibilityLabel={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        return (
          <Pressable
            key={star}
            accessibilityRole="button"
            accessibilityLabel={`${star} star${star === 1 ? '' : 's'}`}
            accessibilityState={{ selected: filled }}
            testID={`star-${star}`}
            onPress={() => {
              void tapHaptic('selection');
              onChange(star);
            }}
            style={styles.star}
          >
            <Text style={[styles.starGlyph, filled ? styles.starOn : styles.starOff]}>
              {filled ? '★' : '☆'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Enter({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReduceMotion();
  const progress = useRef(new Animated.Value(reduce ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) {
      progress.setValue(1);
      return undefined;
    }
    const animation = Animated.spring(progress, {
      toValue: 1,
      delay,
      ...enterSpring,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reduce]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [14, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  step: {
    width: tapTarget.riderPrimaryHeightDp,
    height: tapTarget.riderPrimaryHeightDp,
    borderRadius: radii.pill,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: {
    backgroundColor: colors.surface1,
  },
  stepGlyph: {
    color: colors.textPrimary,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '500',
  },
  stepGlyphDisabled: {
    color: colors.disabled,
  },
  fareBlock: {
    flex: 1,
    alignItems: 'center',
  },
  fare: {
    color: colors.textPrimary,
    fontSize: typeScale.fare.fontSize,
    lineHeight: typeScale.fare.lineHeight,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textSecondary,
    ...typeStyle('footnote'),
  },
  fieldHint: {
    color: colors.textSecondary,
    ...typeStyle('footnote'),
  },
  input: {
    minHeight: tapTarget.minDp,
    borderRadius: radii.card,
    backgroundColor: colors.surface3,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    ...typeStyle('body'),
  },
  search: {
    minHeight: 64,
    borderRadius: radii.card,
    backgroundColor: colors.surface3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchMark: {
    width: 18,
    height: 18,
  },
  searchCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  searchHandle: {
    position: 'absolute',
    width: 6,
    height: 2,
    backgroundColor: colors.primary,
    right: 0,
    bottom: 3,
    transform: [{ rotate: '45deg' }],
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    minHeight: tapTarget.minDp,
    ...typeStyle('headline'),
  },
  clear: {
    minHeight: tapTarget.minPt,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  clearText: {
    color: colors.textSecondary,
    ...typeStyle('callout'),
  },
  choice: {
    minHeight: tapTarget.minDp,
    borderRadius: radii.card,
    backgroundColor: colors.surface3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  choiceOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceLabel: {
    color: colors.textPrimary,
    ...typeStyle('headline'),
  },
  choiceLabelOn: {
    color: colors.onPrimary,
  },
  choiceDetail: {
    color: colors.textSecondary,
    ...typeStyle('footnote'),
  },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pinCell: {
    width: 64,
    height: 72,
    borderRadius: radii.card,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDigit: {
    color: colors.textPrimary,
    fontSize: typeScale.fare.fontSize,
    lineHeight: typeScale.fare.lineHeight,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  padGap: {
    width: '30%',
    minHeight: 64,
  },
  padKey: {
    width: '30%',
    minHeight: 64,
    borderRadius: radii.card,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padGlyph: {
    color: colors.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
  },
  padDelete: {
    fontSize: 18,
    lineHeight: 22,
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  star: {
    width: tapTarget.riderPrimaryHeightDp,
    height: tapTarget.riderPrimaryHeightDp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starGlyph: {
    fontSize: 36,
    lineHeight: 40,
  },
  starOn: {
    color: colors.primary,
  },
  starOff: {
    color: colors.textSecondary,
  },
});
