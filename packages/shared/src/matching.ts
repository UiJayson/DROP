import { z } from 'zod';

import { FARE_STEP_KOBO } from './money';

/**
 * Matching numbers shared by the apps and supabase/migrations/20261102180000_m3_matching.sql.
 * Change both together.
 */
export const MATCH_RADIUS_M = [1_500, 3_000, 5_000] as const;
export const REQUEST_TTL_SECONDS = 75;
export const OFFER_TTL_SECONDS = 30;
export const RIDER_FRESH_SECONDS = 60;
export const MATCH_FANOUT_LIMIT = 15;
export const KEKE_SPEED_MPS = 5;
export const CARRYING_BASE_PAD_SECONDS = 120;
export const CARRYING_PER_SEAT_SECONDS = 60;
export const ROAD_FACTOR = 1.4;
export const ROAD_DISTANCE_MIN_FACTOR = 0.85;
export const ROAD_DISTANCE_MAX_FACTOR = 3;
export const GEOHASH_PRECISION = 7;
export const COORD_DECIMALS = 5;
export const PLACES_DEBOUNCE_MS = 300;
export const PLACES_MIN_CHARS = 3;
export const CREATE_REQUESTS_PER_MINUTE = 6;
export const SUBMIT_OFFERS_PER_MINUTE = 20;

const GEOHASH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export type LatLng = {
  lat: number;
  lng: number;
};

export const ikejaTestPickup = {
  lat: 6.614,
  lng: 3.342,
  label: 'Allen Avenue, Ikeja',
} as const;

export type SampleDestination = {
  id: string;
  name: string;
  detail: string;
  lat: number;
  lng: number;
  recent: boolean;
};

/** Ikeja landmarks for when a Google Maps key is not set. The server still checks the zone. */
export const sampleDestinations: readonly SampleDestination[] = [
  {
    id: 'ikeja-mall',
    name: 'Ikeja City Mall',
    detail: 'Obafemi Awolowo Way',
    lat: 6.616,
    lng: 3.351,
    recent: true,
  },
  {
    id: 'computer-village',
    name: 'Computer Village',
    detail: 'Otigba Street',
    lat: 6.6012,
    lng: 3.3515,
    recent: true,
  },
  {
    id: 'allen-junction',
    name: 'Allen Avenue junction',
    detail: 'Adeniyi Jones',
    lat: 6.608,
    lng: 3.348,
    recent: false,
  },
  {
    id: 'restricted-block',
    name: 'Sample restricted block',
    detail: 'Blocked on purpose inside the Ikeja test zone',
    lat: 6.595,
    lng: 3.365,
    recent: false,
  },
  {
    id: 'outside-zone',
    name: 'Outside the test zone',
    detail: 'South of the Ikeja practice area',
    lat: 6.55,
    lng: 3.4,
    recent: false,
  },
];

export function filterSampleDestinations(query: string): readonly SampleDestination[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return sampleDestinations.filter((place) => place.recent);
  }
  return sampleDestinations.filter((place) =>
    `${place.name} ${place.detail}`.toLowerCase().includes(needle),
  );
}

export function sampleDestinationById(id: string): SampleDestination | undefined {
  return sampleDestinations.find((place) => place.id === id);
}

export function roundCoord(value: number): number {
  const factor = 10 ** COORD_DECIMALS;
  return Math.round(value * factor) / factor;
}

export function roundLatLng(point: LatLng): LatLng {
  return { lat: roundCoord(point.lat), lng: roundCoord(point.lng) };
}

