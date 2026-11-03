import {
  cacheRoadDistance,
  cancelRideRequest,
  createRideRequest,
  expireMatching,
  extendRideSearch,
  fareQuote,
  googlePlaceDetail,
  googlePlaceSuggestions,
  googleRoadDistanceM,
  listRideOffers,
  raiseRideOffer,
  readGoogleMapsKey,
  selectRideOffer,
  watchRequest,
  type DropSupabase,
} from '@drop/api-client';
import {
  PLACES_DEBOUNCE_MS,
  filterSampleDestinations,
  ikejaTestPickup,
  placesQueryReady,
  sampleDestinationById,
  type LiveOffer,
  type ServerFareQuote,
} from '@drop/shared';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type BookingPlace = {
  id: string;
  name: string;
  detail: string;
};

export type ChosenRider = {
  offerId: string;
  pin: string;
  agreedFareKobo: number;
  offer: LiveOffer;
};

type Pickup = {
  lat: number;
  lng: number;
  label: string;
};

type BookingApi = {
  enabled: boolean;
  pickupLabel: string;
  destination: BookingPlace | null;
  quote: ServerFareQuote | null;
  results: BookingPlace[];
  busy: boolean;
  error: string | null;
  requestId: string | null;
  radiusM: number | null;
  expiresAt: string | null;
  recipientCount: number;
  offers: LiveOffer[];
  chosen: ChosenRider | null;
  setQuery: (query: string) => void;
  pick: (id: string) => Promise<ServerFareQuote | null>;
  requestDrop: (offerKobo: number, note: string) => Promise<boolean>;
  raise: (offerKobo: number) => Promise<boolean>;
  keepWaiting: () => Promise<boolean>;
  cancel: () => Promise<void>;
  select: (offerId: string) => Promise<boolean>;
};

const disabledBooking: BookingApi = {
  enabled: false,
  pickupLabel: '',
  destination: null,
  quote: null,
  results: [],
  busy: false,
  error: null,
  requestId: null,
  radiusM: null,
  expiresAt: null,
  recipientCount: 0,
  offers: [],
  chosen: null,
  setQuery: () => undefined,
  pick: async () => null,
  requestDrop: async () => false,
  raise: async () => false,
  keepWaiting: async () => false,
  cancel: async () => undefined,
  select: async () => false,
};

const BookingContext = createContext<BookingApi>(disabledBooking);

export function useBooking(): BookingApi {
  return useContext(BookingContext);
}

function problem(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Try again.';
}

function readCoords(): Promise<Pickup | null> {
  const geo = globalThis.navigator?.geolocation;
  if (!geo) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'Your location',
        }),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 8_000 },
    );
  });
}

