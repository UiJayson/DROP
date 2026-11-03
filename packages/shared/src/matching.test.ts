import { describe, expect, it } from 'vitest';

import { quoteFare } from './fare';
import {
  MATCH_RADIUS_M,
  dropoffMinutes,
  etaMinutes,
  etaSeconds,
  fareOnStep,
  filterSampleDestinations,
  geohash,
  ikejaTestPickup,
  nextRadiusM,
  placesQueryReady,
  radiusSearchLabel,
  requestChannel,
  riderChannel,
  roadDistancePlausible,
  roundCoord,
  sampleDestinationById,
} from './matching';
import { festacFareRule } from './prototype';

describe('matching rules', () => {
  it('uses the 1.5 km, 3 km, then 5 km ladder', () => {
    expect(MATCH_RADIUS_M).toEqual([1_500, 3_000, 5_000]);
    expect(nextRadiusM(0)).toBe(1_500);
    expect(nextRadiusM(1_500)).toBe(3_000);
    expect(nextRadiusM(3_000)).toBe(5_000);
    expect(nextRadiusM(5_000)).toBe(5_000);
  });

  it('pads the ETA when the rider is already carrying passengers', () => {
    expect(etaSeconds(2_000, 0)).toEqual({ etaS: 400, padS: 0, carrying: false });
    expect(etaSeconds(2_000, 2)).toEqual({ etaS: 640, padS: 240, carrying: true });
    expect(dropoffMinutes(2)).toBe(4);
    expect(dropoffMinutes(0)).toBe(0);
    expect(etaMinutes(640)).toBe(11);
  });

  it('matches the published geohash for a known point', () => {
    expect(geohash(57.64911, 10.40744, 7)).toBe('u4pruyd');
    expect(geohash(ikejaTestPickup.lat, ikejaTestPickup.lng)).toHaveLength(7);
  });

  it('rejects a road distance that is shorter than the straight line', () => {
    expect(roadDistancePlausible(1_000, 800)).toBe(false);
    expect(roadDistancePlausible(1_000, 1_200)).toBe(true);
    expect(roadDistancePlausible(1_000, 4_000)).toBe(false);
    expect(roundCoord(6.614004)).toBe(6.614);
  });

  it('keeps fares on the ₦50 step and explains the search radius', () => {
    expect(fareOnStep(quoteFare(2_000, festacFareRule).minKobo)).toBe(true);
    expect(fareOnStep(31_000)).toBe(false);
    expect(radiusSearchLabel(null)).toMatch(/1\.5 km/);
    expect(radiusSearchLabel(3_000)).toMatch(/3 km/);
    expect(radiusSearchLabel(5_000)).toMatch(/5 km/);
    expect(placesQueryReady('ik')).toBe(false);
    expect(placesQueryReady('ike')).toBe(true);
    expect(requestChannel('abc')).toBe('request:abc');
    expect(riderChannel('abc')).toBe('rider:abc');
  });

  it('finds the Ikeja sample places, including the blocked one', () => {
    expect(filterSampleDestinations('').map((place) => place.id)).toEqual([
      'ikeja-mall',
      'computer-village',
    ]);
    expect(sampleDestinationById('restricted-block')?.lat).toBe(6.595);
    expect(filterSampleDestinations('restricted')).toHaveLength(1);
  });
});
