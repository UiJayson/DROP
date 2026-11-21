import { haversineM, type LatLng } from '@drop/shared';

/** Anywhere Ride greys, painted onto a real OpenFreeMap vector style. */
export const rideMapColors = {
  land: '#FAFAFA',
  white: '#FFFFFF',
  road: '#EBEBEB',
  buildingEdge: '#BDBFC1',
  label: '#616262',
  water: '#E4E7EB',
  pickup: '#FFE14A',
  pickupHighlight: '#FFF6B0',
  pickupBase: '#E09600',
  dropoff: '#1F1F1F',
} as const;

const SOURCE = 'openmaptiles';

type Layer = {
  id: string;
  type: string;
  source?: string;
  'source-layer'?: string;
  filter?: unknown;
  minzoom?: number;
  maxzoom?: number;
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
};

export type RideMapStyle = {
  version: 8;
  name: string;
  glyphs: string;
  sources: Record<string, { type: string; url?: string; attribution?: string }>;
  layers: Layer[];
};

const lineGeom = ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false];
const polygonGeom = ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false];

function roadFilter(classes: string[]): unknown {
  return ['all', lineGeom, ['match', ['get', 'class'], classes, true, false]];
}

function width(stops: number[]): unknown {
  return ['interpolate', ['exponential', 1.4], ['zoom'], ...stops];
}

function road(id: string, classes: string[], minzoom: number, casing: boolean): Layer[] {
  const filter = roadFilter(classes);
  const inner: Layer = {
    id,
    type: 'line',
    source: SOURCE,
    'source-layer': 'transportation',
    minzoom,
    filter,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': rideMapColors.road,
      'line-width': width(casing ? [10, 1.4, 14, 5, 18, 16] : [12, 0.6, 14, 1.6, 18, 10]),
    },
  };
  if (!casing) {
    return [inner];
  }
  const outline: Layer = {
    id: `${id}-casing`,
    type: 'line',
    source: SOURCE,
    'source-layer': 'transportation',
    minzoom,
    filter,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': rideMapColors.white,
      'line-width': width([10, 3, 14, 8, 18, 22]),
    },
  };
  return [outline, inner];
}

const placeName = ['coalesce', ['get', 'name_en'], ['get', 'name']];

function placeLabel(
  id: string,
  placeClass: string,
  minzoom: number,
  maxzoom: number | undefined,
  size: number,
): Layer {
  return {
    id,
    type: 'symbol',
    source: SOURCE,
    'source-layer': 'place',
    minzoom,
    ...(maxzoom === undefined ? {} : { maxzoom }),
    filter: ['==', ['get', 'class'], placeClass],
    layout: {
      'text-field': placeName,
      'text-font': ['Noto Sans Regular'],
      'text-size': size,
      'text-max-width': 8,
    },
    paint: {
      'text-color': rideMapColors.label,
      'text-halo-color': rideMapColors.white,
      'text-halo-width': 1.2,
    },
  };
}

