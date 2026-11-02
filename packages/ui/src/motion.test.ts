import { describe, expect, it } from 'vitest';

import { enterSpring, pressInSpring, pressOutSpring } from './motion';

describe('spring feedback', () => {
  it('keeps press feedback on the native driver and short', () => {
    for (const spring of [pressInSpring, pressOutSpring, enterSpring]) {
      expect(spring.useNativeDriver).toBe(true);
      expect(spring.speed).toBeGreaterThan(10);
      expect(spring.bounciness).toBeLessThanOrEqual(8);
    }
    expect(pressInSpring.bounciness).toBe(0);
  });
});
