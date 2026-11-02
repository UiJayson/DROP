import { BOARDING_PIN, defaultQuote } from '@drop/shared';
import { describe, expect, it } from 'vitest';

import { riderReducer, riderRoutes, seedRider } from './flow';

describe('rider prototype flow', () => {
  it('lists the rider screens', () => {
    expect(riderRoutes).toEqual([
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
    ]);
  });

  it('accepts a DROP, checks the PIN, and confirms cash', () => {
    let state = seedRider('home');
    expect(state.online).toBe(true);
    expect(state.seats).toBe(2);
    state = riderReducer(state, { type: 'openRequest' });
    state = riderReducer(state, { type: 'accept' });
    expect(state.route).toBe('waiting');
    state = riderReducer(state, { type: 'demoChosen' });
    state = riderReducer(state, { type: 'arrived' });
    expect(state.route).toBe('pin');
    for (const digit of BOARDING_PIN) {
      state = riderReducer(state, { type: 'pinDigit', digit });
    }
    expect(state.route).toBe('trip');
    state = riderReducer(state, { type: 'endTrip' });
    state = riderReducer(state, { type: 'cashYes' });
    expect(state.cash).toBe('received');
    expect(state.route).toBe('rate');
    state = riderReducer(state, { type: 'setStars', stars: 5 });
    state = riderReducer(state, { type: 'finishRating' });
    expect(state.route).toBe('home');
    expect(state.completed).toBe(true);
  });

  it('locks the PIN after three wrong tries', () => {
    let state = seedRider('pin');
    for (let attempt = 0; attempt < 3; attempt += 1) {
      for (const digit of '0000') {
        state = riderReducer(state, { type: 'pinDigit', digit });
      }
    }
    expect(state.pinLocked).toBe(true);
    expect(state.route).toBe('pin');
    state = riderReducer(state, { type: 'pinDigit', digit: '4' });
    expect(state.pin).toBe('');
  });

  it('only sends a counter above the passenger offer', () => {
    const offer = defaultQuote().midpointKobo;
    let state = riderReducer(seedRider('request'), { type: 'openCounter' });
    state = riderReducer(state, { type: 'setCounter', amountKobo: offer });
    expect(state.counterKobo).toBe(offer + 10_000);
    state = riderReducer(state, { type: 'setCounter', amountKobo: offer + 20_000 });
    state = riderReducer(state, { type: 'sendCounter' });
    expect(state.route).toBe('waiting');
    expect(state.decision).toBe('counter');
  });

  it('lets a skip return home without a penalty, and blocks requests while offline', () => {
    const skipped = riderReducer(seedRider('request'), { type: 'skip' });
    expect(skipped.route).toBe('home');
    expect(skipped.notice).toMatch(/rating/);

    const offline = riderReducer(seedRider('home'), { type: 'toggleOnline' });
    expect(offline.route).toBe('offline');
    expect(riderReducer(offline, { type: 'openRequest' }).route).toBe('offline');
  });
});
