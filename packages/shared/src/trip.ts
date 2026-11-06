import { z } from 'zod';

import { tripStatuses, type TripStatus } from './enums';
import type { LatLng } from './matching';

/**
 * Live-trip rules shared by the apps and supabase/migrations/20261106120000_m4_live_trip.sql.
 * Change both together. Status values stay the ones from M0: assigned, arrived,
 * in_progress, completed, cancelled.
 */
export const PIN_LENGTH = 4;
export const PIN_MAX_ATTEMPTS = 3;
export const TRIP_LOCATION_SOURCES = ['device', 'simulated'] as const;
export type TripLocationSource = (typeof TRIP_LOCATION_SOURCES)[number];

export const liveLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  recordedAt: z.string(),
  source: z.enum(TRIP_LOCATION_SOURCES),
});

export const liveTripSchema = z.object({
  tripId: z.string().min(1),
  status: z.enum(tripStatuses),
  agreedFareKobo: z.number().int().positive(),
  pinAttempts: z.number().int().nonnegative(),
  pinLocked: z.boolean(),
  pin: z
    .string()
    .regex(/^\d{4}$/)
    .nullable(),
  role: z.enum(['passenger', 'rider']),
  passengerName: z.string(),
  riderName: z.string(),
  plate: z.string(),
  colour: z.string(),
  pickupNote: z.string().nullable(),
  dropoffLabel: z.string(),
  pickup: z.object({ lat: z.number(), lng: z.number() }),
  dropoff: z.object({ lat: z.number(), lng: z.number() }),
  paymentMethod: z.literal('cash'),
  paymentStatus: z.enum(['pending', 'confirmed', 'disputed']),
  paymentAmountKobo: z.number().int().positive(),
  location: liveLocationSchema.nullable(),
  cancelReason: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  arrivedAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export type LiveTrip = z.infer<typeof liveTripSchema>;

export const pinAttemptSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
  pinAttempts: z.number().int().nonnegative(),
  pinLocked: z.boolean(),
  trip: liveTripSchema,
});

export type PinAttempt = z.infer<typeof pinAttemptSchema>;

export const locationUpdateSchema = z.object({
  ok: z.literal(true),
  stored: z.boolean(),
  source: z.enum(TRIP_LOCATION_SOURCES),
});

export type LocationUpdate = z.infer<typeof locationUpdateSchema>;

const OPEN_STATUSES: readonly TripStatus[] = ['assigned', 'arrived', 'in_progress'];

