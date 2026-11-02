import { readInitialScreen } from '@drop/ui';
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';

import {
  passengerReducer,
  passengerRoutes,
  seedPassenger,
  type PassengerAction,
  type PassengerState,
} from './flow';

type PassengerApi = {
  state: PassengerState;
  dispatch: Dispatch<PassengerAction>;
};

const PassengerContext = createContext<PassengerApi | null>(null);

export function PassengerProvider({ children }: { children: ReactNode }) {
  const initial = readInitialScreen(passengerRoutes, 'home');
  const [state, dispatch] = useReducer(passengerReducer, initial, seedPassenger);

  useEffect(() => {
    if (!state.live || state.route !== 'searching') {
      return undefined;
    }
    const timer = setTimeout(() => {
      dispatch({ type: 'showOffers' });
    }, 1100);
    return () => clearTimeout(timer);
  }, [state.live, state.route]);

  return (
    <PassengerContext.Provider value={{ state, dispatch }}>{children}</PassengerContext.Provider>
  );
}

export function usePassenger(): PassengerApi {
  const value = useContext(PassengerContext);
  if (!value) {
    throw new Error('usePassenger must be used inside PassengerProvider');
  }
  return value;
}
