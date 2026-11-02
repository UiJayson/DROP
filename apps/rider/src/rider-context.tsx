import { readInitialScreen } from '@drop/ui';
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';

import {
  riderReducer,
  riderRoutes,
  seedRider,
  type RiderAction,
  type RiderState,
  type Seats,
} from './flow';

type RiderApi = {
  state: RiderState;
  dispatch: Dispatch<RiderAction>;
};

const RiderContext = createContext<RiderApi | null>(null);

export function RiderProvider({
  startOffline = false,
  initialSeats,
  children,
}: {
  startOffline?: boolean;
  initialSeats?: Seats;
  children: ReactNode;
}) {
  const initial = startOffline ? 'offline' : readInitialScreen(riderRoutes, 'home');
  const [state, dispatch] = useReducer(
    riderReducer,
    { route: initial, seats: initialSeats },
    (seed: { route: (typeof riderRoutes)[number]; seats?: Seats }) =>
      seedRider(seed.route, seed.seats),
  );
  return <RiderContext.Provider value={{ state, dispatch }}>{children}</RiderContext.Provider>;
}

export function useRider(): RiderApi {
  const value = useContext(RiderContext);
  if (!value) {
    throw new Error('useRider must be used inside RiderProvider');
  }
  return value;
}
