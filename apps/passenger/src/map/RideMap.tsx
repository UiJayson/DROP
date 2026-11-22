import type { LatLng } from '@drop/shared';
import { MapCanvas, rideFrame, rideMapColors, type RidePin } from '@drop/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { readDeviceFix } from './location';
import { MapControls } from './MapControls';
import { RideMapView } from './RideMapView';
import type { RideMapHandle, RideMapPadding } from './types';

type Point = LatLng & { label: string };

const defaultCameraPadding: RideMapPadding = { top: 24, right: 24, bottom: 24, left: 24 };

export function RideMap({
  pickup,
  dropoff,
  fallbackTitle,
  fallbackDetail,
  kekes,
  controlsInset = { bottom: 12, right: 12 },
  cameraPadding = defaultCameraPadding,
  onTone,
  style,
}: {
  pickup: Point | null;
  dropoff: Point | null;
  fallbackTitle?: string;
  fallbackDetail?: string;
  kekes?: number;
  controlsInset?: { bottom: number; right: number };
  cameraPadding?: RideMapPadding;
  onTone?: (tone: 'light' | 'dark') => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [down, setDown] = useState(false);
  const [user, setUser] = useState<LatLng | null>(null);
  const mapRef = useRef<RideMapHandle | null>(null);
  const ready = useRef(false);
  const onReady = useCallback(() => {
    ready.current = true;
    onTone?.('light');
  }, [onTone]);
  const onFail = useCallback(() => {
    if (!ready.current) {
      setDown(true);
    }
  }, []);

  useEffect(() => {
    const geo = globalThis.navigator?.geolocation;
    if (!geo) {
      return undefined;
    }
    const watch = geo.watchPosition(
      (position) =>
        setUser({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 15_000, timeout: 8_000 },
    );
    return () => geo.clearWatch(watch);
  }, []);

  const anchors = [pickup, dropoff].filter((point): point is Point => point != null);
  const frame = rideFrame(anchors);
  const pins: RidePin[] = [
    ...anchors.map((point) => ({
      ...point,
      id: point === pickup ? 'pickup' : 'dropoff',
      kind: point === pickup ? ('pickup' as const) : ('dropoff' as const),
    })),
    ...(user
      ? [
          {
            id: 'user',
            kind: 'user' as const,
            label: 'Your location',
            lat: user.lat,
            lng: user.lng,
          },
        ]
      : []),
  ];

  useEffect(() => {
    onTone?.(down || !frame ? 'dark' : 'light');
  }, [down, frame, onTone]);

  if (down || !frame || !pickup) {
    return (
      <View style={[styles.fill, style]}>
        <MapCanvas title={fallbackTitle} destination={fallbackDetail} kekes={kekes} />
      </View>
    );
  }

  return (
    <View style={[styles.fill, style]} testID="ride-map">
      <RideMapView
        pins={pins}
        frame={frame}
        padding={cameraPadding}
        mapRef={mapRef}
        onReady={onReady}
        onFail={onFail}
      />
      <MapControls
        inset={controlsInset}
        onZoomIn={() => mapRef.current?.zoomBy(1)}
        onZoomOut={() => mapRef.current?.zoomBy(-1)}
        onLocate={() => {
          void readDeviceFix().then((fix) => {
            if (!fix) {
              return;
            }
            setUser(fix);
            mapRef.current?.locate(fix.lng, fix.lat);
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: rideMapColors.land, overflow: 'hidden' },
});
