import { vanta } from '@drop/ui-tokens';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlowCard } from './glow';
import { KekeGlyph } from './keke';
import { Pill } from './vanta-controls';
import { useVantaFont } from './vanta-font';

export function RideOfferCard({
  name,
  rating,
  rides,
  tag,
  etaLabel,
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
          <View style={styles.avatar}>
            <Text style={[styles.initial, { fontFamily: font.bold }]}>{initial}</Text>
          </View>
          <View style={styles.grow}>
            <Text style={[styles.name, { fontFamily: font.bold }]}>{name}</Text>
            <View style={styles.meta}>
              <Feather name="star" size={12} color={vanta.yellow} />
              <Text style={[styles.metaText, { fontFamily: font.medium }]}>
                {rating.toFixed(1)} · {rides.toLocaleString('en-NG')} trips
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
          <DottedLine />
          <KekeGlyph />
          <DottedLine />
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
  pickupTitle,
  pickupDetail,
  dropoffTime,
  dropoffTitle,
  dropoffDetail,
}: {
  pickupTime: string;
  pickupTitle: string;
  pickupDetail: string;
  dropoffTime: string;
  dropoffTitle: string;
  dropoffDetail: string;
}) {
  const font = useVantaFont();
  return (
    <GlowCard>
      <Stop
        time={pickupTime}
        title={pickupTitle}
        detail={pickupDetail}
        marker="start"
        fontBold={font.bold}
        fontRegular={font.regular}
      />
      <View style={styles.lineCol}>
        <DottedColumn />
      </View>
      <Stop
        time={dropoffTime}
        title={dropoffTitle}
        detail={dropoffDetail}
        marker="end"
        fontBold={font.bold}
        fontRegular={font.regular}
      />
    </GlowCard>
  );
}

function Stop({
  time,
  title,
  detail,
  marker,
  fontBold,
  fontRegular,
}: {
  time: string;
  title: string;
  detail: string;
  marker: 'start' | 'end';
  fontBold: string;
  fontRegular: string;
}) {
  return (
    <View style={styles.stop}>
      <Text style={[styles.time, { fontFamily: fontBold }]}>{time}</Text>
      <View style={[styles.dot, marker === 'start' ? styles.dotStart : styles.dotEnd]} />
      <View style={styles.grow}>
        <Text style={[styles.name, { fontFamily: fontBold }]}>{title}</Text>
        <Text style={[styles.place, { fontFamily: fontRegular }]}>{detail}</Text>
      </View>
    </View>
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

function DottedLine() {
  return (
    <View style={styles.dots}>
      {Array.from({ length: 6 }, (_, index) => (
        <View key={index} style={styles.dotBit} />
      ))}
    </View>
  );
}

function DottedColumn() {
  return (
    <View style={styles.vdots}>
      {Array.from({ length: 4 }, (_, index) => (
        <View key={index} style={styles.dotBit} />
      ))}
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A292F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: vanta.rim,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
    marginLeft: 62,
    height: 18,
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  vdots: {
    gap: 3,
  },
  dotBit: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  chip: {
    alignItems: 'center',
    gap: 6,
    width: 72,
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
    color: vanta.muted,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
});
