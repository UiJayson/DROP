export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

/** Blank values mean the app can open, but text-message sign-in is not connected. */
export function readPublicSupabase(env: {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}): SupabasePublicConfig | null {
  const url = (env.EXPO_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const anonKey = (
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ''
  ).trim();
  if (url === '' || anonKey === '') {
    return null;
  }
  return { url, anonKey };
}
