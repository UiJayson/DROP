export const KOBO_PER_NAIRA = 100;

/** UI fare stepper: ₦50. */
export const FARE_STEP_KOBO = 50 * KOBO_PER_NAIRA;

export class FareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FareError';
  }
}

export function assertKobo(value: number, label = 'amount'): void {
  if (!Number.isInteger(value)) {
    throw new FareError(`${label} must be an integer number of kobo`);
  }
  if (value < 0) {
    throw new FareError(`${label} cannot be negative`);
  }
}

export function nairaToKobo(naira: number): number {
  if (!Number.isFinite(naira)) {
    throw new FareError('naira amount must be a finite number');
  }
  const kobo = Math.round(naira * KOBO_PER_NAIRA);
  assertKobo(kobo, 'amount');
  return kobo;
}

export function koboToNaira(kobo: number): number {
  assertKobo(kobo, 'amount');
  return kobo / KOBO_PER_NAIRA;
}

export function formatNaira(kobo: number): string {
  assertKobo(kobo, 'amount');
  const fractionDigits = kobo % KOBO_PER_NAIRA === 0 ? 0 : 2;
  const formatted = new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(kobo / KOBO_PER_NAIRA);
  return `₦${formatted}`;
}

/** Round half away from zero to the nearest step (₦50 by default). */
export function roundToStep(kobo: number, stepKobo = FARE_STEP_KOBO): number {
  assertKobo(kobo, 'amount');
  if (!Number.isInteger(stepKobo) || stepKobo <= 0) {
    throw new FareError('fare step must be a positive integer number of kobo');
  }
  return Math.round(kobo / stepKobo) * stepKobo;
}
