import { describe, expect, it } from 'vitest';

import { formatNaira } from './money';
import { haversineM } from './matching';
import {
  BOARDING_PIN,
  buildOffers,
  defaultPlaceId,
  defaultQuote,
  festacFareRule,
  filterPlaces,
  pickup,
  placeById,
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

  it('pins the Festac story on the real places those names refer to', () => {
    const drop = placeById(defaultPlaceId);
    expect(drop?.name).toBe('Alaba International');
    expect(pickup.lat).toBeGreaterThan(6.4);
    expect(pickup.lat).toBeLessThan(6.5);
    expect(pickup.lng).toBeGreaterThan(3.2);
    expect(pickup.lng).toBeLessThan(3.35);
    expect(drop).toBeDefined();
    if (!drop) {
      return;
    }
    const metres = haversineM(pickup, drop);
    expect(metres).toBeGreaterThan(5_000);
    expect(metres).toBeLessThan(20_000);
  });
});
