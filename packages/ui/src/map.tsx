import {
  googleEmbedUrl,
  mapCaption,
  projectPins,
  type LatLng,
  type TripLocationSource,
} from '@drop/shared';
import { colors, radii, spacing } from '@drop/ui-tokens';
import { createElement, useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { useReduceMotion } from './shell';
import { typeStyle } from './theme';

type MapMarker = {
  id: string;
  top: number;
  left: number;
  kind: 'pickup' | 'dropoff' | 'rider';
};

export function MapCanvas({
  title,
  subtitle,
  kekes,
  radar = false,
  destination,
  markers,
}: {
  title?: string;
  subtitle?: string;
  kekes?: number;
  radar?: boolean;
  destination?: string;
  markers?: MapMarker[];
}) {
  return (
    <View
      style={styles.map}
      accessibilityLabel={
        kekes === undefined
          ? `Map${title ? ` near ${title}` : ''}`
          : `Map${title ? ` near ${title}` : ''}. ${kekes} Kekes nearby.`
      }
      testID="map-placeholder"
    >
      <View style={[styles.road, styles.roadH]} />
      <View style={[styles.road, styles.roadV]} />
      <View style={[styles.lane, styles.laneA]} />
      <View style={[styles.lane, styles.laneB]} />
      <View style={styles.blockA} />
      <View style={styles.blockB} />
      <View style={styles.creek} />
      {markers === undefined && kekes !== undefined && kekes > 0 ? (
        <>
          <View style={[styles.keke, { top: '28%', left: '22%' }]} />
          <View style={[styles.keke, { top: '58%', left: '62%' }]} />
          <View style={[styles.keke, { top: '42%', left: '74%' }]} />
        </>
      ) : null}
      {radar ? <Radar /> : null}
      {markers === undefined ? (
        <View
          style={styles.pinWrap}
          accessibilityLabel={destination ? `Pickup, going to ${destination}` : 'Your pickup'}
        >
          <View style={styles.pinHead} />
          <View style={styles.pinStem} />
        </View>
      ) : (
        markers.map((marker) => (
          <View
            key={marker.id}
            accessibilityLabel={
              marker.kind === 'rider'
                ? 'Rider location'
                : marker.kind === 'dropoff'
                  ? 'Drop-off'
                  : 'Pickup'
            }
            style={[
              marker.kind === 'rider'
                ? styles.riderMark
                : marker.kind === 'dropoff'
                  ? styles.dropMark
                  : styles.pickupMark,
              { top: `${marker.top}%`, left: `${marker.left}%` },
            ]}
          />
        ))
      )}
      {markers === undefined && destination ? (
        <View style={[styles.destWrap, { top: '30%', left: '58%' }]}>
          <View style={styles.destHead} />
          <Text style={styles.destText} numberOfLines={1}>
            {destination}
          </Text>
        </View>
      ) : null}
      {title ? (
        <View style={styles.caption}>
          <Text style={styles.captionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.captionSub}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export function TripMap({
  mapsKey,
  title,
  pickup,
  dropoff,
  rider,
  locationSource,
}: {
  mapsKey: string | null;
  title: string;
  pickup: LatLng;
  dropoff: LatLng;
  rider: LatLng | null;
  locationSource: TripLocationSource | null;
}) {
  const configured = Boolean(mapsKey && mapsKey.trim());
  const focus = rider ?? pickup;
  const embed = mapsKey ? googleEmbedUrl(mapsKey, focus) : null;
  const showGoogle = Platform.OS === 'web' && embed != null;
  const caption = mapCaption({
    mapsConfigured: configured,
    streetMapVisible: showGoogle,
    locationSource,
  });
  const points = [
    { id: 'pickup', ...pickup },
    { id: 'dropoff', ...dropoff },
    ...(rider ? [{ id: 'rider', ...rider }] : []),
  ];
  const placed = projectPins(points);
  const markers: MapMarker[] = points.map((point) => ({
    id: point.id,
    top: placed[point.id]?.top ?? 50,
    left: placed[point.id]?.left ?? 50,
    kind: point.id === 'rider' ? 'rider' : point.id === 'dropoff' ? 'dropoff' : 'pickup',
  }));

  if (showGoogle && embed) {
    return (
      <View style={styles.map} accessibilityLabel={caption}>
        <Text style={styles.liveCaption}>{caption}</Text>
        {createElement('iframe', {
          title: 'Google Map',
          src: embed,
          style: { border: '0', width: '100%', height: '100%', minHeight: 220 },
        } as never)}
      </View>
    );
  }

  return <MapCanvas title={title} subtitle={caption} markers={markers} />;
}

function Radar() {
  const reduce = useReduceMotion();
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    if (reduce) {
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.7, duration: 1400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.7, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduce, scale]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.radar, reduce ? styles.radarStill : { opacity, transform: [{ scale }] }]}
    />
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: '#121418',
    overflow: 'hidden',
    minHeight: 160,
  },
  road: {
    position: 'absolute',
    backgroundColor: '#2C3038',
  },
  roadH: {
    top: '46%',
    left: '-10%',
    width: '120%',
    height: 14,
    transform: [{ rotate: '-8deg' }],
  },
  roadV: {
    top: '8%',
    left: '38%',
    width: 12,
    height: '90%',
  },
  lane: {
    position: 'absolute',
    backgroundColor: '#3A3F36',
  },
  laneA: {
    top: '22%',
    left: '-5%',
    width: '70%',
    height: 6,
    transform: [{ rotate: '14deg' }],
  },
  laneB: {
    top: '70%',
    left: '20%',
    width: '75%',
    height: 6,
  },
  blockA: {
    position: 'absolute',
    top: '14%',
    left: '8%',
    width: 72,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1A1D22',
  },
  blockB: {
    position: 'absolute',
    top: '60%',
    left: '52%',
    width: 88,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1A1D22',
  },
  creek: {
    position: 'absolute',
    right: -20,
    bottom: 24,
    width: 120,
    height: 70,
    borderRadius: 40,
    backgroundColor: '#1A2428',
  },
  keke: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.onPrimary,
  },
  pickupMark: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginTop: -8,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.onPrimary,
  },
  riderMark: {
    position: 'absolute',
    width: 18,
    height: 18,
    marginTop: -9,
    marginLeft: -9,
    borderRadius: 9,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.textPrimary,
  },
  dropMark: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginTop: -7,
    marginLeft: -7,
    borderRadius: 7,
    backgroundColor: colors.textPrimary,
  },
  liveCaption: {
    color: colors.textPrimary,
    backgroundColor: colors.surface1,
    ...typeStyle('footnote'),
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pinWrap: {
    position: 'absolute',
    top: '40%',
    left: '46%',
    alignItems: 'center',
  },
  pinHead: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.onPrimary,
  },
  pinStem: {
    width: 2,
    height: 10,
    backgroundColor: colors.primary,
  },
  destWrap: {
    position: 'absolute',
    alignItems: 'flex-start',
  },
  destHead: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.textPrimary,
  },
  destText: {
    marginTop: 4,
    color: colors.textPrimary,
    backgroundColor: colors.surface1,
    overflow: 'hidden',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    ...typeStyle('footnote'),
    maxWidth: 140,
  },
  radar: {
    position: 'absolute',
    top: '34%',
    left: '36%',
    width: 120,
    height: 120,
    marginLeft: -42,
    marginTop: -42,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  radarStill: {
    opacity: 0.45,
  },
  caption: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.md,
    backgroundColor: colors.surface1,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.separator,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  captionTitle: {
    color: colors.textPrimary,
    ...typeStyle('headline'),
  },
  captionSub: {
    color: colors.textSecondary,
    ...typeStyle('footnote'),
  },
});
