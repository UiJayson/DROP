import {
  FARE_STEP_KOBO,
  buildOffers,
  defaultPlaceId,
  defaultQuote,
  nairaToKobo,
  pickup,
  placeById,
  quoteForPlace,
  rebookPlaceId,
  type PrototypeOffer,
} from '@drop/shared';

export const passengerRoutes = [
  'home',
  'quiet',
  'search',
  'fare',
  'searching',
  'offers',
  'noOffers',
  'offer',
  'arriving',
  'trip',
  'cash',
  'rate',
] as const;

export type PassengerRoute = (typeof passengerRoutes)[number];

export type PassengerState = {
  route: PassengerRoute;
  area: 'festac' | 'satellite';
  notified: boolean;
  query: string;
  placeId: string | null;
  forOther: boolean;
  riderFor: string;
  landmark: string;
  offerKobo: number;
  autoAccept: boolean;
  offerId: string | null;
  hiddenOfferIds: string[];
  live: boolean;
  paid: boolean;
  dispute: boolean;
  stars: number;
  tags: string[];
  notice: string | null;
};

export type PassengerAction =
  | { type: 'setArea'; area: 'festac' | 'satellite' }
  | { type: 'notify' }
  | { type: 'openSearch' }
  | { type: 'search'; query: string }
  | { type: 'pickPlace'; id: string }
  | { type: 'setRiderFor'; name: string }
  | { type: 'setForMe' }
  | { type: 'setForOther' }
  | { type: 'setLandmark'; note: string }
  | { type: 'stepFare'; direction: -1 | 1 }
  | { type: 'toggleAutoAccept' }
  | { type: 'request' }
  | { type: 'showOffers' }
  | { type: 'noOffers' }
  | { type: 'raise'; naira: 100 | 200 }
  | { type: 'keepWaiting' }
  | { type: 'chooseOffer'; id: string }
  | { type: 'declineOffer'; id: string }
  | { type: 'confirmOffer' }
  | { type: 'back' }
  | { type: 'cancel' }
  | { type: 'demoBoarded' }
  | { type: 'demoArrived' }
  | { type: 'demoPaid' }
  | { type: 'dispute' }
  | { type: 'setStars'; stars: number }
  | { type: 'toggleTag'; tag: string }
  | { type: 'finish' }
  | { type: 'rebook' }
  | { type: 'dismissNotice' };

const placedRoutes: readonly PassengerRoute[] = [
  'fare',
  'searching',
  'offers',
  'noOffers',
  'offer',
  'arriving',
  'trip',
  'cash',
  'rate',
];

function blankTrip(state: PassengerState): PassengerState {
  return {
    ...state,
    query: '',
    placeId: null,
    forOther: false,
    riderFor: '',
    landmark: pickup.note,
    offerKobo: defaultQuote().midpointKobo,
    autoAccept: false,
    offerId: null,
    hiddenOfferIds: [],
    live: false,
    paid: false,
    dispute: false,
    stars: 0,
    tags: [],
    notice: null,
  };
}

export function seedPassenger(route: PassengerRoute): PassengerState {
  const state: PassengerState = {
    route,
    area: route === 'quiet' ? 'satellite' : 'festac',
    notified: false,
    query: '',
    placeId: null,
    forOther: false,
    riderFor: '',
    landmark: pickup.note,
    offerKobo: defaultQuote().midpointKobo,
    autoAccept: false,
    offerId: null,
    hiddenOfferIds: [],
    live: false,
    paid: route === 'rate',
    dispute: false,
    stars: 0,
    tags: [],
    notice: null,
  };
  if (placedRoutes.includes(route)) {
    state.placeId = defaultPlaceId;
  }
  if (
    route === 'offer' ||
    route === 'arriving' ||
    route === 'trip' ||
    route === 'cash' ||
    route === 'rate'
  ) {
    state.offerId = 'adaeze';
  }
  return state;
}

export function visibleOffers(state: PassengerState): PrototypeOffer[] {
  return buildOffers(state.offerKobo).filter((offer) => !state.hiddenOfferIds.includes(offer.id));
}

export function selectedOffer(state: PassengerState): PrototypeOffer | undefined {
  if (!state.offerId) {
    return undefined;
  }
  return buildOffers(state.offerKobo).find((offer) => offer.id === state.offerId);
}

export function stepOffer(offerKobo: number, direction: -1 | 1, minKobo: number): number {
  const next = offerKobo + direction * FARE_STEP_KOBO;
  if (next < minKobo) {
    return offerKobo;
  }
  return next;
}

function parentRoute(state: PassengerState): PassengerRoute {
  switch (state.route) {
    case 'search':
      return state.area === 'satellite' ? 'quiet' : 'home';
    case 'fare':
      return 'search';
    case 'offer':
      return 'offers';
    case 'noOffers':
      return 'offers';
    case 'quiet':
      return 'home';
    default:
      return state.area === 'satellite' ? 'quiet' : 'home';
  }
}