export function BookingProvider({
  client,
  children,
}: {
  client: DropSupabase | null;
  children: ReactNode;
}) {
  const mapsKey = readGoogleMapsKey({
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  });
  const [pickup, setPickup] = useState<Pickup>({
    lat: ikejaTestPickup.lat,
    lng: ikejaTestPickup.lng,
    label: ikejaTestPickup.label,
  });
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<BookingPlace[]>([]);
  const [destination, setDestination] = useState<BookingPlace | null>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [quote, setQuote] = useState<ServerFareQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [radiusM, setRadiusM] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [recipientCount, setRecipientCount] = useState(0);
  const [offers, setOffers] = useState<LiveOffer[]>([]);
  const [chosen, setChosen] = useState<ChosenRider | null>(null);
  const sessionToken = useRef(crypto.randomUUID());
  const choosing = useRef(false);

  useEffect(() => {
    if (!client) {
      return undefined;
    }
    let active = true;
    void readCoords().then((next) => {
      if (active && next) {
        setPickup(next);
      }
    });
    return () => {
      active = false;
    };
  }, [client]);

  useEffect(() => {
    if (!client || !mapsKey || !placesQueryReady(query)) {
      return undefined;
    }
    const handle = setTimeout(() => {
      void googlePlaceSuggestions(mapsKey, query, sessionToken.current, pickup).then((rows) => {
        setRemote(
          rows.map((row) => ({ id: `g:${row.id}`, name: row.label, detail: 'Google Maps' })),
        );
      });
    }, PLACES_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [client, mapsKey, pickup, query]);

  useEffect(() => {
    if (!client || !requestId) {
      return undefined;
    }
    let active = true;
    const load = async () => {
      try {
        const rows = await listRideOffers(client, requestId);
        if (active) {
          setOffers(rows);
        }
        if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
          await expireMatching(client);
        }
      } catch (loadError) {
        if (active) {
          setError(problem(loadError));
        }
      }
    };
    void load();
    const poll = setInterval(() => void load(), 3_000);
    const stop = watchRequest(client, requestId, () => void load());
    return () => {
      active = false;
      clearInterval(poll);
      stop();
    };
  }, [client, expiresAt, requestId]);

  const results = useMemo(() => {
    const google = placesQueryReady(query) ? remote : [];
    if (google.length > 0) {
      return google;
    }
    return filterSampleDestinations(query).map((place) => ({
      id: place.id,
      name: place.name,
      detail: place.detail,
    }));
  }, [query, remote]);

  const api = useMemo<BookingApi>(() => {
    async function quoteFor(dropoff: { lat: number; lng: number }, from: Pickup) {
      if (!client) {
        return null;
      }
      if (mapsKey) {
        const road = await googleRoadDistanceM(mapsKey, from, dropoff);
        if (road != null) {
          try {
            await cacheRoadDistance(client, from, dropoff, road);
          } catch {
            // The server keeps its own estimate when the road distance looks wrong.
          }
        }
      }
      return fareQuote(client, from, dropoff);
    }

    if (!client) {
      return disabledBooking;
    }
    return {
      enabled: true,
      pickupLabel: pickup.label,
      destination,
      quote,
      results,
      busy,
      error,
      requestId,
      radiusM,
      expiresAt,
      recipientCount,
      offers,
      chosen,
      setQuery: (value) => {
        setQuery(value);
        setError(null);
      },
      pick: async (id) => {
        setBusy(true);
        setError(null);
        try {
          let dropoff: { lat: number; lng: number } | null = null;
          let place: BookingPlace | null = null;
          if (id.startsWith('g:')) {
            const detail = await googlePlaceDetail(
              mapsKey ?? '',
              id.slice(2),
              sessionToken.current,
            );
            sessionToken.current = crypto.randomUUID();
            if (!detail) {
              setError('That place did not load. Try another.');
              return null;
            }
            dropoff = { lat: detail.lat, lng: detail.lng };
            place = { id, name: detail.label, detail: 'From Google Maps' };
          } else {
            const sample = sampleDestinationById(id);
            if (!sample) {
              return null;
            }
            dropoff = { lat: sample.lat, lng: sample.lng };
            place = { id: sample.id, name: sample.name, detail: sample.detail };
          }
          let nextQuote: ServerFareQuote | null;
          try {
            nextQuote = await quoteFor(dropoff, pickup);
          } catch (quoteError) {
            const message = problem(quoteError);
            if (message.includes('pickup is outside')) {
              const fallback: Pickup = {
                lat: ikejaTestPickup.lat,
                lng: ikejaTestPickup.lng,
                label: ikejaTestPickup.label,
              };
              setPickup(fallback);
              nextQuote = await quoteFor(dropoff, fallback);
              setError(
                'Your location is outside the service area, so pickup is Allen Avenue for now.',
              );
            } else {
              throw quoteError;
            }
          }
          if (!nextQuote) {
            setError('Could not price this trip.');
            return null;
          }
          setDestination(place);
          setPoint(dropoff);
          setQuote(nextQuote);
          return nextQuote;
        } catch (pickError) {
          setError(problem(pickError));
          return null;
        } finally {
          setBusy(false);
        }
      },
      requestDrop: async (offerKobo, note) => {
        if (!point || !destination) {
          setError('Choose a destination first.');
          return false;
        }
        setBusy(true);
        setError(null);
        try {
          const created = await createRideRequest(client, {
            pickup,
            pickupNote: note.slice(0, 280),
            dropoff: point,
            dropoffLabel: destination.name,
            offerKobo,
          });
          setRequestId(created.requestId);
          setRadiusM(created.radiusM);
          setExpiresAt(created.expiresAt);
          setRecipientCount(created.recipientCount);
          setOffers([]);
          setChosen(null);
          return true;
        } catch (requestError) {
          setError(problem(requestError));
          return false;
        } finally {
          setBusy(false);
        }
      },
      raise: async (offerKobo) => {
        if (!requestId) {
          return false;
        }
        setBusy(true);
        setError(null);
        try {
          const raised = await raiseRideOffer(client, requestId, offerKobo);
          setRadiusM(raised.radiusM);
          setExpiresAt(raised.expiresAt);
          setRecipientCount((count) => count + raised.recipientCount);
          return true;
        } catch (raiseError) {
          setError(problem(raiseError));
          return false;
        } finally {
          setBusy(false);
        }
      },
      keepWaiting: async () => {
        if (!requestId) {
          return false;
        }
        setBusy(true);
        setError(null);
        try {
          const extended = await extendRideSearch(client, requestId);
          setRadiusM(extended.radiusM);
          setExpiresAt(extended.expiresAt);
          setRecipientCount((count) => count + extended.recipientCount);
          return true;
        } catch (waitError) {
          setError(problem(waitError));
          return false;
        } finally {
          setBusy(false);
        }
      },
      cancel: async () => {
        if (!requestId) {
          return;
        }
        try {
          await cancelRideRequest(client, requestId);
        } catch (cancelError) {
          setError(problem(cancelError));
        } finally {
          setRequestId(null);
          setOffers([]);
          setChosen(null);
        }
      },
      select: async (offerId) => {
        if (choosing.current) {
          return false;
        }
        choosing.current = true;
        setBusy(true);
        setError(null);
        try {
          const trip = await selectRideOffer(client, offerId);
          const offer =
            offers.find((item) => item.id === offerId) ??
            ({
              id: offerId,
              riderId: trip.riderId,
              name: 'Your rider',
              rating: 0,
              rides: 0,
              plate: 'Check the plate',
              colour: 'Yellow',
              etaS: 0,
              seats: 0,
              amountKobo: trip.agreedFareKobo,
              kind: 'accept',
              status: 'selected',
              expiresAt: new Date().toISOString(),
            } satisfies LiveOffer);
          setChosen({
            offerId,
            pin: trip.pin,
            agreedFareKobo: trip.agreedFareKobo,
            offer: { ...offer, amountKobo: trip.agreedFareKobo, status: 'selected' },
          });
          setRequestId(null);
          return true;
        } catch (selectError) {
          setError(problem(selectError));
          return false;
        } finally {
          choosing.current = false;
          setBusy(false);
        }
      },
    };
  }, [
    busy,
    chosen,
    client,
    destination,
    error,
    expiresAt,
    mapsKey,
    offers,
    pickup,
    point,
    quote,
    radiusM,
    recipientCount,
    requestId,
    results,
  ]);

  return <BookingContext.Provider value={api}>{children}</BookingContext.Provider>;
}
