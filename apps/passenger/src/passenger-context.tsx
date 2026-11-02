import { readInitialScreen } from '@drop/ui';
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react';

import { useBooking } from './booking';
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
  const booking = useBooking();
  const initial = readInitialScreen(passengerRoutes, 'home');
  const [state, dispatch] = useReducer(passengerReducer, initial, seedPassenger);
  const autoTried = useRef<string | null>(null);

  useEffect(() => {
    if (booking.enabled) {
      return undefined;
    }
    if (!state.live || state.route !== 'searching') {
      return undefined;
    }
    const timer = setTimeout(() => {
      dispatch({ type: 'showOffers' });
    }, 1100);
    return () => clearTimeout(timer);
  }, [booking.enabled, state.live, state.route]);

  useEffect(() => {
    if (!booking.enabled || state.route !== 'searching') {
      return undefined;
    }
    const open = booking.offers.filter((offer) => offer.status === 'open');
    if (open.length === 0) {
      return undefined;
    }
    if (state.autoAccept) {
      const match = open.find((offer) => offer.kind === 'accept');
      if (!match || autoTried.current === match.id) {
        return undefined;
      }
      autoTried.current = match.id;
      void booking.select(match.id).then((ok) => {
        if (ok) {
          dispatch({ type: 'lockLiveOffer', id: match.id });
        }
      });
      return undefined;
    }
    dispatch({ type: 'showOffers' });
    return undefined;
  }, [booking, state.autoAccept, state.route]);

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
