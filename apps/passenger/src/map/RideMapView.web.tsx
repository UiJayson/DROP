import { rideMapColors, rideMapStyle, type RidePin } from '@drop/ui';
import { AttributionControl, Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import type { RideMapViewProps } from './types';

let workerReady = false;

function fillHost(node: HTMLElement) {
  node.style.position = 'absolute';
  node.style.top = '0';
  node.style.right = '0';
  node.style.bottom = '0';
  node.style.left = '0';
  node.style.width = '100%';
  node.style.height = '100%';
}

function ensureWorker() {
  if (workerReady || typeof document === 'undefined') {
    return;
  }
  setWorkerUrl(new URL('maplibre-gl-worker.js', document.baseURI).href);
  workerReady = true;
}

function pinNode(pin: RidePin): HTMLDivElement {
  const root = document.createElement('div');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', pin.label);
  if (pin.kind === 'user') {
    Object.assign(root.style, {
      width: '16px',
      height: '16px',
      borderRadius: '8px',
      background: rideMapColors.white,
      border: `2px solid ${rideMapColors.dropoff}`,
      boxShadow: '0 0 0 6px rgba(31,31,31,0.12)',
    });
    return root;
  }
  const color = pin.kind === 'pickup' ? rideMapColors.pickup : rideMapColors.dropoff;
  root.style.display = 'flex';
  root.style.flexDirection = 'column';
  root.style.alignItems = 'center';
  const head = document.createElement('div');
  Object.assign(head.style, {
    width: '16px',
    height: '16px',
    borderRadius: '8px',
    background: color,
    border: `2px solid ${rideMapColors.white}`,
    boxShadow: '0 2px 6px rgba(31,31,31,0.18)',
  });
  const stem = document.createElement('div');
  Object.assign(stem.style, {
    width: '2px',
    height: '8px',
    background: color,
  });
  root.append(head, stem);
  return root;
}

export function RideMapView({ pins, frame, padding, mapRef, onReady, onFail }: RideMapViewProps) {
  const host = useRef<HTMLElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef(new globalThis.Map<string, Marker>());
  const pinsRef = useRef(pins);
  const frameRef = useRef(frame);
  const paddingRef = useRef(padding);
  const ready = useRef(false);
  const fittedSize = useRef('');

  useEffect(() => {
    pinsRef.current = pins;
    frameRef.current = frame;
    paddingRef.current = padding;
  });

  useEffect(() => {
    const node = host.current;
    if (!node) {
      onFail();
      return undefined;
    }
    ensureWorker();
    fillHost(node);
    let created: MapLibreMap;
    try {
      created = new MapLibreMap({
        container: node,
        style: rideMapStyle() as never,
        center: frame.center,
        zoom: frame.zoom,
        pitch: 0,
        maxPitch: 0,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: false,
        fadeDuration: 200,
        canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
      });
    } catch {
      onFail();
      return undefined;
    }
    map.current = created;
    fillHost(node);
    created.resize();
    const markerMap = markers.current;
    created.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    const fail = () => {
      if (!ready.current) {
        onFail();
      }
    };
    const timer = setTimeout(fail, 12_000);
    created.on('load', () => {
      ready.current = true;
      clearTimeout(timer);
      placeMarkers(created);
      fit(created, true);
      onReady();
    });
    created.on('error', (event) => {
      const message = event.error instanceof Error ? event.error.message : '';
      if (/WebGL|Failed to initialize/i.test(message)) {
        fail();
      }
    });

    function placeMarkers(target: MapLibreMap) {
      const next = new Set<string>();
      for (const pin of pinsRef.current) {
        next.add(pin.id);
        const existing = markers.current.get(pin.id);
        if (existing) {
          existing.setLngLat([pin.lng, pin.lat]);
          continue;
        }
        const marker = new Marker({
          element: pinNode(pin),
          anchor: pin.kind === 'user' ? 'center' : 'bottom',
        })
          .setLngLat([pin.lng, pin.lat])
          .addTo(target);
        markers.current.set(pin.id, marker);
      }
      for (const [id, marker] of markers.current) {
        if (!next.has(id)) {
          marker.remove();
          markers.current.delete(id);
        }
      }
    }

    function fit(target: MapLibreMap, immediate: boolean) {
      const next = frameRef.current;
      const pad = paddingRef.current;
      if (next.bounds) {
        target.fitBounds(
          [
            [next.bounds[0], next.bounds[1]],
            [next.bounds[2], next.bounds[3]],
          ],
          { padding: pad, maxZoom: 15.5, duration: immediate ? 0 : 600 },
        );
        return;
      }
      target.easeTo({
        center: next.center,
        zoom: next.zoom,
        padding: pad,
        duration: immediate ? 0 : 600,
      });
    }

    mapRef.current = {
      zoomBy: (delta) => {
        const current = created.getZoom();
        created.easeTo({ zoom: Math.min(18, Math.max(3, current + delta)), duration: 280 });
      },
      locate: (lng, lat) => {
        created.easeTo({
          center: [lng, lat],
          zoom: Math.max(created.getZoom(), 15),
          duration: 700,
        });
      },
    };

    return () => {
      clearTimeout(timer);
      mapRef.current = null;
      for (const marker of markerMap.values()) {
        marker.remove();
      }
      markerMap.clear();
      created.remove();
      map.current = null;
    };
    // The map is created once. Pins and the frame are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const target = map.current;
    if (!target || !ready.current) {
      return;
    }
    const next = new Set(pins.map((pin) => pin.id));
    for (const pin of pins) {
      const existing = markers.current.get(pin.id);
      if (existing) {
        existing.setLngLat([pin.lng, pin.lat]);
      } else {
        const marker = new Marker({
          element: pinNode(pin),
          anchor: pin.kind === 'user' ? 'center' : 'bottom',
        })
          .setLngLat([pin.lng, pin.lat])
          .addTo(target);
        markers.current.set(pin.id, marker);
      }
    }
    for (const [id, marker] of markers.current) {
      if (!next.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }
  }, [pins]);

  const anchorKey = pins
    .filter((pin) => pin.kind !== 'user')
    .map((pin) => `${pin.kind}:${pin.lat.toFixed(5)}:${pin.lng.toFixed(5)}`)
    .join('|');

  useEffect(() => {
    const target = map.current;
    const next = frameRef.current;
    if (!target || !ready.current || anchorKey.length === 0) {
      return;
    }
    if (next.bounds) {
      target.fitBounds(
        [
          [next.bounds[0], next.bounds[1]],
          [next.bounds[2], next.bounds[3]],
        ],
        { padding, maxZoom: 15.5, duration: 600 },
      );
      return;
    }
    target.easeTo({ center: next.center, zoom: next.zoom, padding, duration: 600 });
  }, [anchorKey, padding]);

  return (
    <View
      ref={host as never}
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        const target = map.current;
        if (host.current) {
          fillHost(host.current);
        }
        target?.resize();
        const key = `${Math.round(width)}x${Math.round(height)}`;
        if (!target || !ready.current || width < 40 || height < 40 || fittedSize.current === key) {
          return;
        }
        fittedSize.current = key;
        const next = frameRef.current;
        const pad = paddingRef.current;
        if (next.bounds) {
          target.fitBounds(
            [
              [next.bounds[0], next.bounds[1]],
              [next.bounds[2], next.bounds[3]],
            ],
            { padding: pad, maxZoom: 15.5, duration: 0 },
          );
          return;
        }
        target.jumpTo({ center: next.center, zoom: next.zoom, padding: pad });
      }}
    />
  );
}
