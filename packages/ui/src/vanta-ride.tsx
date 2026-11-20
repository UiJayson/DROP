import { vanta } from '@drop/ui-tokens';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { GlowCard } from './glow';
import { KekeGlyph, YellowStar } from './keke';
import { Pill } from './vanta-controls';
import { useVantaFont } from './vanta-font';

export function RideOfferCard({
  name,
  rating,
  rides,
  tag,
  etaLabel,
  spanLabel,
  price,
  acceptLabel,
  onAccept,
  onDecline,
  acceptTestID,
  declineTestID,
}: {
  name: string;
  rating: number;
  rides: number;
  tag: string;
  etaLabel: string;
  spanLabel: string;
  price: string;
  acceptLabel: string;
  onAccept: () => void;
  onDecline?: () => void;
  acceptTestID?: string;
  declineTestID?: string;
}) {
  const font = useVantaFont();
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <GlowCard>
      <View style={styles.top}>
        <View style={styles.person}>
          <InitialAvatar letter={initial} fontFamily={font.bold} />
          <View style={styles.grow}>
            <Text style={[styles.name, { fontFamily: font.bold }]}>{name}</Text>
            <View style={styles.meta}>
              <YellowStar />
              <Text style={[styles.metaText, { fontFamily: font.medium }]}>
                {rating.toFixed(1)}
              </Text>
              <KekeGlyph size={13} color={vanta.muted} />
              <Text style={[styles.metaText, { fontFamily: font.medium }]}>
                {rides.toLocaleString('en-NG')} trips
              </Text>
            </View>
          </View>
        </View>
        <Pill label={tag} />
      </View>
      <View style={styles.route}>
        <View>
          <Text style={[styles.time, { fontFamily: font.bold }]}>{etaLabel}</Text>
          <Text style={[styles.place, { fontFamily: font.regular }]}>Pickup</Text>
        </View>
        <View style={styles.mid}>
          <KekeGlyph size={18} color={vanta.text} />
          <Svg width="100%" height={8}>
            <Line
              x1="0"
              y1="4"
              x2="100%"
              y2="4"
              stroke="rgba(255,255,255,0.42)"
              strokeWidth={1.25}
              strokeDasharray="7 5"
            />
          </Svg>
          <Text style={[styles.place, { fontFamily: font.regular }]}>{spanLabel}</Text>
        </View>
        <View style={styles.end}>
          <Text style={[styles.time, { fontFamily: font.bold }]}>{price}</Text>
          <Text style={[styles.place, { fontFamily: font.regular }]}>Cash</Text>
        </View>
      </View>
      <View style={styles.dash} />
      <View style={styles.actions}>
        {onDecline ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Decline ${name}`}
            onPress={onDecline}
            testID={declineTestID}
            style={styles.decline}
          >
            <Text style={[styles.declineText, { fontFamily: font.semibold }]}>Decline</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${acceptLabel} ${name}`}
          onPress={onAccept}
          testID={acceptTestID}
          style={styles.accept}
        >
          <Text style={[styles.acceptText, { fontFamily: font.bold }]}>{acceptLabel}</Text>
        </Pressable>
      </View>
    </GlowCard>
  );
}

export function RouteTimeline({
  pickupTime,
  pickupName,
  pickupStation,
  pickupAddress,
  dropoffTime,
  dropoffName,
  dropoffStation,
  dropoffAddress,
  children,
}: {
  pickupTime: string;
  pickupName: string;
  pickupStation: string;
  pickupAddress: string;
  dropoffTime: string;
  dropoffName: string;
  dropoffStation: string;
  dropoffAddress: string;
  children?: ReactNode;
}) {
  const font = useVantaFont();
  return (
    <GlowCard>
      <Stop
        time={pickupTime}
        name={pickupName}
        station={pickupStation}
        address={pickupAddress}
        marker="start"
        icon="home"
        fontBold={font.bold}
        fontMedium={font.medium}
        fontRegular={font.regular}
      />
      <View style={styles.lineCol}>
        <Svg width={2} height={28}>
          <Line
            x1="1"
            y1="0"
            x2="1"
            y2="28"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={1.5}
            strokeDasharray="3 4"
          />
        </Svg>
      </View>
      <Stop
        time={dropoffTime}
        name={dropoffName}
        station={dropoffStation}
        address={dropoffAddress}
        marker="end"
        icon="map-pin"
        fontBold={font.bold}
        fontMedium={font.medium}
        fontRegular={font.regular}
      />
      {children ? <View style={styles.chipRow}>{children}</View> : null}
    </GlowCard>
  );
}

