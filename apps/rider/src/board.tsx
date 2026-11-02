import {
  listRiderInbox,
  pingRiderLocation,
  submitRideOffer,
  watchRider,
  withdrawRideOffer,
  type DropSupabase,
} from '@drop/api-client';
import { ikejaTestPickup, type RiderInboxItem } from '@drop/shared';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useRider } from './rider-context';

type BoardApi = {
  enabled: boolean;
  incoming: RiderInboxItem | null;
  outcome: 'selected' | 'lost' | null;
  skippedIds: string[];
  error: string | null;
  accept: () => Promise<string | null>;
  counter: (amountKobo: number) => Promise<string | null>;
  skip: () => void;
  withdraw: () => Promise<string | null>;
};

const disabledBoard: BoardApi = {
  enabled: false,
  incoming: null,
  outcome: null,
  skippedIds: [],
  error: null,
  accept: async () => null,
  counter: async () => null,
  skip: () => undefined,
  withdraw: async () => null,
};

const BoardContext = createContext<BoardApi>(disabledBoard);

export function useBoard(): BoardApi {
  return useContext(BoardContext);
}

function problem(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Try again.';
}

function readCoords(): Promise<{ lat: number; lng: number } | null> {
  const geo = globalThis.navigator?.geolocation;
  if (!geo) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 20_000, timeout: 8_000 },
    );
  });
}

export function BoardProvider({
  client,
  riderId,
  children,
}: {
  client: DropSupabase;
  riderId: string;
  children: ReactNode;
}) {
  const { state } = useRider();
  const [rows, setRows] = useState<RiderInboxItem[]>([]);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);

  useEffect(() => {
    if (!state.online) {
      return undefined;
    }
    let active = true;
    const load = async () => {
      try {
        const next = await listRiderInbox(client);
        const now = Date.now();
        if (active) {
          setRows(
            next.filter(
              (row) =>
                row.myOfferStatus === 'selected' ||
                row.myOfferStatus === 'rejected' ||
                row.myOfferStatus === 'expired' ||
                Date.parse(row.expiresAt) > now,
            ),
          );
        }
      } catch (loadError) {
        if (active) {
          setError(problem(loadError));
        }
      }
    };
    void load();
    const poll = setInterval(() => void load(), 3_000);
    const stop = watchRider(client, riderId, () => void load());
    return () => {
      active = false;
      clearInterval(poll);
      stop();
    };
  }, [client, riderId, state.online]);

  useEffect(() => {
    if (!state.online) {
      return undefined;
    }
    let active = true;
    const send = async () => {
      const located = await readCoords();
      const point = located ?? { lat: ikejaTestPickup.lat, lng: ikejaTestPickup.lng };
      if (!active) {
        return;
      }
      if (!located) {
        setError('Location is off, so you are shown at Allen Avenue, Ikeja.');
      }
      try {
        await pingRiderLocation(client, point);
      } catch (pingError) {
        if (active) {
          setError(problem(pingError));
        }
      }
    };
    void send();
    const poll = setInterval(() => void send(), 30_000);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [client, state.online]);

  const incoming =
    rows.find((row) => !skippedIds.includes(row.requestId) && row.myOfferStatus == null) ?? null;
  const watched = rows.find(
    (row) => row.myOfferId && row.myOfferStatus && row.myOfferStatus !== 'withdrawn',
  );
  const outcome =
    watched?.myOfferStatus === 'selected'
      ? 'selected'
      : watched?.myOfferStatus === 'rejected' || watched?.myOfferStatus === 'expired'
        ? 'lost'
        : null;

  const api = useMemo<BoardApi>(() => {
    const current = incoming;
    return {
      enabled: true,
      incoming: current,
      outcome,
      skippedIds,
      error,
      accept: async () => {
        if (!current) {
          return 'That request is gone.';
        }
        try {
          const sent = await submitRideOffer(
            client,
            current.requestId,
            'accept',
            current.offerKobo,
          );
          setOfferId(sent.offerId);
          setError(null);
          return null;
        } catch (acceptError) {
          const message = problem(acceptError);
          setError(message);
          return message;
        }
      },
      counter: async (amountKobo) => {
        if (!current) {
          return 'That request is gone.';
        }
        try {
          const sent = await submitRideOffer(client, current.requestId, 'counter', amountKobo);
          setOfferId(sent.offerId);
          setError(null);
          return null;
        } catch (counterError) {
          const message = problem(counterError);
          setError(message);
          return message;
        }
      },
      skip: () => {
        if (current) {
          setSkippedIds((ids) =>
            ids.includes(current.requestId) ? ids : [...ids, current.requestId],
          );
        }
      },
      withdraw: async () => {
        const id = offerId ?? current?.myOfferId;
        if (!id) {
          return null;
        }
        try {
          await withdrawRideOffer(client, id);
          setOfferId(null);
          if (current) {
            setSkippedIds((ids) => [...ids, current.requestId]);
          }
          return null;
        } catch (withdrawError) {
          const message = problem(withdrawError);
          setError(message);
          return message;
        }
      },
    };
  }, [client, error, incoming, offerId, outcome, skippedIds]);

  return <BoardContext.Provider value={api}>{children}</BoardContext.Provider>;
}
