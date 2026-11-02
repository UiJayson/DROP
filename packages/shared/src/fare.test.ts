import { describe, expect, it } from 'vitest';

import { assertPassengerOffer, assertRiderOffer, quoteFare } from './fare';
import { FareError, formatNaira, nairaToKobo } from './money';

const ikejaRule = {
  baseKobo: 20_000,
  perKmKobo: 15_000,
  minKobo: 30_000,
  rangeLowPct: 10,
  rangeHighPct: 25,
};

describe('quoteFare', () => {
  it('uses the minimum when a short trip would otherwise be cheaper', () => {
    const quote = quoteFare(0, ikejaRule);
    expect(quote.rawKobo).toBe(20_000);
    expect(quote.midpointKobo).toBe(30_000);
    expect(quote.suggestedLowKobo).toBe(30_000);
    expect(quote.suggestedHighKobo).toBe(40_000);
    expect(quote.minKobo).toBe(30_000);
  });

  it('prices distance in whole kobo and keeps the range on ₦50 steps', () => {
    const quote = quoteFare(2_000, ikejaRule);
    expect(quote.rawKobo).toBe(50_000);
    expect(quote.midpointKobo).toBe(50_000);
    expect(quote.suggestedLowKobo).toBe(45_000);
    expect(quote.suggestedHighKobo).toBe(65_000);
    for (const amount of [quote.suggestedLowKobo, quote.midpointKobo, quote.suggestedHighKobo]) {
      expect(amount % 5_000).toBe(0);
    }
  });

  it('never lets the suggested low drop below the minimum', () => {
    const quote = quoteFare(2_000, { ...ikejaRule, minKobo: 48_000, rangeLowPct: 20 });
    expect(quote.suggestedLowKobo).toBeGreaterThanOrEqual(quote.minKobo);
    expect(quote.suggestedLowKobo).toBeLessThanOrEqual(quote.midpointKobo);
    expect(quote.suggestedHighKobo).toBeGreaterThanOrEqual(quote.midpointKobo);
  });

  it('rejects a negative distance and a negative base fare', () => {
    expect(() => quoteFare(-1, ikejaRule)).toThrow(FareError);
    expect(() => quoteFare(100, { ...ikejaRule, baseKobo: -1 })).toThrow();
  });
});

describe('offer checks', () => {
  it('rejects an offer below the minimum', () => {
    expect(() => assertPassengerOffer(29_999, 30_000)).toThrow(/below the minimum/);
    expect(() => assertPassengerOffer(30_000, 30_000)).not.toThrow();
  });

  it('requires an accept to match and a counter to be higher', () => {
    expect(() =>
      assertRiderOffer({ type: 'accept', amountKobo: 35_000, passengerOfferKobo: 40_000 }),
    ).toThrow(/must match/);
    expect(() =>
      assertRiderOffer({ type: 'counter', amountKobo: 40_000, passengerOfferKobo: 40_000 }),
    ).toThrow(/higher than/);
    expect(() =>
      assertRiderOffer({ type: 'counter', amountKobo: 45_000, passengerOfferKobo: 40_000 }),
    ).not.toThrow();
  });

  it('rejects fractional kobo', () => {
    expect(() => assertPassengerOffer(30_000.5, 30_000)).toThrow(FareError);
  });
});

describe('naira formatting', () => {
  it('converts naira to kobo and formats whole naira', () => {
    expect(nairaToKobo(300)).toBe(30_000);
    expect(formatNaira(20_000)).toBe('₦200');
    expect(formatNaira(150_000)).toBe('₦1,500');
    expect(formatNaira(30_050)).toBe('₦300.50');
  });
});