export function tripStatusLabel(status: TripStatus): string {
  switch (status) {
    case 'assigned':
      return 'Accepted · rider is on the way';
    case 'arrived':
      return 'Arrived · waiting for the PIN';
    case 'in_progress':
      return 'On trip';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function pinFailureMessage(attemptsAfter: number): string {
  if (attemptsAfter >= PIN_MAX_ATTEMPTS) {
    return 'Too many tries. Contact DROP support.';
  }
  const left = PIN_MAX_ATTEMPTS - attemptsAfter;
  return `Wrong PIN. ${left} ${left === 1 ? 'try' : 'tries'} left.`;
}

export type PinCheck = {
  ok: boolean;
  status: TripStatus;
  attempts: number;
  pinLocked: boolean;
  message: string;
};

/**
 * The same decisions start_trip makes. The database compares a hash;
 * this checks the rules and the messages.
 */
export function checkBoardingPin(input: {
  status: TripStatus;
  pinLocked: boolean;
  attempts: number;
  pin: string;
  entered: string;
}): PinCheck {
  if (input.status === 'in_progress') {
    return {
      ok: true,
      status: 'in_progress',
      attempts: input.attempts,
      pinLocked: false,
      message: 'Trip started.',
    };
  }
  if (input.status !== 'arrived') {
    return {
      ok: false,
      status: input.status,
      attempts: input.attempts,
      pinLocked: input.pinLocked,
      message: 'Tap Arrived before asking for the PIN.',
    };
  }
  if (input.pinLocked || input.attempts >= PIN_MAX_ATTEMPTS) {
    return {
      ok: false,
      status: 'arrived',
      attempts: input.attempts,
      pinLocked: true,
      message: pinFailureMessage(PIN_MAX_ATTEMPTS),
    };
  }
  if (!/^\d{4}$/.test(input.entered)) {
    return {
      ok: false,
      status: 'arrived',
      attempts: input.attempts,
      pinLocked: false,
      message: 'Enter the 4-digit PIN.',
    };
  }
  if (input.entered === input.pin) {
    return {
      ok: true,
      status: 'in_progress',
      attempts: input.attempts,
      pinLocked: false,
      message: 'Trip started.',
    };
  }
  const attempts = input.attempts + 1;
  return {
    ok: false,
    status: 'arrived',
    attempts,
    pinLocked: attempts >= PIN_MAX_ATTEMPTS,
    message: pinFailureMessage(attempts),
  };
}

export type TripMove =
  { ok: true; status: TripStatus } | { ok: false; status: TripStatus; message: string };

export function arriveTransition(status: TripStatus): TripMove {
  if (status === 'assigned' || status === 'arrived') {
    return { ok: true, status: 'arrived' };
  }
  return { ok: false, status, message: 'You can mark arrival only on the way to pickup.' };
}

export function completeTransition(status: TripStatus): TripMove {
  if (status === 'completed') {
    return { ok: true, status: 'completed' };
  }
  if (status !== 'in_progress') {
    return { ok: false, status, message: 'End the trip only after it has started.' };
  }
  return { ok: true, status: 'completed' };
}

export function cancelTransition(status: TripStatus, confirmStarted: boolean): TripMove {
  if (status === 'cancelled') {
    return { ok: false, status, message: 'This trip is already cancelled.' };
  }
  if (status === 'completed') {
    return { ok: false, status, message: 'This trip is already finished.' };
  }
  if (status === 'in_progress' && !confirmStarted) {
    return { ok: false, status, message: 'This trip has started. Confirm to stop it.' };
  }
  return { ok: true, status: 'cancelled' };
}

export function cashCompletion(input: {
  agreedFareKobo: number;
  method: string;
  amountKobo: number;
}):
  | { ok: true; method: 'cash'; amountKobo: number; status: 'confirmed' }
  | { ok: false; message: string } {
  if (input.method !== 'cash') {
    return { ok: false, message: 'Cash is the only payment method.' };
  }
  if (input.amountKobo !== input.agreedFareKobo) {
    return { ok: false, message: 'The cash amount must match the locked fare.' };
  }
  return {
    ok: true,
    method: 'cash',
    amountKobo: input.agreedFareKobo,
    status: 'confirmed',
  };
}

export function canReadTripData(input: {
  actorId: string;
  passengerId: string;
  riderId: string;
}): boolean {
  return input.actorId === input.passengerId || input.actorId === input.riderId;
}

export function canReadBoardingPin(input: {
  actorId: string;
  passengerId: string;
  riderId: string;
}): boolean {
  return input.actorId === input.passengerId && input.actorId !== input.riderId;
}

export function locationWriteAllowed(input: {
  actorIsAssignedRider: boolean;
  status: TripStatus;
  source: string;
}): { ok: true; source: TripLocationSource } | { ok: false; message: string } {
  if (!input.actorIsAssignedRider) {
    return { ok: false, message: 'This trip is not yours.' };
  }
  if (!OPEN_STATUSES.includes(input.status)) {
    return { ok: false, message: 'This trip is no longer live.' };
  }
  if (input.source !== 'device' && input.source !== 'simulated') {
    return { ok: false, message: 'Say whether this location is from the phone or a test.' };
  }
  return { ok: true, source: input.source };
}

export function mapCaption(input: {
  mapsConfigured: boolean;
  streetMapVisible: boolean;
  locationSource: TripLocationSource | null;
}): string {
  if (input.locationSource === 'simulated') {
    return 'Test location. This pin is not the rider’s phone GPS.';
  }
  if (input.streetMapVisible) {
    return 'Live map';
  }
  if (input.mapsConfigured) {
    return 'Map preview. Turn-by-turn opens in Google Maps.';
  }
  return 'Map preview. Google Maps is not configured, so this is not a live street map.';
}

export function locationAgeLabel(
  recordedAt: string | null,
  nowMs: number,
  source: TripLocationSource | null,
): string {
  if (!recordedAt || !source) {
    return 'Waiting for the rider’s location.';
  }
  const ageMs = nowMs - Date.parse(recordedAt);
  const age = Number.isFinite(ageMs) ? Math.max(0, Math.round(ageMs / 1000)) : 0;
  const when = `Updated ${age}s ago`;
  if (source === 'simulated') {
    return `Test location, not phone GPS. ${when}.`;
  }
  return when;
}

function queryString(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

export function googleEmbedUrl(key: string, point: LatLng): string | null {
  const trimmed = key.trim();
  if (!trimmed || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    return null;
  }
  return `https://www.google.com/maps/embed/v1/view?${queryString({
    key: trimmed,
    center: `${point.lat},${point.lng}`,
    zoom: '16',
    maptype: 'roadmap',
  })}`;
}

export function googleDirectionsUrl(point: LatLng): string {
  return `https://www.google.com/maps/dir/?${queryString({
    api: '1',
    destination: `${point.lat},${point.lng}`,
    travelmode: 'two-wheeler',
  })}`;
}

export function projectPins(
  points: { id: string; lat: number; lng: number }[],
): Record<string, { top: number; left: number }> {
  const placed: Record<string, { top: number; left: number }> = {};
  if (points.length === 0) {
    return placed;
  }
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  points.forEach((point, index) => {
    const y = latSpan === 0 ? 0.5 : (maxLat - point.lat) / latSpan;
    const x = lngSpan === 0 ? 0.5 : (point.lng - minLng) / lngSpan;
    const nudge = latSpan === 0 && lngSpan === 0 ? index * 6 : 0;
    placed[point.id] = {
      top: Math.min(88, Math.max(12, Math.round(y * 76 + 12 + nudge))),
      left: Math.min(88, Math.max(12, Math.round(x * 76 + 12))),
    };
  });
  return placed;
}

export function stepToward(from: LatLng, to: LatLng, fraction: number): LatLng {
  const t = Math.min(1, Math.max(0, fraction));
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}
