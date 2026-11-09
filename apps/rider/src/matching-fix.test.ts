import { describe, expect, it } from 'vitest';

import { LOCATION_OFF_MESSAGE, matchingPing } from './matching-fix';

describe('rider matching location', () => {
  it('does not send a sample point when the phone has no fix', () => {
    expect(matchingPing(null)).toEqual({ send: false, message: LOCATION_OFF_MESSAGE });
  });

  it('sends the device fix when one exists', () => {
    expect(matchingPing({ lat: 6.601, lng: 3.351 })).toEqual({
      send: true,
      point: { lat: 6.601, lng: 3.351 },
    });
  });
});
