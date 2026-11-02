import { defaultQuote, festacFareRule, quoteForPlace, rebookPlaceId } from '@drop/shared';
import { describe, expect, it } from 'vitest';

import {
  passengerReducer,
  passengerRoutes,
  seedPassenger,
  selectedOffer,
  stepOffer,
  visibleOffers,
} from './flow';

describe('passenger prototype flow', () => {
  it('lists every core screen', () => {
    expect(passengerRoutes).toEqual([
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
    ]);
  });

  it('walks the happy path from Where to? through rating', () => {
    let state = seedPassenger('home');
    state = passengerReducer(state, { type: 'openSearch' });
    state = passengerReducer(state, { type: 'pickPlace', id: 'alaba' });
    expect(state.route).toBe('fare');
    expect(state.offerKobo).toBe(defaultQuote().midpointKobo);

    state = passengerReducer(state, { type: 'request' });
    expect(state.route).toBe('searching');
    state = passengerReducer(state, { type: 'showOffers' });
    expect(state.route).toBe('offers');
    expect(visibleOffers(state)).toHaveLength(3);

    state = passengerReducer(state, { type: 'chooseOffer', id: 'adaeze' });
    state = passengerReducer(state, { type: 'confirmOffer' });
    expect(state.route).toBe('arriving');
    expect(selectedOffer(state)?.plate).toBe('FKJ-214LA');

    state = passengerReducer(state, { type: 'demoBoarded' });
    state = passengerReducer(state, { type: 'demoArrived' });
    expect(state.route).toBe('cash');
    expect(state.paid).toBe(false);
    state = passengerReducer(state, { type: 'demoPaid' });
    state = passengerReducer(state, { type: 'setStars', stars: 5 });
    state = passengerReducer(state, { type: 'toggleTag', tag: 'Safe' });
    state = passengerReducer(state, { type: 'finish' });
    expect(state.route).toBe('home');
    expect(state.placeId).toBeNull();
  });

  it('does not let the fare step under the minimum', () => {
    const min = festacFareRule.minKobo;
    expect(stepOffer(min, -1, min)).toBe(min);
    expect(stepOffer(min, 1, min)).toBe(min + 5_000);
  });

  it('refuses a restricted road and explains the next step', () => {
    const state = passengerReducer(seedPassenger('search'), { type: 'pickPlace', id: 'bridge' });
    expect(state.route).toBe('search');
    expect(state.notice).toMatch(/service area/);
  });

  it('auto-accept locks the first rider at the offered price', () => {
    let state = passengerReducer(seedPassenger('fare'), { type: 'toggleAutoAccept' });
    state = passengerReducer(state, { type: 'request' });
    state = passengerReducer(state, { type: 'showOffers' });
    expect(state.route).toBe('arriving');
    expect(state.offerId).toBe('adaeze');
    expect(selectedOffer(state)?.kind).toBe('accept');
  });

  it('offers notify me when the area is quiet, and raise fare when nobody answers', () => {
    let state = passengerReducer(seedPassenger('home'), { type: 'setArea', area: 'satellite' });
    expect(state.route).toBe('quiet');
    state = passengerReducer(state, { type: 'notify' });
    expect(state.notified).toBe(true);

    state = passengerReducer(seedPassenger('offers'), { type: 'noOffers' });
    const before = state.offerKobo;
    state = passengerReducer(state, { type: 'raise', naira: 100 });
    expect(state.offerKobo).toBe(before + 10_000);
    expect(state.route).toBe('searching');
  });

  it('rebooks the last trip onto the fare sheet', () => {
    const state = passengerReducer(seedPassenger('home'), { type: 'rebook' });
    expect(state.route).toBe('fare');
    expect(state.placeId).toBe(rebookPlaceId);
    expect(state.offerKobo).toBe(quoteForPlace(rebookPlaceId)?.midpointKobo);
  });

  it('asks for a name before booking for someone else', () => {
    let state = passengerReducer(seedPassenger('fare'), { type: 'setForOther' });
    state = passengerReducer(state, { type: 'request' });
    expect(state.route).toBe('fare');
    expect(state.notice).toMatch(/first name/);
  });

  it('moves to the empty-offer sheet after every card is declined', () => {
    let state = seedPassenger('offers');
    for (const id of ['adaeze', 'chinedu', 'ibrahim']) {
      state = passengerReducer(state, { type: 'declineOffer', id });
    }
    expect(state.route).toBe('noOffers');
    expect(visibleOffers(state)).toHaveLength(0);
  });
});
