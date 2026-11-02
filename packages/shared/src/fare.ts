import { z } from 'zod';

import { FareError, FARE_STEP_KOBO, assertKobo, roundToStep } from './money';

export const fareRuleSchema = z.object({
  baseKobo: z.number().int().nonnegative(),
  perKmKobo: z.number().int().nonnegative(),
  minKobo: z.number().int().nonnegative(),
  rangeLowPct: z.number().min(0).max(100),
  rangeHighPct: z.number().min(0).max(100),
});

export type FareRule = z.infer<typeof fareRuleSchema>;

export const fareQuoteSchema = z.object({
  distanceM: z.number().int().nonnegative(),
  rawKobo: z.number().int().nonnegative(),
  midpointKobo: z.number().int().nonnegative(),
  suggestedLowKobo: z.number().int().nonnegative(),
  suggestedHighKobo: z.number().int().nonnegative(),
  minKobo: z.number().int().nonnegative(),
});

export type FareQuote = z.infer<typeof fareQuoteSchema>;

/**
 * Suggested fare for a direct Drop.
 *
 * raw = base + rounded(distance_m * per_km / 1000)
 * midpoint = max(minimum, raw rounded to ₦50)
 * The low and high ends are that midpoint moved by range_low_pct and
 * range_high_pct, then rounded to ₦50. The low end never goes under the
 * minimum or above the midpoint.
 */
export function quoteFare(distanceM: number, rule: FareRule): FareQuote {
  if (!Number.isInteger(distanceM) || distanceM < 0) {
    throw new FareError('distance must be a whole number of metres, zero or more');
  }

  const parsed = fareRuleSchema.parse(rule);
  const rawKobo = parsed.baseKobo + Math.round((distanceM * parsed.perKmKobo) / 1000);
  const midpointKobo = Math.max(parsed.minKobo, roundToStep(rawKobo, FARE_STEP_KOBO));
  const lowUnrounded = Math.round((midpointKobo * (100 - parsed.rangeLowPct)) / 100);
  const highUnrounded = Math.round((midpointKobo * (100 + parsed.rangeHighPct)) / 100);
  let suggestedLowKobo = Math.max(parsed.minKobo, roundToStep(lowUnrounded, FARE_STEP_KOBO));
  let suggestedHighKobo = Math.max(midpointKobo, roundToStep(highUnrounded, FARE_STEP_KOBO));

  if (suggestedLowKobo > midpointKobo) {
    suggestedLowKobo = midpointKobo;
  }
  if (suggestedHighKobo < midpointKobo) {
    suggestedHighKobo = midpointKobo;
  }

  return fareQuoteSchema.parse({
    distanceM,
    rawKobo,
    midpointKobo,
    suggestedLowKobo,
    suggestedHighKobo,
    minKobo: parsed.minKobo,
  });
}

export function assertPassengerOffer(offerKobo: number, minKobo: number): void {
  assertKobo(offerKobo, 'offer');
  assertKobo(minKobo, 'minimum');
  if (offerKobo < minKobo) {
    throw new FareError('offer is below the minimum fare');
  }
}

export function assertRiderOffer(input: {
  type: 'accept' | 'counter';
  amountKobo: number;
  passengerOfferKobo: number;
}): void {
  assertKobo(input.amountKobo, 'amount');
  assertKobo(input.passengerOfferKobo, 'passenger offer');
  if (input.type === 'accept' && input.amountKobo !== input.passengerOfferKobo) {
    throw new FareError('an accept offer must match the passenger offer');
  }
  if (input.type === 'counter' && input.amountKobo <= input.passengerOfferKobo) {
    throw new FareError('a counter offer must be higher than the passenger offer');
  }
}
