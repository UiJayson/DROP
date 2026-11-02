import { describe, expect, it } from 'vitest';

import { isSentryDsnConfigured } from './sentry';

describe('isSentryDsnConfigured', () => {
  it('stays off until a DSN is set', () => {
    expect(isSentryDsnConfigured(undefined)).toBe(false);
    expect(isSentryDsnConfigured('')).toBe(false);
    expect(isSentryDsnConfigured('   ')).toBe(false);
    expect(isSentryDsnConfigured('https://example.ingest.sentry.io/1')).toBe(true);
  });
});
