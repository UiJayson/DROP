import { z } from 'zod';

/** Seconds before another SMS code can be requested. Matches Supabase auth.sms.max_frequency. */
export const OTP_RESEND_SECONDS = 60;

export const OTP_LENGTH = 6;

const e164 = /^\+234[7-9]\d{9}$/;

/**
 * Nigerian mobile numbers to E.164.
 * Accepts 080…, 80…, 23480…, and +234 80…, including a mistaken extra 0 after 234.
 */
export function normalizeNigerianPhone(input: string): string | null {
  let raw = input.trim().replace(/[\s()-]/g, '');
  if (raw.startsWith('00')) {
    raw = `+${raw.slice(2)}`;
  }
  if (/^0\d{10}$/.test(raw)) {
    raw = `+234${raw.slice(1)}`;
  } else if (/^[7-9]\d{9}$/.test(raw)) {
    raw = `+234${raw}`;
  } else if (/^234\d{10}$/.test(raw)) {
    raw = `+${raw}`;
  } else if (/^\+2340\d{10}$/.test(raw)) {
    raw = `+234${raw.slice(5)}`;
  }
  return e164.test(raw) ? raw : null;
}

export const nigerianPhoneSchema = z.string().transform((value, ctx) => {
  const phone = normalizeNigerianPhone(value);
  if (!phone) {
    ctx.addIssue({ code: 'custom', message: 'Enter a valid Nigerian mobile number.' });
    return z.NEVER;
  }
  return phone;
});

export function maskNigerianPhone(phone: string): string {
  const normalized = normalizeNigerianPhone(phone) ?? phone;
  if (!e164.test(normalized)) {
    return normalized;
  }
  return `+234 ${normalized.slice(4, 6)} ••• ••${normalized.slice(-2)}`;
}

export function digitsOnly(input: string, max: number): string {
  return input.replace(/\D/g, '').slice(0, max);
}

export function resendWaitSeconds(
  sentAtMs: number | null,
  nowMs: number,
  cooldown = OTP_RESEND_SECONDS,
): number {
  if (sentAtMs === null) {
    return 0;
  }
  const elapsed = Math.floor((nowMs - sentAtMs) / 1000);
  return Math.max(0, cooldown - elapsed);
}

export type SignInStep = 'phone' | 'code';

export type SignInState = {
  step: SignInStep;
  national: string;
  code: string;
  error: string | null;
  sentAtMs: number | null;
};

export type SignInAction =
  | { type: 'editPhone'; value: string }
  | { type: 'editCode'; value: string }
  | { type: 'codeSent'; nowMs: number }
  | { type: 'fail'; message: string }
  | { type: 'back' };

export function initialSignInState(): SignInState {
  return { step: 'phone', national: '', code: '', error: null, sentAtMs: null };
}

export function signInReducer(state: SignInState, action: SignInAction): SignInState {
  switch (action.type) {
    case 'editPhone':
      return { ...state, national: digitsOnly(action.value, 11), error: null };
    case 'editCode':
      return { ...state, code: digitsOnly(action.value, OTP_LENGTH), error: null };
    case 'codeSent':
      return { ...state, step: 'code', code: '', error: null, sentAtMs: action.nowMs };
    case 'fail':
      return { ...state, error: action.message };
    case 'back':
      return { ...state, step: 'phone', code: '', error: null };
    default:
      return state;
  }
}

export function phoneFromNational(national: string): string | null {
  return normalizeNigerianPhone(national);
}

export function isCompleteOtp(code: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code);
}

/** Turn provider and network failures into a sentence a person can act on. */
export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('rate') ||
    lower.includes('too many') ||
    lower.includes('frequency') ||
    lower.includes('once every')
  ) {
    return 'Too many codes. Wait a minute, then try again.';
  }
  if (lower.includes('expired')) {
    return 'That code has expired. Ask for a new one.';
  }
  if (
    lower.includes('invalid') ||
    lower.includes('otp') ||
    lower.includes('token') ||
    lower.includes('not found')
  ) {
    return 'That code is not right. Check the text message and try again.';
  }
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('failed to')) {
    return 'Cannot reach DROP right now. Check your connection.';
  }
  if (lower.includes('phone') || lower.includes('sms')) {
    return 'Enter a valid Nigerian mobile number.';
  }
  return 'Something went wrong. Try again.';
}
