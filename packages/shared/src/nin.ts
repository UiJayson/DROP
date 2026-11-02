/**
 * Provider-agnostic NIN check.
 *
 * The full NIN is sent to the provider and is not stored. DROP keeps the last
 * four digits, a provider reference, and a hash so the same NIN cannot be
 * registered twice.
 *
 * The mock rules below are duplicated in
 * supabase/migrations/20261102170000_m2_auth_kyc.sql. Change both together.
 * No real provider is selected yet. See docs/06-signup-and-nin.md.
 */

export type NinVerificationInput = {
  nin: string;
  fullName: string;
  phoneE164: string;
};

export type NinVerification =
  | {
      ok: true;
      provider: string;
      reference: string;
      last4: string;
    }
  | {
      ok: false;
      provider: string;
      code: 'invalid_nin' | 'name_mismatch' | 'unavailable';
      message: string;
    };

export type NinVerificationProvider = {
  readonly id: string;
  verify(input: NinVerificationInput): Promise<NinVerification>;
};

export function ninLast4(nin: string): string {
  return nin.slice(-4);
}

/** Same decisions the database mock uses. */
export function verifyWithMockRules(input: NinVerificationInput): NinVerification {
  const provider = 'mock';
  if (!/^\d{11}$/.test(input.nin)) {
    return {
      ok: false,
      provider,
      code: 'invalid_nin',
      message: 'Enter the 11-digit NIN.',
    };
  }
  if (input.nin === '00000000000') {
    return {
      ok: false,
      provider,
      code: 'unavailable',
      message: 'NIN check is unavailable. Try again shortly.',
    };
  }
  if (input.nin.endsWith('0000')) {
    return {
      ok: false,
      provider,
      code: 'name_mismatch',
      message: 'The name does not match this NIN.',
    };
  }
  const last4 = ninLast4(input.nin);
  return {
    ok: true,
    provider,
    reference: `mock_${last4}`,
    last4,
  };
}

export const mockNinProvider: NinVerificationProvider = {
  id: 'mock',
  verify(input) {
    return Promise.resolve(verifyWithMockRules(input));
  },
};

export function needsProfileName(fullName: string | null | undefined): boolean {
  const trimmed = fullName?.trim() ?? '';
  return trimmed.length < 2 || trimmed.toLowerCase() === 'new user';
}

const personName = /^[\p{L}][\p{L}\s'.-]{1,79}$/u;

export function normalizePersonName(input: string): string | null {
  const name = input.trim().replace(/\s+/g, ' ');
  return personName.test(name) ? name : null;
}

export function normalizeLicenceNumber(input: string): string | null {
  const licence = input
    .trim()
    .replace(/[\s-]+/g, '')
    .toUpperCase();
  return /^[A-Z0-9]{6,20}$/.test(licence) ? licence : null;
}

export function normalizePlate(input: string): string | null {
  const plate = input.trim().replace(/\s+/g, '').toUpperCase();
  return /^[A-Z0-9-]{4,12}$/.test(plate) ? plate : null;
}

export function reviewReasonError(reason: string): string | null {
  if (reason.trim().length < 3) {
    return 'Add a short reason for the rider.';
  }
  if (reason.trim().length > 280) {
    return 'Keep the reason under 280 characters.';
  }
  return null;
}
