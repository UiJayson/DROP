import { describe, expect, it } from 'vitest';

import { createDropClient } from './client';
import { edgeFunctionNames } from './functions';

describe('createDropClient', () => {
  it('builds an edge function URL and does not call the network', () => {
    const client = createDropClient({
      supabaseUrl: 'http://127.0.0.1:54321/',
      supabaseAnonKey: 'local-anon-key',
    });

    expect(client.functionUrl('fare-quote')).toBe('http://127.0.0.1:54321/functions/v1/fare-quote');
    expect(edgeFunctionNames).toContain('select-offer');
  });

  it('refuses an empty project URL', () => {
    expect(() => createDropClient({ supabaseUrl: ' ', supabaseAnonKey: 'key' })).toThrow(
      /required/,
    );
  });
});