export function passengerReducer(state: PassengerState, action: PassengerAction): PassengerState {
  switch (action.type) {
    case 'dismissNotice':
      return { ...state, notice: null };
    case 'setArea':
      return {
        ...state,
        area: action.area,
        route: action.area === 'satellite' ? 'quiet' : 'home',
        notified: action.area === 'festac' ? false : state.notified,
        notice: null,
      };
    case 'notify':
      return { ...state, notified: true };
    case 'openSearch':
      return { ...state, route: 'search', query: '', notice: null };
    case 'search':
      return { ...state, query: action.query, notice: null };
    case 'pickPlace': {
      const place = placeById(action.id);
      if (!place) {
        return state;
      }
      if (place.restricted) {
        return {
          ...state,
          notice: 'Kekes can’t run on this road. Choose a place inside the service area.',
        };
      }
      const quote = quoteForPlace(place.id);
      if (!quote) {
        return state;
      }
      return {
        ...state,
        placeId: place.id,
        offerKobo: quote.midpointKobo,
        route: 'fare',
        notice: null,
        offerId: null,
        hiddenOfferIds: [],
      };
    }
    case 'setRiderFor':
      return { ...state, riderFor: action.name };
    case 'setForMe':
      return { ...state, forOther: false, riderFor: '' };
    case 'setForOther':
      return { ...state, forOther: true };
    case 'setLandmark':
      return { ...state, landmark: action.note };
    case 'stepFare': {
      const quote = state.placeId ? quoteForPlace(state.placeId) : defaultQuote();
      return {
        ...state,
        offerKobo: stepOffer(
          state.offerKobo,
          action.direction,
          quote?.minKobo ?? defaultQuote().minKobo,
        ),
      };
    }
    case 'toggleAutoAccept':
      return { ...state, autoAccept: !state.autoAccept };
    case 'request': {
      if (!state.placeId) {
        return state;
      }
      if (state.forOther && state.riderFor.trim().length === 0) {
        return { ...state, notice: 'Add their first name, or choose For me.' };
      }
      return {
        ...state,
        route: 'searching',
        live: true,
        hiddenOfferIds: [],
        offerId: null,
        notice: null,
      };
    }
    case 'showOffers': {
      if (state.route !== 'searching') {
        return state;
      }
      if (state.autoAccept) {
        const match = buildOffers(state.offerKobo).find((offer) => offer.kind === 'accept');
        return { ...state, route: 'arriving', live: false, offerId: match?.id ?? null };
      }
      return { ...state, route: 'offers', live: false };
    }
    case 'noOffers':
      return { ...state, route: 'noOffers', live: false };
    case 'raise':
      return {
        ...state,
        offerKobo: state.offerKobo + nairaToKobo(action.naira),
        route: 'searching',
        live: true,
        hiddenOfferIds: [],
        offerId: null,
        notice: null,
      };
    case 'keepWaiting':
      return { ...state, route: 'searching', live: true, notice: null };
    case 'chooseOffer':
      return { ...state, offerId: action.id, route: 'offer', notice: null };
    case 'declineOffer': {
      const hiddenOfferIds = state.hiddenOfferIds.includes(action.id)
        ? state.hiddenOfferIds
        : [...state.hiddenOfferIds, action.id];
      const remaining = buildOffers(state.offerKobo).filter(
        (offer) => !hiddenOfferIds.includes(offer.id),
      );
      return {
        ...state,
        hiddenOfferIds,
        route: remaining.length === 0 ? 'noOffers' : state.route,
        offerId: state.offerId === action.id ? null : state.offerId,
      };
    }
    case 'confirmOffer':
      if (!state.offerId) {
        return state;
      }
      return { ...state, route: 'arriving' };
    case 'back':
      return { ...state, route: parentRoute(state), notice: null };
    case 'cancel':
      return blankTrip({ ...state, route: state.area === 'satellite' ? 'quiet' : 'home' });
    case 'demoBoarded':
      return state.route === 'arriving' ? { ...state, route: 'trip' } : state;
    case 'demoArrived':
      return state.route === 'trip' ? { ...state, route: 'cash' } : state;
    case 'demoPaid':
      return { ...state, paid: true, dispute: false, route: 'rate', notice: null };
    case 'dispute':
      return {
        ...state,
        dispute: true,
        paid: false,
        route: 'rate',
        notice: 'Marked as not paid. DROP will review it with the rider.',
      };
    case 'setStars':
      return { ...state, stars: Math.min(5, Math.max(1, action.stars)) };
    case 'toggleTag': {
      const tags = state.tags.includes(action.tag)
        ? state.tags.filter((tag) => tag !== action.tag)
        : [...state.tags, action.tag];
      return { ...state, tags };
    }
    case 'finish':
      return blankTrip({ ...state, route: 'home', area: 'festac', notified: false });
    case 'rebook': {
      const quote = quoteForPlace(rebookPlaceId);
      if (!quote) {
        return state;
      }
      return {
        ...blankTrip(state),
        route: 'fare',
        area: 'festac',
        placeId: rebookPlaceId,
        offerKobo: quote.midpointKobo,
      };
    }
    default:
      return state;
  }
}
