import type { FareQuote } from '@drop/shared';

import type { EdgeFunctionName } from './functions';

/** Shape the fare-quote function will return. The function itself is not built yet. */
export type FareQuoteResult = FareQuote;

export type DropClientConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function createDropClient(config: DropClientConfig) {
  if (config.supabaseUrl.trim() === '' || config.supabaseAnonKey.trim() === '') {
    throw new Error('Supabase URL and anon key are required');
  }

  const base = config.supabaseUrl.replace(/\/$/, '');

  return {
    config,
    functionUrl(name: EdgeFunctionName): string {
      return `${base}/functions/v1/${name}`;
    },
  };
}
