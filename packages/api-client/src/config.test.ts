import { describe, expect, it } from 'vitest';

import { readGoogleMapsKey, readPublicSupabase } from './config';

describe('public Supabase config', () => {
  it('treats blank keys as not connected', () => {
    expect(readPublicSupabase({})).toBeNull();
    expect(
      readPublicSupabase({ EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' }),
    ).toBeNull();
  });

  it('reads the Expo or Next public pair', () => {
    expect(
      readPublicSupabase({
        NEXT_PUBLIC_SUPABASE_URL: ' https://example.supabase.co ',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
      }),
    ).toEqual({ url: 'https://example.supabase.co', anonKey: 'anon' });
  });
});

describe('Google Maps key', () => {
  it('treats a blank key as not connected', () => {
    expect(readGoogleMapsKey({})).toBeNull();
    expect(readGoogleMapsKey({ EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: '  ' })).toBeNull();
    expect(readGoogleMapsKey({ EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: 'maps-key' })).toBe('maps-key');
  });
});
