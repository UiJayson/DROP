import {
  createdRequestSchema,
  liveOfferSchema,
  requestChannel,
  riderChannel,
  riderInboxSchema,
  roundLatLng,
  selectedTripSchema,
  serverFareQuoteSchema,
  type CreatedRequest,
  type LatLng,
  type LiveOffer,
  type RiderInboxItem,
  type SelectedTrip,
  type ServerFareQuote,
} from '@drop/shared';
import { z } from 'zod';

import type { DropSupabase } from './supabase';

const raisedSchema = z.object({
  requestId: z.string().min(1),
  offerKobo: z.number().int().positive(),
  radiusM: z.number().int().positive(),
  expiresAt: z.string(),
  recipientCount: z.number().int().nonnegative(),
});

const submittedSchema = z.object({
  offerId: z.string().min(1),
  amountKobo: z.number().int().positive(),
  etaS: z.number().int().nonnegative(),
  seats: z.number().int().min(0).max(3),
  expiresAt: z.string(),
});

export type RaisedRequest = z.infer<typeof raisedSchema>;
export type SubmittedOffer = z.infer<typeof submittedSchema>;

async function callRpc<T>(
  client: DropSupabase,
  name: string,
  args: Record<string, unknown>,
  schema: z.ZodType<T>,
): Promise<T> {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new Error(error.message);
  }
  return schema.parse(data);
}

export async function fareQuote(
  client: DropSupabase,
  pickup: LatLng,
  dropoff: LatLng,
): Promise<ServerFareQuote> {
  const from = roundLatLng(pickup);
  const to = roundLatLng(dropoff);
  return callRpc(
    client,
    'fare_quote',
    {
      p_pickup_lat: from.lat,
      p_pickup_lng: from.lng,
      p_dropoff_lat: to.lat,
      p_dropoff_lng: to.lng,
    },
    serverFareQuoteSchema,
  );
}

export async function cacheRoadDistance(
  client: DropSupabase,
  pickup: LatLng,
  dropoff: LatLng,
  distanceM: number,
): Promise<void> {
  const from = roundLatLng(pickup);
  const to = roundLatLng(dropoff);
  const { error } = await client.rpc('cache_road_distance', {
    p_pickup_lat: from.lat,
    p_pickup_lng: from.lng,
    p_dropoff_lat: to.lat,
    p_dropoff_lng: to.lng,
    p_distance_m: distanceM,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function createRideRequest(
  client: DropSupabase,
  input: {
    pickup: LatLng;
    pickupNote: string;
    dropoff: LatLng;
    dropoffLabel: string;
    offerKobo: number;
  },
): Promise<CreatedRequest> {
  const from = roundLatLng(input.pickup);
  const to = roundLatLng(input.dropoff);
  return callRpc(
    client,
    'create_request',
    {
      p_pickup_lat: from.lat,
      p_pickup_lng: from.lng,
      p_pickup_note: input.pickupNote,
      p_dropoff_lat: to.lat,
      p_dropoff_lng: to.lng,
      p_dropoff_label: input.dropoffLabel,
      p_offer_kobo: input.offerKobo,
    },
    createdRequestSchema,
  );
}

export async function raiseRideOffer(
  client: DropSupabase,
  requestId: string,
  offerKobo: number,
): Promise<RaisedRequest> {
  return callRpc(
    client,
    'raise_offer',
    { p_request_id: requestId, p_offer_kobo: offerKobo },
    raisedSchema,
  );
}

export async function extendRideSearch(
  client: DropSupabase,
  requestId: string,
): Promise<RaisedRequest> {
  return callRpc(client, 'extend_search', { p_request_id: requestId }, raisedSchema);
}

export async function cancelRideRequest(client: DropSupabase, requestId: string): Promise<void> {
  const { error } = await client.rpc('cancel_request', { p_request_id: requestId });
  if (error) {
    throw new Error(error.message);
  }
}

export async function submitRideOffer(
  client: DropSupabase,
  requestId: string,
  type: 'accept' | 'counter',
  amountKobo: number,
): Promise<SubmittedOffer> {
  return callRpc(
    client,
    'submit_offer',
    { p_request_id: requestId, p_type: type, p_amount_kobo: amountKobo },
    submittedSchema,
  );
}

export async function withdrawRideOffer(client: DropSupabase, offerId: string): Promise<void> {
  const { error } = await client.rpc('withdraw_offer', { p_offer_id: offerId });
  if (error) {
    throw new Error(error.message);
  }
}

export async function selectRideOffer(
  client: DropSupabase,
  offerId: string,
): Promise<SelectedTrip> {
  return callRpc(client, 'select_offer', { p_offer_id: offerId }, selectedTripSchema);
}

export async function listRideOffers(
  client: DropSupabase,
  requestId: string,
): Promise<LiveOffer[]> {
  return callRpc(
    client,
    'list_request_offers',
    { p_request_id: requestId },
    z.array(liveOfferSchema),
  );
}

export async function listRiderInbox(client: DropSupabase): Promise<RiderInboxItem[]> {
  return callRpc(client, 'list_rider_requests', {}, z.array(riderInboxSchema));
}

export async function setRiderStatus(
  client: DropSupabase,
  online: boolean,
  seats: number,
): Promise<void> {
  const { error } = await client.rpc('set_rider_status', { p_online: online, p_seats: seats });
  if (error) {
    throw new Error(error.message);
  }
}

export async function pingRiderLocation(
  client: DropSupabase,
  point: LatLng,
  extra?: { heading?: number | null; speed?: number | null; accuracy?: number | null },
): Promise<void> {
  const rounded = roundLatLng(point);
  const { error } = await client.rpc('ping_rider_location', {
    p_lat: rounded.lat,
    p_lng: rounded.lng,
    p_heading: extra?.heading ?? null,
    p_speed: extra?.speed ?? null,
    p_accuracy: extra?.accuracy ?? null,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function expireMatching(client: DropSupabase): Promise<void> {
  const { error } = await client.rpc('expire_matching');
  if (error) {
    throw new Error(error.message);
  }
}

export function watchRequest(
  client: DropSupabase,
  requestId: string,
  onChange: () => void,
): () => void {
  const channel = client
    .channel(requestChannel(requestId))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ride_offers', filter: `request_id=eq.${requestId}` },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'ride_requests',
        filter: `id=eq.${requestId}`,
      },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export function watchRider(
  client: DropSupabase,
  riderId: string,
  onChange: () => void,
): () => void {
  const channel = client
    .channel(riderChannel(riderId))
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'request_recipients',
        filter: `rider_id=eq.${riderId}`,
      },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ride_offers', filter: `rider_id=eq.${riderId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
