import {
  liveTripSchema,
  locationUpdateSchema,
  pinAttemptSchema,
  roundLatLng,
  type LatLng,
  type LiveTrip,
  type LocationUpdate,
  type PinAttempt,
  type TripLocationSource,
} from '@drop/shared';

import type { DropSupabase } from './supabase';

async function callRpc<T>(
  client: DropSupabase,
  name: string,
  args: Record<string, unknown>,
  parse: (data: unknown) => T,
): Promise<T> {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new Error(error.message);
  }
  return parse(data);
}

export async function loadTrip(
  client: DropSupabase,
  tripId?: string | null,
): Promise<LiveTrip | null> {
  return callRpc(client, 'trip_view', tripId ? { p_trip_id: tripId } : {}, (data) =>
    data == null ? null : liveTripSchema.parse(data),
  );
}

export async function markArrived(client: DropSupabase, tripId: string): Promise<LiveTrip> {
  return callRpc(client, 'mark_arrived', { p_trip_id: tripId }, (data) =>
    liveTripSchema.parse(data),
  );
}

export async function startTrip(
  client: DropSupabase,
  tripId: string,
  pin: string,
): Promise<PinAttempt> {
  return callRpc(client, 'start_trip', { p_trip_id: tripId, p_pin: pin }, (data) =>
    pinAttemptSchema.parse(data),
  );
}

export async function completeTrip(client: DropSupabase, tripId: string): Promise<LiveTrip> {
  return callRpc(client, 'complete_trip', { p_trip_id: tripId }, (data) =>
    liveTripSchema.parse(data),
  );
}

export async function cancelTrip(
  client: DropSupabase,
  tripId: string,
  reason: string,
  confirmStarted = false,
): Promise<LiveTrip> {
  return callRpc(
    client,
    'cancel_trip',
    { p_trip_id: tripId, p_reason: reason, p_confirm_started: confirmStarted },
    (data) => liveTripSchema.parse(data),
  );
}

export async function updateTripLocation(
  client: DropSupabase,
  tripId: string,
  point: LatLng,
  source: TripLocationSource,
  extra?: { heading?: number | null; speed?: number | null; accuracy?: number | null },
): Promise<LocationUpdate> {
  const rounded = roundLatLng(point);
  return callRpc(
    client,
    'update_trip_location',
    {
      p_trip_id: tripId,
      p_lat: rounded.lat,
      p_lng: rounded.lng,
      p_heading: extra?.heading ?? null,
      p_speed: extra?.speed ?? null,
      p_accuracy: extra?.accuracy ?? null,
      p_source: source,
    },
    (data) => locationUpdateSchema.parse(data),
  );
}

export function watchTrip(client: DropSupabase, tripId: string, onChange: () => void): () => void {
  const channel = client
    .channel(`trip:${tripId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trip_locations', filter: `trip_id=eq.${tripId}` },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'payments', filter: `trip_id=eq.${tripId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
