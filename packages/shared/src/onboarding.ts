import type { VerificationStatus } from './enums';
import {
  normalizeLicenceNumber,
  normalizePersonName,
  normalizePlate,
  verifyWithMockRules,
} from './nin';

export const onboardingSteps = ['name', 'photo', 'licence', 'keke', 'nin'] as const;
export type OnboardingStep = (typeof onboardingSteps)[number];

export const RIDER_DOCUMENTS_BUCKET = 'rider-documents';
export const KYC_SIGNED_URL_SECONDS = 60;

export type OnboardingDraft = {
  step: OnboardingStep;
  fullName: string;
  selfieReady: boolean;
  licenceNumber: string;
  licencePhotoReady: boolean;
  plateNumber: string;
  kekePhotoReady: boolean;
  nin: string;
  consent: boolean;
};

export type OnboardingAction =
  | { type: 'name'; value: string }
  | { type: 'selfie'; ready: boolean }
  | { type: 'licence'; value: string }
  | { type: 'licencePhoto'; ready: boolean }
  | { type: 'plate'; value: string }
  | { type: 'kekePhoto'; ready: boolean }
  | { type: 'nin'; value: string }
  | { type: 'consent'; value: boolean }
  | { type: 'next' }
  | { type: 'back' };

export function initialOnboarding(): OnboardingDraft {
  return {
    step: 'name',
    fullName: '',
    selfieReady: false,
    licenceNumber: '',
    licencePhotoReady: false,
    plateNumber: '',
    kekePhotoReady: false,
    nin: '',
    consent: false,
  };
}

export function onboardingStepIndex(step: OnboardingStep): number {
  return onboardingSteps.indexOf(step) + 1;
}

/** What is still missing on the current step. Null means the step can continue. */
export function onboardingBlocker(draft: OnboardingDraft): string | null {
  switch (draft.step) {
    case 'name':
      return normalizePersonName(draft.fullName) ? null : 'Enter the name passengers should use.';
    case 'photo':
      return draft.selfieReady ? null : 'Add a photo of your face.';
    case 'licence':
      if (!normalizeLicenceNumber(draft.licenceNumber)) {
        return 'Enter the licence number from the card.';
      }
      return draft.licencePhotoReady ? null : 'Add a photo of the licence.';
    case 'keke':
      if (!normalizePlate(draft.plateNumber)) {
        return 'Enter the plate on the Keke.';
      }
      return draft.kekePhotoReady ? null : 'Add a photo of the Keke.';
    case 'nin': {
      if (!draft.consent) {
        return 'Confirm DROP can check this NIN.';
      }
      const check = verifyWithMockRules({
        nin: draft.nin,
        fullName: draft.fullName,
        phoneE164: '+2348000000000',
      });
      return check.ok ? null : check.message;
    }
    default:
      return null;
  }
}

export function onboardingReducer(
  draft: OnboardingDraft,
  action: OnboardingAction,
): OnboardingDraft {
  switch (action.type) {
    case 'name':
      return { ...draft, fullName: action.value };
    case 'selfie':
      return { ...draft, selfieReady: action.ready };
    case 'licence':
      return { ...draft, licenceNumber: action.value };
    case 'licencePhoto':
      return { ...draft, licencePhotoReady: action.ready };
    case 'plate':
      return { ...draft, plateNumber: action.value };
    case 'kekePhoto':
      return { ...draft, kekePhotoReady: action.ready };
    case 'nin':
      return { ...draft, nin: action.value.replace(/\D/g, '').slice(0, 11) };
    case 'consent':
      return { ...draft, consent: action.value };
    case 'back': {
      const index = onboardingSteps.indexOf(draft.step);
      const previous = onboardingSteps[index - 1];
      return previous ? { ...draft, step: previous } : draft;
    }
    case 'next': {
      if (onboardingBlocker(draft)) {
        return draft;
      }
      const index = onboardingSteps.indexOf(draft.step);
      const next = onboardingSteps[index + 1];
      return next ? { ...draft, step: next } : draft;
    }
    default:
      return draft;
  }
}

export type RiderEntry = 'details' | 'pending' | 'rejected' | 'suspended' | 'home';

export function riderEntry(status: VerificationStatus | null): RiderEntry {
  switch (status) {
    case 'approved':
      return 'home';
    case 'pending':
      return 'pending';
    case 'rejected':
      return 'rejected';
    case 'suspended':
      return 'suspended';
    default:
      return 'details';
  }
}

/** Server trigger uses the same rule: only an approved rider may be online. */
export function riderMayGoOnline(status: VerificationStatus | null): boolean {
  return status === 'approved';
}

export function documentPath(
  userId: string,
  kind: 'selfie' | 'licence' | 'keke',
  ext: 'jpg' | 'png' | 'webp',
): string {
  return `${userId}/${kind}.${ext}`;
}
