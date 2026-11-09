import { describe, expect, it } from 'vitest';

import { canRequestPickup } from './pickup';

describe('connected pickup', () => {
  it('blocks a request from the unconfirmed sample point', () => {
    expect(canRequestPickup('sample')).toBe(false);
  });

  it('allows a device fix and an explicit sample confirmation', () => {
    expect(canRequestPickup('device')).toBe(true);
    expect(canRequestPickup('confirmed-sample')).toBe(true);
  });
});
