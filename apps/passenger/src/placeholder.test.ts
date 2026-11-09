import { product } from '@drop/shared';
import { colors } from '@drop/ui-tokens';
import { describe, expect, it } from 'vitest';

describe('passenger placeholder', () => {
  it('uses the DROP name on the dark yellow theme', () => {
    expect(product.name).toBe('DROP');
    expect(colors.bg).toBe('#09090B');
    expect(colors.primary).toBe('#FFC629');
  });
});
