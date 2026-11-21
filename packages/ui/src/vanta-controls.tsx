import { pillFill, vanta } from '@drop/ui-tokens';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { tapHaptic } from './haptics';
import { YellowFill } from './yellow';
import { useReduceMotion } from './shell';
import { useVantaFont } from './vanta-font';

function usePressScale() {
  const reduce = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  function to(value: number) {
    if (reduce) {
      scale.setValue(value);
      return;
    }
    Animated.timing(scale, {
      toValue: value,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }

  return { scale, to };
}

export function IconCircleButton({
  label,
  icon,
  onPress,
  testID,
  rotate = 0,
  tone = 'metal',
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  testID?: string;
  rotate?: number;
  tone?: 'metal' | 'ink';
}) {
  const { scale, to } = usePressScale();
  const glyph = (
    <View style={rotate ? { transform: [{ rotate: `${rotate}deg` }] } : undefined}>
      <Feather name={icon} size={18} color={tone === 'ink' ? '#D0D0D0' : vanta.text} />
    </View>
  );
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}
        onPressIn={() => to(0.97)}
        onPressOut={() => to(1)}
        onPress={() => {
          void tapHaptic('light');
          onPress();
        }}
        style={styles.circleHit}
      >
        {tone === 'ink' ? (
          <View style={[styles.circle, styles.circleInk]}>{glyph}</View>
        ) : (
          <LinearGradient colors={[...pillFill]} style={styles.circle}>
            {glyph}
          </LinearGradient>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function Pill({
  label,
  tone = 'muted',
}: {
  label: string;
  tone?: 'muted' | 'solid' | 'yellow';
}) {
  const font = useVantaFont();
  if (tone === 'solid' || tone === 'yellow') {
    return (
      <View
        style={[styles.pill, { backgroundColor: tone === 'yellow' ? vanta.yellow : vanta.white }]}
      >
        <Text style={[styles.pillText, { color: vanta.ink, fontFamily: font.semibold }]}>
          {label}
        </Text>
      </View>
    );
  }
  return (
    <LinearGradient colors={[...pillFill]} style={styles.pill}>
      <Text style={[styles.pillText, { color: vanta.text, fontFamily: font.medium }]}>{label}</Text>
    </LinearGradient>
  );
}

export function MetalButton({
  label,
  onPress,
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  const font = useVantaFont();
  const { scale, to } = usePressScale();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, styles.metalWrap]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        testID={testID}
        onPressIn={() => to(0.97)}
        onPressOut={() => to(1)}
        onPress={() => {
          void tapHaptic('medium');
          onPress();
        }}
      >
        <LinearGradient
          colors={[vanta.white, vanta.metalMid, vanta.metalEdge]}
          style={[styles.metal, disabled && styles.disabled]}
        >
          <Text style={[styles.metalText, { fontFamily: font.bold }]}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export type VantaTab = 'home' | 'ride' | 'safety' | 'account';

export function FloatingTabBar({
  active,
  accent = 'yellow',
  onChange,
}: {
  active: VantaTab;
  accent?: 'yellow' | 'white';
  onChange: (tab: VantaTab) => void;
}) {
  const font = useVantaFont();
  const tabs: { id: VantaTab; icon: keyof typeof Feather.glyphMap; label: string }[] = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'ride', icon: 'navigation', label: 'Ride' },
    { id: 'safety', icon: 'shield', label: 'Safety' },
    { id: 'account', icon: 'user', label: 'You' },
  ];
  return (
    <View style={styles.tabWrap} pointerEvents="box-none">
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(4,4,5,0)', 'rgba(4,4,5,0.94)']}
        style={styles.tabFade}
      />
      <View style={styles.tabPill}>
        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const selected = tab.id === active;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected }}
                onPress={() => onChange(tab.id)}
                style={[styles.tabItem, !selected && styles.tabIdle]}
              >
                {selected && accent === 'yellow' ? (
                  <YellowFill style={StyleSheet.absoluteFill} />
                ) : null}
                {selected && accent !== 'yellow' ? (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: vanta.white }]} />
                ) : null}
                <Feather
                  name={tab.icon}
                  size={18}
                  color={selected ? vanta.ink : vanta.text}
                  style={styles.tabFront}
                />
                {selected ? (
                  <Text style={[styles.tabLabel, styles.tabFront, { fontFamily: font.semibold }]}>
                    {tab.label}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function DatePillStrip({
  days,
  selected,
  onSelect,
}: {
  days: { id: string; label: string; date: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const font = useVantaFont();
  return (
    <View style={styles.dates}>
      {days.map((day) => {
        const on = day.id === selected;
        return (
          <Pressable
            key={day.id}
            accessibilityRole="button"
            accessibilityLabel={`${day.label} ${day.date}`}
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(day.id)}
            style={[styles.datePill, on ? styles.dateOn : styles.dateOff]}
          >
            <Text
              style={[
                styles.dateLabel,
                { color: on ? vanta.ink : vanta.muted, fontFamily: font.medium },
              ]}
            >
              {day.label}
            </Text>
            <Text
              style={[
                styles.dateNum,
                { color: on ? vanta.ink : vanta.text, fontFamily: font.bold },
              ]}
            >
              {day.date}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function VantaText({
  children,
  role = 'body',
  style,
}: {
  children: ReactNode;
  role?: 'display' | 'title' | 'body' | 'muted' | 'time' | 'label';
  style?: StyleProp<TextStyle>;
}) {
  const font = useVantaFont();
  const face =
    role === 'display' || role === 'time' || role === 'title'
      ? font.bold
      : role === 'label'
        ? font.semibold
        : role === 'muted'
          ? font.regular
          : font.medium;
  return <Text style={[roles[role], { fontFamily: face }, style]}>{children}</Text>;
}

const roles = StyleSheet.create({
  display: { color: vanta.text, fontSize: 32, lineHeight: 38 },
  title: { color: vanta.text, fontSize: 18, lineHeight: 24 },
  time: { color: vanta.white, fontSize: 20, lineHeight: 26 },
  body: { color: vanta.text, fontSize: 15, lineHeight: 20 },
  muted: { color: vanta.muted, fontSize: 13, lineHeight: 18 },
  label: { color: vanta.text, fontSize: 13, lineHeight: 18 },
});

const styles = StyleSheet.create({
  circleHit: {
    width: vanta.icon,
    height: vanta.icon,
  },
  circle: {
    width: vanta.icon,
    height: vanta.icon,
    borderRadius: vanta.icon / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: vanta.rimIcon,
  },
  circleInk: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: vanta.rim,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 12,
    lineHeight: 16,
  },
  metalWrap: {
    alignSelf: 'center',
  },
  metal: {
    minHeight: 44,
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  metalText: {
    zIndex: 1,
    color: vanta.ink,
    fontSize: 15,
    lineHeight: 20,
  },
  disabled: {
    opacity: 0.5,
  },
  tabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingBottom: 18,
  },
  tabFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 108,
  },
  tabPill: {
    borderRadius: 999,
    backgroundColor: vanta.surface,
    borderWidth: 1,
    borderColor: vanta.rim,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    gap: 8,
  },
  tabItem: {
    minHeight: 44,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
  tabIdle: {
    width: 44,
    paddingHorizontal: 0,
    backgroundColor: vanta.pill,
    borderWidth: 1,
    borderColor: vanta.rimIcon,
  },
  tabFront: {
    zIndex: 1,
  },
  tabLabel: {
    color: vanta.ink,
    fontSize: 14,
  },
  dates: {
    flexDirection: 'row',
    gap: 8,
  },
  datePill: {
    width: 64,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateOn: {
    backgroundColor: vanta.white,
  },
  dateOff: {
    backgroundColor: vanta.pill,
    borderWidth: 1,
    borderColor: vanta.rim,
  },
  dateLabel: {
    fontSize: 12,
  },
  dateNum: {
    fontSize: 20,
    lineHeight: 24,
  },
});
