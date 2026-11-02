import { describe, expect, it } from 'vitest';

import { formatNaira } from './money';
import {
  BOARDING_PIN,
  buildOffers,
  defaultQuote,
  festacFareRule,
  filterPlaces,
  quoteForPlace,
} from './prototype';

describe('prototype scenario', () => {
  it('prices the Festac to Alaba drop on the seeded fare rule', () => {
    const quote = defaultQuote();
    expect(quote.minKobo).toBe(festacFareRule.minKobo);
    expect(quote.midpointKobo).toBeGreaterThanOrEqual(quote.suggestedLowKobo);
    expect(quote.suggestedHighKobo).toBeGreaterThanOrEqual(quote.midpointKobo);
    expect(quote.midpointKobo % 5_000).toBe(0);
    expect(formatNaira(quote.midpointKobo)).toMatch(/^₦/);
  });

  it('builds one accept and counters above the passenger offer, cheapest ETA first', () => {
    const quote = defaultQuote();
    const offers = buildOffers(quote.midpointKobo);
    expect(offers.map((offer) => offer.id)).toEqual(['adaeze', 'chinedu', 'ibrahim']);
    expect(offers[0]?.kind).toBe('accept');
    expect(offers[0]?.amountKobo).toBe(quote.midpointKobo);
    expect(offers[1]?.seats).toBe(2);
    expect(offers[1]?.amountKobo).toBeGreaterThan(quote.midpointKobo);
    expect(offers[2]?.amountKobo).toBeGreaterThan(quote.midpointKobo);
  });

  it('blocks a restricted landmark and still finds recents', () => {
    expect(quoteForPlace('bridge')).toBeUndefined();
    expect(filterPlaces('').every((place) => place.recent)).toBe(true);
    expect(filterPlaces('bridge').some((place) => place.restricted)).toBe(true);
  });

  it('shares one boarding PIN for both prototype apps', () => {
    expect(BOARDING_PIN).toBe('4821');
  });
});
