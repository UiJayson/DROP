import {
  cancelTrip,
  completeTrip,
  loadTrip,
  markArrived,
  startTrip,
  updateTripLocation,
  watchTrip,
  type DropSupabase,
} from '@drop/api-client';
import type { LatLng, LiveTrip, TripLocationSource } from '@drop/shared';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type TripApi = {
  enabled: boolean;
  trip: LiveTrip | null;
  error: string | null;
  busy: boolean;
  arrive: () => Promise<void>;
  submitPin: (pin: string) => Promise<string | null>;
  complete: () => Promise<void>;
  cancel: (reason: string, confirmStarted: boolean) => Promise<string | null>;
  sendLocation: (point: LatLng, source: TripLocationSource) => Promise<void>;
  dismiss: () => void;
};

const disabled: TripApi = {
  enabled: false,
  trip: null,
  error: null,
  busy: false,
  arrive: async () => undefined,
  submitPin: async () => null,
  complete: async () => undefined,
  cancel: async () => null,
  sendLocation: async () => undefined,
  dismiss: () => undefined,
};

const TripContext = createContext<TripApi>(disabled);

export function useTrip(): TripApi {
  return useContext(TripContext);
}

function problem(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Try again.';
}

function keepTerminal(current: LiveTrip | null, next: LiveTrip | null): LiveTrip | null {
  if (next) {
    return next;
  }
  if (current && (current.status === 'completed' || current.status === 'cancelled')) {
    return current;
  }
  return null;
}

export function TripProvider({ client, children }: { client: DropSupabase; children: ReactNode }) {
  const [trip, setTrip] = useState<LiveTrip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const next = await loadTrip(client);
        if (active) {
          setTrip((current) => keepTerminal(current, next));
        }
      } catch (loadError) {
        if (active) {
          setError(problem(loadError));
        }
      }
    };
    void load();
    const poll = setInterval(() => void load(), 4000);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [client]);

  const tripId = trip?.tripId ?? null;
  const status = trip?.status ?? null;

  useEffect(() => {
    if (!tripId || status === 'completed' || status === 'cancelled') {
      return undefined;
    }
    const refresh = () => {
      void loadTrip(client, tripId).then((next) => {
        if (next) {
          setTrip(next);
        }
      });
    };
    return watchTrip(client, tripId, refresh);
  }, [client, status, tripId]);

  const api = useMemo<TripApi>(() => {
    const run = async (work: () => Promise<LiveTrip | null>, fail: string) => {
      if (!trip) {
        return fail;
      }
      setBusy(true);
      setError(null);
      try {
        const next = await work();
        if (next) {
          setTrip(next);
        }
        return null;
      } catch (workError) {
        const message = problem(workError);
        setError(message);
        return message;
      } finally {
        setBusy(false);
      }
    };

    return {
      enabled: true,
      trip,
      error,
      busy,
      arrive: async () => {
        await run(() => markArrived(client, trip?.tripId ?? ''), 'There is no trip to update.');
      },
      submitPin: async (pin) => {
        if (!trip) {
          return 'There is no trip to start.';
        }
        setBusy(true);
        setError(null);
        try {
          const result = await startTrip(client, trip.tripId, pin);
          setTrip(result.trip);
          if (!result.ok) {
            setError(result.message);
            return result.message;
          }
          return null;
        } catch (pinError) {
          const message = problem(pinError);
          setError(message);
          return message;
        } finally {
          setBusy(false);
        }
      },
      complete: async () => {
        await run(() => completeTrip(client, trip?.tripId ?? ''), 'There is no trip to finish.');
      },
      cancel: (reason, confirmStarted) =>
        run(
          () => cancelTrip(client, trip?.tripId ?? '', reason, confirmStarted),
          'There is no trip to cancel.',
        ),
      sendLocation: async (point, source) => {
        if (!trip) {
          return;
        }
        try {
          await updateTripLocation(client, trip.tripId, point, source);
          const next = await loadTrip(client, trip.tripId);
          if (next) {
            setTrip(next);
          }
        } catch (locationError) {
          setError(problem(locationError));
        }
      },
      dismiss: () => {
        setTrip(null);
        setError(null);
      },
    };
  }, [busy, client, error, trip]);

  return <TripContext.Provider value={api}>{children}</TripContext.Provider>;
}
