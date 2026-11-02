import { BOARDING_PIN, defaultQuote, FARE_STEP_KOBO } from '@drop/shared';

export const riderRoutes = [
  'home',
  'offline',
  'request',
  'counter',
  'waiting',
  'heading',
  'pin',
  'trip',
  'cash',
  'rate',
  'earnings',
] as const;

export type RiderRoute = (typeof riderRoutes)[number];
export type Seats = 0 | 1 | 2 | 3;

export type RiderState = {
  route: RiderRoute;
  online: boolean;
  seats: Seats;
  counterKobo: number;
  decision: 'none' | 'accept' | 'counter' | 'skip';
  pin: string;
  pinAttempts: number;
  pinLocked: boolean;
  pinError: string | null;
  cash: 'pending' | 'received' | 'unpaid';
  stars: number;
  completed: boolean;
  notice: string | null;
  live: boolean;
};

export type RiderAction =
  | { type: 'toggleOnline' }
  | { type: 'setSeats'; seats: Seats }
  | { type: 'openRequest' }
  | { type: 'accept' }
  | { type: 'openCounter' }
  | { type: 'setCounter'; amountKobo: number }
  | { type: 'stepCounter'; direction: -1 | 1 }
  | { type: 'sendCounter' }
  | { type: 'skip' }
  | { type: 'expire' }
  | { type: 'demoChosen' }
  | { type: 'arrived' }
  | { type: 'pinDigit'; digit: string }
  | { type: 'pinBack' }
  | { type: 'endTrip' }
  | { type: 'cashYes' }
  | { type: 'cashNo' }
  | { type: 'setStars'; stars: number }
  | { type: 'finishRating' }
  | { type: 'openEarnings' }
  | { type: 'closeEarnings' }
  | { type: 'backToRequest' }
  | { type: 'dismissNotice' };

const passengerOffer = () => defaultQuote().midpointKobo;

function fresh(route: RiderRoute, extras: Partial<RiderState> = {}): RiderState {
  return {
    route,
    online: route !== 'offline',
    seats: 2,
    counterKobo: passengerOffer() + 10_000,
    decision: 'none',
    pin: '',
    pinAttempts: 0,
    pinLocked: false,
    pinError: null,
    cash: route === 'rate' ? 'received' : 'pending',
    stars: 0,
    completed: route === 'earnings',
    notice: null,
    live: false,
    ...extras,
  };
}

export function seedRider(route: RiderRoute): RiderState {
  return fresh(route);
}

export function riderReducer(state: RiderState, action: RiderAction): RiderState {
  const offer = passengerOffer();
  switch (action.type) {
    case 'dismissNotice':
      return { ...state, notice: null };
    case 'toggleOnline': {
      const online = !state.online;
      return { ...state, online, route: online ? 'home' : 'offline', notice: null };
    }
    case 'setSeats':
      return { ...state, seats: action.seats };
    case 'openRequest':
      if (!state.online) {
        return state;
      }
      return { ...state, route: 'request', live: true, decision: 'none', notice: null };
    case 'accept':
      return { ...state, route: 'waiting', decision: 'accept', live: false };
    case 'openCounter':
      return { ...state, route: 'counter', counterKobo: offer + 10_000 };
    case 'setCounter':
      if (action.amountKobo <= offer) {
        return state;
      }
      return { ...state, counterKobo: action.amountKobo };
    case 'stepCounter': {
      const next = state.counterKobo + action.direction * FARE_STEP_KOBO;
      if (next <= offer) {
        return state;
      }
      return { ...state, counterKobo: next };
    }
    case 'sendCounter':
      if (state.counterKobo <= offer) {
        return state;
      }
      return { ...state, route: 'waiting', decision: 'counter', live: false };
    case 'skip':
      return fresh(state.online ? 'home' : 'offline', {
        online: state.online,
        seats: state.seats,
        notice: 'Skipped. Skipping does not change your rating.',
      });
    case 'expire':
      if (state.route !== 'request') {
        return state;
      }
      return fresh(state.online ? 'home' : 'offline', {
        online: state.online,
        seats: state.seats,
        notice: 'Request expired.',
      });
    case 'demoChosen':
      if (state.decision === 'none') {
        return state;
      }
      return { ...state, route: 'heading', notice: null };
    case 'arrived':
      return { ...state, route: 'pin', pin: '', pinError: null };
    case 'pinDigit': {
      if (state.pinLocked || state.pin.length >= 4) {
        return state;
      }
      const pin = `${state.pin}${action.digit}`;
      if (pin.length < 4) {
        return { ...state, pin, pinError: null };
      }
      if (pin === BOARDING_PIN) {
        return { ...state, pin, pinError: null, route: 'trip' };
      }
      const pinAttempts = state.pinAttempts + 1;
      if (pinAttempts >= 3) {
        return {
          ...state,
          pin: '',
          pinAttempts,
          pinLocked: true,
          pinError: 'Too many tries. Contact DROP support.',
        };
      }
      return {
        ...state,
        pin: '',
        pinAttempts,
        pinError: `Wrong PIN. ${3 - pinAttempts} tries left.`,
      };
    }
    case 'pinBack':
      if (state.pinLocked) {
        return state;
      }
      return { ...state, pin: state.pin.slice(0, -1), pinError: null };
    case 'endTrip':
      return { ...state, route: 'cash' };
    case 'cashYes':
      return { ...state, cash: 'received', route: 'rate', completed: true, notice: null };
    case 'cashNo':
      return {
        ...state,
        cash: 'unpaid',
        route: 'rate',
        completed: true,
        notice: 'Marked as not paid. DROP will follow up.',
      };
    case 'setStars':
      return { ...state, stars: Math.min(5, Math.max(1, action.stars)) };
    case 'finishRating':
      return fresh('home', {
        online: true,
        seats: state.seats,
        completed: true,
        notice: 'Trip saved.',
      });
    case 'openEarnings':
      return { ...state, route: 'earnings' };
    case 'closeEarnings':
      return { ...state, route: state.online ? 'home' : 'offline' };
    case 'backToRequest':
      return { ...state, route: 'request', live: false };
    default:
      return state;
  }
}
