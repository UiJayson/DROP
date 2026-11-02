import { describe, expect, it } from 'vitest';

import { colors, lightColors } from './colors';
import { darkCssVariables } from './css';
import { radii, spacing, tapTarget } from './spacing';
import { typeScale } from './typography';

describe('design tokens', () => {
  it('uses the dark base and Keke Yellow from the UI doc', () => {
    expect(colors.bg).toBe('#0A0A0B');
    expect(colors.primary).toBe('#FFC629');
    expect(colors.onPrimary).toBe('#0A0A0B');
    expect(colors.gradTop).toBe('#1A1A1D');
    expect(colors.gradBottom).toBe('#0A0A0B');
    expect(colors.textPrimary).toBe('#F5F5F7');
    expect(colors.success).toBe('#34C77B');
    expect(colors.danger).toBe('#FF5A4F');
    expect(colors.warning).toBe('#FF9F0A');
  });

  it('keeps the light fallback for a later setting', () => {
    expect(lightColors.bg).toBe('#FFFFFF');
    expect(lightColors.surface).toBe('#F4F5F7');
    expect(lightColors.textPrimary).toBe('#111214');
    expect(lightColors.textSecondary).toBe('#5F6368');
    expect(lightColors.onPrimary).toBe('#0A0A0B');
  });

  it('matches the type scale, spacing grid, radii, and tap targets', () => {
    expect(typeScale.largeTitle).toEqual({ fontSize: 34, lineHeight: 41, fontWeight: '700' });
    expect(typeScale.body.fontSize).toBe(17);
    expect(typeScale.footnote.fontSize).toBe(13);
    expect(typeScale.fare).toEqual({ fontSize: 40, lineHeight: 48, fontWeight: '700' });
    expect(Object.values(spacing)).toEqual([4, 8, 12, 16, 24, 32, 48]);
    expect(radii.card).toBe(12);
    expect(radii.sheet).toBe(16);
    expect(tapTarget.minDp).toBe(48);
    expect(tapTarget.minPt).toBe(44);
    expect(tapTarget.riderPrimaryHeightDp).toBe(56);
  });

  it('exposes the dark colours as CSS variables', () => {
    const css = darkCssVariables();
    expect(css['--drop-bg']).toBe('#0A0A0B');
    expect(css['--drop-primary']).toBe('#FFC629');
  });
});
