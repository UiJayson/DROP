import { describe, expect, it } from 'vitest';

import { colors, lightColors, yellowMetallic } from './colors';
import { metalCta, surfaceGlow, vanta } from './vanta';
import { darkCssVariables } from './css';
import { radii, spacing, tapTarget } from './spacing';
import { fontFace, fontFallback, typeScale } from './typography';

describe('design tokens', () => {
  it('uses the dark base and Keke Yellow from the UI doc', () => {
    expect(colors.bg).toBe('#09090B');
    expect(colors.primary).toBe('#FFE14A');
    expect(colors.onPrimary).toBe('#101012');
    expect(colors.gradAccentTop).toBe('#FFF6B0');
    expect(colors.gradAccentBottom).toBe('#E09600');
    expect(colors.gradTop).toBe('#202024');
    expect(colors.gradMid).toBe('#111113');
    expect(colors.gradBottom).toBe('#09090B');
    expect(colors.textPrimary).toBe('#F5F5F7');
    expect(colors.textSecondary).toBe('#B7B7BF');
    expect(colors.success).toBe('#70DDA0');
    expect(colors.danger).toBe('#FF756B');
    expect(colors.warning).toBe('#FF9F0A');
  });

  it('keeps the light fallback for a later setting', () => {
    expect(lightColors.bg).toBe('#FFFFFF');
    expect(lightColors.surface).toBe('#F4F5F7');
    expect(lightColors.textPrimary).toBe('#111214');
    expect(lightColors.textSecondary).toBe('#5F6368');
    expect(lightColors.primary).toBe('#FFE14A');
    expect(lightColors.onPrimary).toBe('#101012');
    expect(yellowMetallic).toEqual(['#FFF6B0', '#FFE14A', '#F5B400', '#E09600']);
  });

  it('matches the type scale, spacing grid, radii, and tap targets', () => {
    expect(typeScale.display).toMatchObject({
      fontSize: 32,
      lineHeight: 36,
      fontWeight: '700',
      letterSpacing: -0.5,
      family: 'text',
    });
    expect(typeScale.title).toMatchObject({ fontSize: 22, lineHeight: 28, fontWeight: '600' });
    expect(typeScale.headline).toMatchObject({ fontSize: 17, lineHeight: 22, fontWeight: '600' });
    expect(typeScale.body).toMatchObject({ fontSize: 15, lineHeight: 21, fontWeight: '400' });
    expect(typeScale.label).toMatchObject({ fontSize: 13, lineHeight: 18, fontWeight: '500' });
    expect(typeScale.caption).toMatchObject({ fontSize: 12, lineHeight: 16, fontWeight: '400' });
    expect(typeScale.button).toMatchObject({ fontSize: 15, lineHeight: 20, fontWeight: '600' });
    expect(typeScale.fare.family).toBe('text');
    expect(typeScale.fare.tabular).toBe(true);
    expect(typeScale.digits.family).toBe('mono');
    expect(typeScale.timer.family).toBe('mono');
    expect(fontFace.regular).toBe('BricolageGrotesque_400Regular');
    expect(fontFace.bold).toBe('BricolageGrotesque_700Bold');
    expect(fontFace.mono).toBe('GeistMono_500Medium');
    expect(fontFallback).toContain('sans-serif');
    expect(Object.values(spacing)).toEqual([4, 8, 12, 16, 24, 32, 48]);
    expect(radii.card).toBe(12);
    expect(radii.control).toBe(14);
    expect(radii.sheet).toBe(24);
    expect(tapTarget.minDp).toBe(48);
    expect(tapTarget.minPt).toBe(44);
    expect(tapTarget.riderPrimaryHeightDp).toBe(56);
  });

  it('keeps the Vanta metallic surfaces separate from the app tokens', () => {
    expect(vanta.page).toBe('#040405');
    expect(vanta.surface).toBe('#1D1C21');
    expect(vanta.yellow).toBe('#FFE14A');
    expect(surfaceGlow.card.cy).toBe('100%');
    expect(surfaceGlow.header.cy).toBe('0%');
    expect(metalCta[0]).toBe('#FFFFFF');
    expect(metalCta[2]).toBe('#9B9B9B');
    expect(colors.bg).not.toBe(vanta.page);
  });

  it('exposes the dark colours as CSS variables', () => {
    const css = darkCssVariables();
    expect(css['--drop-bg']).toBe('#09090B');
    expect(css['--drop-primary']).toBe('#FFE14A');
  });
});
