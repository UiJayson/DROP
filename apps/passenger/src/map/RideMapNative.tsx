import { rideMapColors, rideMapStyle, type RidePin } from '@drop/ui';
import { Camera, Map, Marker, type CameraRef, type MapRef } from '@maplibre/maplibre-react-native';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import type { RideMapViewProps } from './types';

export function RideMapNative({ pins, frame, padding, mapRef, onReady, onFail }: RideMapViewProps) {
  const camera = useRef<CameraRef>(null);
  const map = useRef<MapRef>(null);

  useEffect(() => {
    mapRef.current = {
      zoomBy: (delta) => {
        void map.current?.getZoom().then((zoom) => {
          camera.current?.zoomTo(Math.min(18, Math.max(3, zoom + delta)), {
            duration: 280,
            easing: 'ease',
          });
        });
      },
      locate: (lng, lat) => {
        camera.current?.easeTo({
          center: [lng, lat],
          zoom: 15,
          duration: 700,
          easing: 'ease',
        });
      },
    };
    return () => {
      mapRef.current = null;
    };
  }, [mapRef]);

  return (
    <Map
      ref={map}
      style={StyleSheet.absoluteFill}
      mapStyle={rideMapStyle() as never}
      dragPan
      touchZoom
      touchRotate={false}
      compass={false}
      attribution
      attributionPosition={{ bottom: 4, left: 4 }}
      onDidFinishLoadingMap={onReady}
      onDidFailLoadingMap={onFail}
    >
      <Camera
        ref={camera}
        minZoom={3}
        maxZoom={18}
        initialViewState={
          frame.bounds
            ? {
                bounds: frame.bounds,
                padding,
              }
            : { center: frame.center, zoom: frame.zoom, padding }
        }
      />
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          id={pin.id}
          lngLat={[pin.lng, pin.lat]}
          anchor={pin.kind === 'user' ? 'center' : 'bottom'}
        >
          <PinMark pin={pin} />
        </Marker>
      ))}
    </Map>
  );
}

function PinMark({ pin }: { pin: RidePin }) {
  if (pin.kind === 'user') {
    return <View accessibilityLabel={pin.label} style={styles.user} />;
  }
  const color = pin.kind === 'pickup' ? rideMapColors.pickup : rideMapColors.dropoff;
  return (
    <View accessibilityLabel={pin.label} style={styles.pin}>
      <View style={[styles.head, { backgroundColor: color }]} />
      <View style={[styles.stem, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pin: { alignItems: 'center' },
  head: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: rideMapColors.white,
  },
  stem: { width: 2, height: 8 },
  user: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1F1F1F',
    shadowColor: '#1F1F1F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
});
