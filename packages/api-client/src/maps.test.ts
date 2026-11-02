import { describe, expect, it } from 'vitest';

import {
  googleRoadDistanceM,
  parsePlaceDetail,
  parsePlaceSuggestions,
  parseRoutesDistance,
} from './maps';

describe('Google Maps payloads', () => {
  it('reads a road distance and ignores an empty route', () => {
    expect(parseRoutesDistance({ routes: [{ distanceMeters: 2400.4 }] })).toBe(2400);
    expect(parseRoutesDistance({ routes: [] })).toBeNull();
    expect(parseRoutesDistance(null)).toBeNull();
  });

  it('reads place suggestions and a place location', () => {
    expect(
      parsePlaceSuggestions({
        suggestions: [
          { placePrediction: { placeId: 'abc', text: { text: 'Ikeja City Mall' } } },
          { placePrediction: { placeId: '', text: { text: 'Skip' } } },
        ],
      }),
    ).toEqual([{ id: 'abc', label: 'Ikeja City Mall' }]);
    expect(
      parsePlaceDetail('abc', {
        location: { latitude: 6.616, longitude: 3.351 },
        displayName: { text: 'Ikeja City Mall' },
      }),
    ).toEqual({ id: 'abc', label: 'Ikeja City Mall', lat: 6.616, lng: 3.351 });
  });

  it('does not call the network without a key', async () => {
    let called = false;
    const distance = await googleRoadDistanceM(
      '  ',
      { lat: 6.6, lng: 3.3 },
      { lat: 6.62, lng: 3.35 },
      () => {
        called = true;
        return Promise.resolve({ ok: false, json: async () => null });
      },
    );
    expect(distance).toBeNull();
    expect(called).toBe(false);
  });
});