/** Flat OpenFreeMap style. No key. Buildings stay fills, not extrusions. */
export function rideMapStyle(): RideMapStyle {
  return {
    version: 8,
    name: 'DROP flat',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      [SOURCE]: {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
        attribution: '© OpenFreeMap © OpenStreetMap',
      },
    },
    layers: [
      {
        id: 'land',
        type: 'background',
        paint: { 'background-color': rideMapColors.land },
      },
      {
        id: 'residential',
        type: 'fill',
        source: SOURCE,
        'source-layer': 'landuse',
        filter: ['all', polygonGeom, ['==', ['get', 'class'], 'residential']],
        paint: { 'fill-color': rideMapColors.white, 'fill-opacity': 0.72 },
      },
      {
        id: 'park',
        type: 'fill',
        source: SOURCE,
        'source-layer': 'park',
        filter: polygonGeom,
        paint: { 'fill-color': '#F4F5F4' },
      },
      {
        id: 'water',
        type: 'fill',
        source: SOURCE,
        'source-layer': 'water',
        filter: polygonGeom,
        paint: { 'fill-color': rideMapColors.water },
      },
      {
        id: 'waterway',
        type: 'line',
        source: SOURCE,
        'source-layer': 'waterway',
        filter: lineGeom,
        paint: { 'line-color': rideMapColors.water, 'line-width': 1.2 },
      },
      ...road('highway-minor', ['minor', 'service'], 13, false),
      ...road('highway-major', ['primary', 'secondary', 'tertiary', 'trunk'], 8, true),
      ...road('highway-motorway', ['motorway'], 6, true),
      {
        id: 'building',
        type: 'fill',
        source: SOURCE,
        'source-layer': 'building',
        minzoom: 14,
        paint: {
          'fill-color': rideMapColors.white,
          'fill-outline-color': rideMapColors.buildingEdge,
        },
      },
      placeLabel('label-city', 'city', 4, 12, 14),
      placeLabel('label-town', 'town', 8, 16, 13),
      placeLabel('label-suburb', 'suburb', 12, undefined, 13),
      {
        id: 'road-name',
        type: 'symbol',
        source: SOURCE,
        'source-layer': 'transportation_name',
        minzoom: 15,
        filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false],
        layout: {
          'text-field': placeName,
          'text-font': ['Noto Sans Regular'],
          'symbol-placement': 'line',
          'text-size': 11,
        },
        paint: {
          'text-color': rideMapColors.label,
          'text-halo-color': rideMapColors.white,
          'text-halo-width': 1.2,
        },
      },
    ],
  };
}

export type RidePinKind = 'pickup' | 'dropoff' | 'user';

export type RidePin = LatLng & {
  id: string;
  kind: RidePinKind;
  label: string;
};

export type RideFrame = {
  center: [lng: number, lat: number];
  zoom: number;
  bounds: [west: number, south: number, east: number, north: number] | null;
};

const USER_NEAR_M = 25_000;

/** A fix on another continent must not pull the camera off the ride. */
export function framePoints(anchors: readonly LatLng[], user: LatLng | null): LatLng[] {
  if (!user || anchors.length === 0) {
    return [...anchors];
  }
  const near = anchors.some((point) => haversineM(point, user) <= USER_NEAR_M);
  return near ? [...anchors, user] : [...anchors];
}

function mercatorZoom(span: number, pixels: number, full: number): number {
  if (span <= 0) {
    return 16;
  }
  return Math.log2((pixels / 256) * (full / span));
}

function latRad(lat: number): number {
  const sine = Math.sin((lat * Math.PI) / 180);
  return Math.log((1 + sine) / (1 - sine)) / 2;
}

/** Center and zoom for the pins we actually have. Null when there is nothing to show. */
export function rideFrame(points: readonly LatLng[]): RideFrame | null {
  if (points.length === 0) {
    return null;
  }
  let west = points[0]!.lng;
  let east = points[0]!.lng;
  let south = points[0]!.lat;
  let north = points[0]!.lat;
  for (const point of points) {
    west = Math.min(west, point.lng);
    east = Math.max(east, point.lng);
    south = Math.min(south, point.lat);
    north = Math.max(north, point.lat);
  }
  const center: [number, number] = [(west + east) / 2, (south + north) / 2];
  if (points.length === 1 || (east - west < 0.002 && north - south < 0.002)) {
    return { center: [points[0]!.lng, points[0]!.lat], zoom: 15, bounds: null };
  }
  const lngZoom = mercatorZoom(east - west, 340, 360);
  const latZoom = mercatorZoom(latRad(north) - latRad(south), 240, Math.PI);
  const zoom = Math.min(15.5, Math.max(10, Math.min(lngZoom, latZoom) - 0.8));
  return { center, zoom, bounds: [west, south, east, north] };
}
