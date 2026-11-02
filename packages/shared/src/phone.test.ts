import { describe, expect, it } from 'vitest';

import {
  OTP_LENGTH,
  initialSignInState,
  isCompleteOtp,
  mapAuthError,
  maskNigerianPhone,
  normalizeNigerianPhone,
  phoneFromNational,
  resendWaitSeconds,
  signInReducer,
} from './phone';

describe('Nigerian phone numbers', () => {
  it('accepts local, national, and E.164 forms', () => {
    expect(normalizeNigerianPhone('08012345678')).toBe('+2348012345678');
    expect(normalizeNigerianPhone('8012345678')).toBe('+2348012345678');
    expect(normalizeNigerianPhone('2348012345678')).toBe('+2348012345678');
    expect(normalizeNigerianPhone('+234 801 234 5678')).toBe('+2348012345678');
    expect(normalizeNigerianPhone('+23408012345678')).toBe('+2348012345678');
    expect(normalizeNigerianPhone('09012345678')).toBe('+2349012345678');
  });

  it('rejects short, landline-looking, and foreign numbers', () => {
    expect(normalizeNigerianPhone('080123456')).toBeNull();
    expect(normalizeNigerianPhone('+2341234567890')).toBeNull();
    expect(normalizeNigerianPhone('+14155550123')).toBeNull();
    expect(normalizeNigerianPhone('')).toBeNull();
  });

  it('masks the middle of a mobile number', () => {
    expect(maskNigerianPhone('+2348012345678')).toBe('+234 80 ••• ••78');
  });
});

describe('sign-in form', () => {
  it('keeps digits only and moves to the code step after a send', () => {
    let state = initialSignInState();
    state = signInReducer(state, { type: 'editPhone', value: '080-1234-5678' });
    expect(state.national).toBe('08012345678');
    expect(phoneFromNational(state.national)).toBe('+2348012345678');
    state = signInReducer(state, { type: 'codeSent', nowMs: 1_000 });
    expect(state.step).toBe('code');
    state = signInReducer(state, { type: 'editCode', value: '12ab345678' });
    expect(state.code).toBe('123456');
    expect(isCompleteOtp(state.code)).toBe(true);
    expect(state.code).toHaveLength(OTP_LENGTH);
  });

  it('waits 60 seconds before another code', () => {
    expect(resendWaitSeconds(0, 10_000)).toBe(50);
    expect(resendWaitSeconds(0, 60_000)).toBe(0);
    expect(resendWaitSeconds(null, 0)).toBe(0);
  });

  it('explains rate limits in plain language', () => {
    expect(
      mapAuthError('For security purposes, you can only request this once every 60 seconds'),
    ).toBe('Too many codes. Wait a minute, then try again.');
    expect(mapAuthError('Token has expired or is invalid')).toBe(
      'That code has expired. Ask for a new one.',
    );
  });
});
