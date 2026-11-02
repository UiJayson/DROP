import { describe, expect, it } from 'vitest';

import {
  documentPath,
  initialOnboarding,
  onboardingBlocker,
  onboardingReducer,
  onboardingStepIndex,
  riderEntry,
  riderMayGoOnline,
} from './onboarding';

function readyDraft() {
  let draft = initialOnboarding();
  draft = onboardingReducer(draft, { type: 'name', value: 'Emeka Nwosu' });
  draft = onboardingReducer(draft, { type: 'next' });
  draft = onboardingReducer(draft, { type: 'selfie', ready: true });
  draft = onboardingReducer(draft, { type: 'next' });
  draft = onboardingReducer(draft, { type: 'licence', value: 'LSD556677' });
  draft = onboardingReducer(draft, { type: 'licencePhoto', ready: true });
  draft = onboardingReducer(draft, { type: 'next' });
  draft = onboardingReducer(draft, { type: 'plate', value: 'KJA-204-AB' });
  draft = onboardingReducer(draft, { type: 'kekePhoto', ready: true });
  draft = onboardingReducer(draft, { type: 'next' });
  return draft;
}

describe('rider onboarding', () => {
  it('walks name, photo, licence, Keke, and NIN in order', () => {
    const draft = readyDraft();
    expect(draft.step).toBe('nin');
    expect(onboardingStepIndex(draft.step)).toBe(5);
    expect(onboardingBlocker(draft)).toBe('Confirm DROP can check this NIN.');
    const consented = onboardingReducer(
      onboardingReducer(draft, { type: 'nin', value: '12345678901' }),
      { type: 'consent', value: true },
    );
    expect(onboardingBlocker(consented)).toBeNull();
  });

  it('does not leave a step while something is missing', () => {
    const stuck = onboardingReducer(initialOnboarding(), { type: 'next' });
    expect(stuck.step).toBe('name');
    expect(onboardingBlocker(stuck)).toBe('Enter the name passengers should use.');
  });

  it('keeps an unapproved rider offline', () => {
    expect(riderEntry(null)).toBe('details');
    expect(riderEntry('pending')).toBe('pending');
    expect(riderEntry('rejected')).toBe('rejected');
    expect(riderEntry('approved')).toBe('home');
    expect(riderMayGoOnline('pending')).toBe(false);
    expect(riderMayGoOnline('approved')).toBe(true);
    expect(documentPath('user-1', 'selfie', 'jpg')).toBe('user-1/selfie.jpg');
  });
});