/** Great-circle metres. The database uses PostGIS for the same job. */
export function haversineM(from: LatLng, to: LatLng): number {
  const earth = 6_371_000;
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(to.lat - from.lat);
  const dLng = rad(to.lng - from.lng);
  const lat1 = rad(from.lat);
  const lat2 = rad(to.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function estimateRoadM(from: LatLng, to: LatLng): number {
  return Math.round(haversineM(from, to) * ROAD_FACTOR);
}

export function roadDistancePlausible(straightM: number, roadM: number): boolean {
  if (!Number.isInteger(roadM) || roadM < 0) {
    return false;
  }
  if (straightM <= 1) {
    return roadM <= 500;
  }
  const min = Math.round(straightM * ROAD_DISTANCE_MIN_FACTOR);
  const max = Math.max(500, Math.round(straightM * ROAD_DISTANCE_MAX_FACTOR));
  return roadM >= min && roadM <= max;
}

/** Standard geohash. Precision 7 is about 150 m. Longitude bit comes first. */
export function geohash(lat: number, lng: number, precision = GEOHASH_PRECISION): string {
  if (precision < 1 || precision > 12) {
    throw new Error('geohash precision must be from 1 to 12');
  }
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let even = true;
  let bit = 0;
  let ch = 0;
  let hash = '';

  while (hash.length < precision) {
    if (even) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        ch = ch * 2 + 1;
        lngMin = mid;
      } else {
        ch = ch * 2;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch = ch * 2 + 1;
        latMin = mid;
      } else {
        ch = ch * 2;
        latMax = mid;
      }
    }
    even = !even;
    bit += 1;
    if (bit === 5) {
      hash += GEOHASH_BASE32[ch] ?? '';
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

export function nextRadiusM(current: number): number {
  for (const radius of MATCH_RADIUS_M) {
    if (current < radius) {
      return radius;
    }
  }
  return MATCH_RADIUS_M[MATCH_RADIUS_M.length - 1] ?? 5_000;
}

export function etaSeconds(
  distanceM: number,
  seatsOccupied: number,
): { etaS: number; padS: number; carrying: boolean } {
  const travel = Math.ceil(Math.max(0, distanceM) / KEKE_SPEED_MPS);
  const carrying = seatsOccupied > 0;
  const padS = carrying ? CARRYING_BASE_PAD_SECONDS + CARRYING_PER_SEAT_SECONDS * seatsOccupied : 0;
  return { etaS: travel + padS, padS, carrying };
}

export function dropoffMinutes(seatsOccupied: number): number {
  if (seatsOccupied <= 0) {
    return 0;
  }
  return Math.round((CARRYING_BASE_PAD_SECONDS + CARRYING_PER_SEAT_SECONDS * seatsOccupied) / 60);
}

export function etaMinutes(etaS: number): number {
  return Math.max(1, Math.round(etaS / 60));
}

export function radiusSearchLabel(radiusM: number | null): string {
  if (radiusM == null) {
    return 'Asking riders within 1.5 km first, then 3 km, then 5 km.';
  }
  if (radiusM < 3_000) {
    return 'Asking riders within 1.5 km. If it stays quiet, we widen to 3 km, then 5 km.';
  }
  if (radiusM < 5_000) {
    return 'Asking riders within 3 km. Next we widen to 5 km.';
  }
  return 'Asking riders within 5 km.';
}

export function requestChannel(requestId: string): string {
  return `request:${requestId}`;
}

export function riderChannel(riderId: string): string {
  return `rider:${riderId}`;
}

export function placesQueryReady(query: string): boolean {
  return query.trim().length >= PLACES_MIN_CHARS;
}

export function fareOnStep(kobo: number): boolean {
  return Number.isInteger(kobo) && kobo >= 0 && kobo % FARE_STEP_KOBO === 0;
}

export const serverFareQuoteSchema = z.object({
  distanceM: z.number().int().nonnegative(),
  distanceSource: z.enum(['google', 'estimate']),
  rawKobo: z.number().int().nonnegative(),
  midpointKobo: z.number().int().nonnegative(),
  suggestedLowKobo: z.number().int().nonnegative(),
  suggestedHighKobo: z.number().int().nonnegative(),
  minKobo: z.number().int().nonnegative(),
  zoneId: z.string().min(1),
});

export type ServerFareQuote = z.infer<typeof serverFareQuoteSchema>;

export const liveOfferSchema = z.object({
  id: z.string().min(1),
  riderId: z.string().min(1),
  name: z.string(),
  rating: z.number(),
  rides: z.number().int().nonnegative(),
  plate: z.string(),
  colour: z.string(),
  etaS: z.number().int().nonnegative(),
  seats: z.number().int().min(0).max(3),
  amountKobo: z.number().int().positive(),
  kind: z.enum(['accept', 'counter']),
  status: z.enum(['open', 'selected', 'rejected', 'expired', 'withdrawn']),
  expiresAt: z.string(),
});

export type LiveOffer = z.infer<typeof liveOfferSchema>;

export const createdRequestSchema = z.object({
  requestId: z.string().min(1),
  offerKobo: z.number().int().positive(),
  minKobo: z.number().int().nonnegative(),
  suggestedLowKobo: z.number().int().nonnegative(),
  suggestedHighKobo: z.number().int().nonnegative(),
  distanceM: z.number().int().nonnegative(),
  radiusM: z.number().int().positive(),
  expiresAt: z.string(),
  recipientCount: z.number().int().nonnegative(),
});

export type CreatedRequest = z.infer<typeof createdRequestSchema>;

export const riderInboxSchema = z.object({
  requestId: z.string().min(1),
  passengerName: z.string(),
  pickupNote: z.string().nullable(),
  dropoffLabel: z.string(),
  pickupLat: z.number(),
  pickupLng: z.number(),
  distanceToPickupM: z.number().int().nonnegative(),
  tripDistanceM: z.number().int().nonnegative(),
  offerKobo: z.number().int().positive(),
  expiresAt: z.string(),
  radiusM: z.number().int().positive(),
  myOfferId: z.string().nullable(),
  myOfferStatus: z.string().nullable(),
});

export type RiderInboxItem = z.infer<typeof riderInboxSchema>;

export const selectedTripSchema = z.object({
  tripId: z.string().min(1),
  offerId: z.string().min(1),
  agreedFareKobo: z.number().int().positive(),
  pin: z.string().regex(/^\d{4}$/),
  riderId: z.string().min(1),
});

export type SelectedTrip = z.infer<typeof selectedTripSchema>;