function Stop({
  time,
  name,
  station,
  address,
  marker,
  icon,
  fontBold,
  fontMedium,
  fontRegular,
}: {
  time: string;
  name: string;
  station: string;
  address: string;
  marker: 'start' | 'end';
  icon: keyof typeof Feather.glyphMap;
  fontBold: string;
  fontMedium: string;
  fontRegular: string;
}) {
  return (
    <View style={styles.stop}>
      <Text style={[styles.time, styles.timeCol, { fontFamily: fontBold }]}>{time}</Text>
      <View style={[styles.dot, marker === 'start' ? styles.dotStart : styles.dotEnd]} />
      <View style={styles.grow}>
        <Text style={[styles.name, { fontFamily: fontBold }]}>{name}</Text>
        <Text style={[styles.station, { fontFamily: fontMedium }]}>{station}</Text>
        <Text style={[styles.place, { fontFamily: fontRegular }]}>{address}</Text>
      </View>
      <View style={styles.stopIcon}>
        <Feather name={icon} size={16} color={vanta.text} />
      </View>
    </View>
  );
}

export function InitialAvatar({
  letter,
  fontFamily,
  size = 48,
}: {
  letter: string;
  fontFamily: string;
  size?: number;
}) {
  return (
    <LinearGradient
      colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0.06)']}
      style={{ width: size, height: size, borderRadius: size / 2, padding: 1.5 }}
    >
      <View
        style={[styles.avatarInner, { borderRadius: size / 2, width: size - 3, height: size - 3 }]}
      >
        <Text style={[styles.initial, { fontFamily }]}>{letter}</Text>
      </View>
    </LinearGradient>
  );
}

export function FeatureChip({
  icon,
  label,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
}) {
  const font = useVantaFont();
  return (
    <View style={styles.chip}>
      <View style={styles.chipIcon}>
        <Feather name={icon} size={16} color={vanta.text} />
      </View>
      <Text style={[styles.chipLabel, { fontFamily: font.medium }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  initial: {
    color: vanta.text,
    fontSize: 16,
  },
  grow: { flex: 1 },
  name: {
    color: vanta.text,
    fontSize: 16,
    lineHeight: 21,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    color: vanta.muted,
    fontSize: 13,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  mid: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  end: { alignItems: 'flex-end' },
  time: {
    color: vanta.white,
    fontSize: 20,
    lineHeight: 26,
  },
  place: {
    color: vanta.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  dash: {
    marginTop: 14,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  decline: {
    minHeight: 36,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  declineText: {
    color: vanta.muted,
    fontSize: 14,
  },
  accept: {
    backgroundColor: vanta.white,
    borderRadius: 999,
    paddingHorizontal: 16,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    color: vanta.ink,
    fontSize: 14,
  },
  stop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  dotStart: { backgroundColor: vanta.yellow },
  dotEnd: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: vanta.muted,
  },
  lineCol: {
    marginLeft: 87,
    height: 22,
    justifyContent: 'center',
  },
  chip: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  chipIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: vanta.pill,
    borderWidth: 1,
    borderColor: vanta.rimIcon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    color: vanta.white,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  chipRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  station: {
    color: vanta.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  timeCol: {
    width: 72,
  },
  stopIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: vanta.pill,
    borderWidth: 1,
    borderColor: vanta.rimIcon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    flex: 1,
    backgroundColor: '#242328',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
