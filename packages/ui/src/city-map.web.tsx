import { pickup } from '@drop/shared';
import { Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { rideMapStyle } from './ride-map-style';

let ready = false;

function prepare(node: HTMLElement) {
  node.style.position = 'absolute';
  node.style.inset = '0';
  node.style.width = '100%';
  node.style.height = '100%';
  if (ready || typeof document === 'undefined') {
    return;
  }
  const style = document.createElement('style');
  style.textContent =
    '.maplibregl-map{position:absolute;inset:0;width:100%;height:100%;overflow:hidden}.maplibregl-canvas-container,.maplibregl-canvas{position:absolute;left:0;top:0;width:100%;height:100%}';
  document.head.appendChild(style);
  setWorkerUrl(new URL('maplibre-gl-worker.js', document.baseURI).href);
  ready = true;
}

/** Pale OpenFreeMap city. Same look as the passenger booking map. */
export function CityMap(_props: {
  title?: string;
  subtitle?: string;
  kekes?: number;
  destination?: string;
}) {
  const host = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = host.current;
    if (!node) {
      return undefined;
    }
    prepare(node);
    const map = new MapLibreMap({
      container: node,
      style: rideMapStyle() as never,
      center: [pickup.lng, pickup.lat],
      zoom: 14,
      pitch: 0,
      maxPitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    return () => map.remove();
  }, []);

  return <View ref={host as never} style={StyleSheet.absoluteFill} />;
}
