import { describe, expect, it } from 'vitest';

import {
  mockNinProvider,
  needsProfileName,
  normalizeLicenceNumber,
  normalizePersonName,
  normalizePlate,
  reviewReasonError,
  verifyWithMockRules,
} from './nin';

describe('mock NIN provider', () => {
  const base = { fullName: 'Ada Okonkwo', phoneE164: '+2348012345678' };

  it('returns a reference and the last four digits', async () => {
    const result = await mockNinProvider.verify({ ...base, nin: '12345678901' });
    expect(mockNinProvider.id).toBe('mock');
    expect(result).toEqual({
      ok: true,
      provider: 'mock',
      reference: 'mock_8901',
      last4: '8901',
    });
  });

  it('rejects a bad number, a name mismatch, and an outage', () => {
    expect(verifyWithMockRules({ ...base, nin: '123' }).ok).toBe(false);
    expect(verifyWithMockRules({ ...base, nin: '12345670000' })).toMatchObject({
      ok: false,
      code: 'name_mismatch',
      message: 'The name does not match this NIN.',
    });
    expect(verifyWithMockRules({ ...base, nin: '00000000000' })).toMatchObject({
      ok: false,
      code: 'unavailable',
    });
  });
});

describe('rider application fields', () => {
  it('accepts names, licence numbers, and plates', () => {
    expect(normalizePersonName('  Chinedu   Adeyemi ')).toBe('Chinedu Adeyemi');
    expect(normalizePersonName('A')).toBeNull();
    expect(needsProfileName('New user')).toBe(true);
    expect(needsProfileName('Ada Okonkwo')).toBe(false);
    expect(normalizeLicenceNumber('lsd-102 9384')).toBe('LSD1029384');
    expect(normalizePlate('kja 204 ab')).toBe('KJA204AB');
    expect(normalizePlate('LAG-TEST-001')).toBe('LAG-TEST-001');
    expect(normalizePlate('12')).toBeNull();
  });

  it('requires a short rejection reason', () => {
    expect(reviewReasonError('no')).toBe('Add a short reason for the rider.');
    expect(reviewReasonError('Photo is blurry')).toBeNull();
  });
});
