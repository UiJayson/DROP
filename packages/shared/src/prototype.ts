import { quoteFare, type FareQuote } from './fare';

/** Festac seed fare rule from supabase/seed.sql. Money is integer kobo. */
export const festacFareRule = {
  baseKobo: 20_000,
  perKmKobo: 15_000,
  minKobo: 30_000,
  rangeLowPct: 10,
  rangeHighPct: 25,
} as const;

export const BOARDING_PIN = '4821';

export const pickup = {
  title: '23rd Road, Festac Town',
  note: 'Near Shoprite gate, blue kiosk',
  area: 'Festac Town',
} as const;

export const areas = {
  festac: { id: 'festac', name: 'Festac Town', nearby: 12 },
  satellite: { id: 'satellite', name: 'Satellite Town', nearby: 0 },
} as const;

export type AreaId = keyof typeof areas;

export const passengerProfile = {
  name: 'Ada',
  phoneMasked: '0803 ••• 2194',
} as const;

export const riderProfile = {
  name: 'Adaeze',
  rating: 4.92,
  rides: 1389,
  plate: 'FKJ-214LA',
  colour: 'Yellow',
} as const;

export type Place = {
  id: string;
  name: string;
  detail: string;
  distanceM: number;
  recent: boolean;
  restricted: boolean;
};

export const places: readonly Place[] = [
  {
    id: 'shoprite',
    name: 'Shoprite Festac',
    detail: '23rd Avenue gate',
    distanceM: 1_800,
    recent: true,
    restricted: false,
  },
  {
    id: 'mile2',
    name: 'Mile 2 Bus Stop',
    detail: 'Under the bridge',
    distanceM: 3_200,
    recent: true,
    restricted: false,
  },
  {
    id: 'alaba',
    name: 'Alaba International',
    detail: 'Main gate, electronics line',
    distanceM: 8_400,
    recent: false,
    restricted: false,
  },
  {
    id: 'tradefair',
    name: 'Trade Fair Complex',
    detail: 'Gate 2',
    distanceM: 6_100,
    recent: true,
    restricted: false,
  },
  {
    id: 'amuwo',
    name: 'Amuwo Odofin',
    detail: 'Council junction',
    distanceM: 4_500,
    recent: false,
    restricted: false,
  },
  {
    id: 'bridge',
    name: 'Third Mainland Bridge',
    detail: 'Outside the Keke service area',
    distanceM: 12_000,
    recent: false,
    restricted: true,
  },
];

export const ratingTags = ['Safe', 'Polite', 'Fast'] as const;

export type PrototypeOffer = {
  id: string;
  name: string;
  rating: number;
  rides: number;
  plate: string;
  colour: string;
  etaMin: number;
  dropoffMin: number;
  seats: number;
  amountKobo: number;
  kind: 'accept' | 'counter';
};

export function placeById(id: string): Place | undefined {
  return places.find((place) => place.id === id);
}

export function quoteForDistance(distanceM: number): FareQuote {
  return quoteFare(distanceM, festacFareRule);
}

export function quoteForPlace(id: string): FareQuote | undefined {
  const place = placeById(id);
  if (!place || place.restricted) {
    return undefined;
  }
  return quoteForDistance(place.distanceM);
}

/** Default story: Festac to Alaba International, using the seeded fare rule. */
export const defaultPlaceId = 'alaba';

export function defaultQuote(): FareQuote {
  const quote = quoteForPlace(defaultPlaceId);
  if (!quote) {
    throw new Error('default place is missing a fare quote');
  }
  return quote;
}

export function buildOffers(offerKobo: number): PrototypeOffer[] {
  return [
    {
      id: 'adaeze',
      name: riderProfile.name,
      rating: riderProfile.rating,
      rides: riderProfile.rides,
      plate: riderProfile.plate,
      colour: riderProfile.colour,
      etaMin: 3,
      dropoffMin: 0,
      seats: 0,
      amountKobo: offerKobo,
      kind: 'accept',
    },
    {
      id: 'chinedu',
      name: 'Chinedu',
      rating: 4.81,
      rides: 864,
      plate: 'KJA-482XE',
      colour: 'Yellow',
      etaMin: 6,
      dropoffMin: 4,
      seats: 2,
      amountKobo: offerKobo + 20_000,
      kind: 'counter',
    },
    {
      id: 'ibrahim',
      name: 'Ibrahim',
      rating: 4.7,
      rides: 412,
      plate: 'APP-119KD',
      colour: 'Green',
      etaMin: 8,
      dropoffMin: 0,
      seats: 0,
      amountKobo: offerKobo + 10_000,
      kind: 'counter',
    },
  ];
}

export function filterPlaces(query: string): readonly Place[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return places.filter((place) => place.recent);
  }
  return places.filter((place) => `${place.name} ${place.detail}`.toLowerCase().includes(needle));
}

export const rebookPlaceId = 'shoprite';

export type EarningTrip = {
  id: string;
  route: string;
  fareKobo: number;
  when: string;
};

export const earlierTrips: readonly EarningTrip[] = [
  { id: 't1', route: 'Festac → Mile 2', fareKobo: 70_000, when: '7:40' },
  { id: 't2', route: 'Festac → Shoprite', fareKobo: 50_000, when: '9:05' },
  { id: 't3', route: '23rd Road → Trade Fair', fareKobo: 110_000, when: '11:20' },
];

export const weekExtraKobo = 750_000;

export const riderRequest = {
  passengerName: passengerProfile.name,
  pickupTitle: pickup.title,
  pickupNote: pickup.note,
  destination: 'Alaba International',
  pickupKm: 1.2,
  tripKm: 8.4,
  countdownSec: 15,
} as const;
