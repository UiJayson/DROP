import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('passenger web manifest', () => {
  it('names DROP and uses a black background with Keke Yellow', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'),
    );
    expect(manifest.name).toBe('DROP');
    expect(manifest.short_name).toBe('DROP');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBe('#000000');
    expect(manifest.theme_color).toBe('#FFC629');
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );
  });
});
