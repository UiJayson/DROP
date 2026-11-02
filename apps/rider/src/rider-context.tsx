import { readInitialScreen } from '@drop/ui';
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';

import { riderReducer, riderRoutes, seedRider, type RiderAction, type RiderState } from './flow';

type RiderApi = {
  state: RiderState;
  dispatch: Dispatch<RiderAction>;
};

const RiderContext = createContext<RiderApi | null>(null);

export function RiderProvider({ children }: { children: ReactNode }) {
  const initial = readInitialScreen(riderRoutes, 'home');
  const [state, dispatch] = useReducer(riderReducer, initial, seedRider);
  return <RiderContext.Provider value={{ state, dispatch }}>{children}</RiderContext.Provider>;
}

export function useRider(): RiderApi {
  const value = useContext(RiderContext);
  if (!value) {
    throw new Error('useRider must be used inside RiderProvider');
  }
  return value;
}
