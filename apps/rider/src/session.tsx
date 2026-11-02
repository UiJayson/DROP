import {
  createDropSupabase,
  loadProfile,
  loadRiderAccount,
  readPublicSupabase,
  sendPhoneCode,
  setRiderOnline,
  signOutDrop,
  submitRiderApplication,
  uploadRiderPhoto,
  verifyPhoneCode,
  type DropSupabase,
  type RiderAccount,
  type SessionUser,
} from '@drop/api-client';
import {
  initialSignInState,
  isCompleteOtp,
  normalizeLicenceNumber,
  normalizePersonName,
  normalizePlate,
  phoneFromNational,
  resendWaitSeconds,
  riderEntry,
  signInReducer,
  type OnboardingStep,
} from '@drop/shared';
import { CodeSignIn, PhoneSignIn, StatusMessage, readPreview, useNow } from '@drop/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useReducer, useState } from 'react';

import { RiderAccessProvider } from './access';
import { RiderProvider } from './rider-context';
import { OnboardingFlow } from './screens/OnboardingScreens';
import { RiderSwitch } from './screens/RiderScreens';

const previewScreens = [
  'phone',
  'code',
  'name',
  'photo',
  'licence',
  'keke',
  'nin',
  'pending',
  'rejected',
  'home',
] as const;

type PreviewScreen = (typeof previewScreens)[number];

function clientForEnv(): DropSupabase | null {
  const config = readPublicSupabase({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
  return config ? createDropSupabase(config, AsyncStorage) : null;
}

function isOnboardingStep(value: PreviewScreen | null): value is OnboardingStep {
  return (
    value === 'name' ||
    value === 'photo' ||
    value === 'licence' ||
    value === 'keke' ||
    value === 'nin'
  );
}

async function photoFile(uri: string) {
  const response = await fetch(uri);
  const bytes = await response.arrayBuffer();
  const type = (response.headers.get('content-type') ?? '').toLowerCase();
  const lower = uri.toLowerCase();
  if (type.includes('png') || lower.endsWith('.png')) {
    return { bytes, ext: 'png' as const, contentType: 'image/png' };
  }
  if (type.includes('webp') || lower.endsWith('.webp')) {
    return { bytes, ext: 'webp' as const, contentType: 'image/webp' };
  }
  return { bytes, ext: 'jpg' as const, contentType: 'image/jpeg' };
}

export function RiderSession() {
  const supabase = useMemo(() => clientForEnv(), []);
  const preview = readPreview(previewScreens);
  const [local, setLocal] = useState<PreviewScreen | null>(null);
  const shown = supabase ? null : (local ?? preview);
  const [signIn, dispatch] = useReducer(signInReducer, undefined, initialSignInState);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [rider, setRider] = useState<RiderAccount | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(!supabase);
  const now = useNow(signIn.step === 'code');

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, phone: session.user.phone ?? null } : null);
      if (!session?.user) {
        setRider(undefined);
      }
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) {
      return undefined;
    }
    let active = true;
    void (async () => {
      try {
        await loadProfile(supabase, user.id);
        let next = await loadRiderAccount(supabase, user.id);
        if (!next) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          next = await loadRiderAccount(supabase, user.id);
        }
        if (active) {
          setRider(next);
        }
      } catch (error) {
        if (active) {
          dispatch({
            type: 'fail',
            message: error instanceof Error ? error.message : 'Could not load your rider profile.',
          });
          setRider(null);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase, user]);

  async function signOut() {
    setEditing(false);
    setLocal(null);
    if (supabase) {
      await signOutDrop(supabase);
    }
  }

  if (!supabase) {
    return (
      <PreviewRider
        screen={shown}
        signIn={signIn}
        dispatch={dispatch}
        onPreview={() => setLocal('name')}
        onSignOut={() => void signOut()}
        onPending={() => setLocal('pending')}
      />
    );
  }

  if (!ready || (user && rider === undefined && !signIn.error)) {
    return (
      <StatusMessage
        testID="screen-loading"
        title="Checking your sign-in"
        body="This takes a moment."
      />
    );
  }

  if (!user) {
    return (
      <PhoneSteps
        signIn={signIn}
        dispatch={dispatch}
        busy={busy}
        setBusy={setBusy}
        now={now}
        onSend={async (phone) => sendPhoneCode(supabase, phone, 'rider')}
        onVerify={async (phone, code) => {
          const next = await verifyPhoneCode(supabase, phone, code);
          setUser(next);
        }}
      />
    );
  }

  const entry = editing ? 'details' : riderEntry(rider?.status ?? null);
  if (entry === 'details') {
    return (
      <OnboardingFlow
        preview={false}
        onSignOut={() => void signOut()}
        onSubmit={async (draft, photos) => {
          const fullName = normalizePersonName(draft.fullName);
          const licenceNumber = normalizeLicenceNumber(draft.licenceNumber);
          const plateNumber = normalizePlate(draft.plateNumber);
          if (!fullName || !licenceNumber || !plateNumber) {
            throw new Error('Check your name, licence, and plate.');
          }
          const [selfiePath, licencePhotoPath, kekePhotoPath] = await Promise.all([
            uploadRiderPhoto(supabase, user.id, 'selfie', await photoFile(photos.selfie)),
            uploadRiderPhoto(supabase, user.id, 'licence', await photoFile(photos.licence)),
            uploadRiderPhoto(supabase, user.id, 'keke', await photoFile(photos.keke)),
          ]);
          await submitRiderApplication(supabase, {
            fullName,
            licenceNumber,
            plateNumber,
            selfiePath,
            licencePhotoPath,
            kekePhotoPath,
            nin: draft.nin,
          });
          setRider({ status: 'pending', rejectionReason: null });
          setEditing(false);
        }}
      />
    );
  }

  if (entry === 'pending') {
    return (
      <StatusMessage
        testID="screen-pending"
        title="Pending review"
        body="DROP will check your licence, NIN, and Keke photo. You cannot go online until you are approved. You can also finish this in person at a park."
        actionLabel="Sign out"
        onAction={() => void signOut()}
      />
    );
  }

  if (entry === 'rejected') {
    return (
      <StatusMessage
        testID="screen-rejected"
        title="Not approved"
        body={rider?.rejectionReason ?? 'DROP could not approve this application.'}
        actionLabel="Submit again"
        onAction={() => setEditing(true)}
        secondaryLabel="Sign out"
        onSecondary={() => void signOut()}
      />
    );
  }

  if (entry === 'suspended') {
    return (
      <StatusMessage
        testID="screen-suspended"
        title="Account paused"
        body="You cannot go online. Contact the DROP team."
        actionLabel="Sign out"
        onAction={() => void signOut()}
      />
    );
  }

  return (
    <RiderAccessProvider
      value={{
        banner: null,
        signOut: () => void signOut(),
        changeOnline: async (online) => {
          try {
            await setRiderOnline(supabase, online);
            return null;
          } catch (error) {
            return error instanceof Error ? error.message : 'Could not update your status.';
          }
        },
      }}
    >
      <RiderProvider startOffline>
        <RiderSwitch />
      </RiderProvider>
    </RiderAccessProvider>
  );
}

function PreviewRider({
  screen,
  signIn,
  dispatch,
  onPreview,
  onSignOut,
  onPending,
}: {
  screen: PreviewScreen | null;
  signIn: ReturnType<typeof initialSignInState>;
  dispatch: (action: Parameters<typeof signInReducer>[1]) => void;
  onPreview: () => void;
  onSignOut: () => void;
  onPending: () => void;
}) {
  if (screen === 'home') {
    return (
      <RiderAccessProvider
        value={{
          banner: 'Preview of an approved rider. This does not go online for real.',
          changeOnline: async () => null,
          signOut: onSignOut,
        }}
      >
        <RiderProvider>
          <RiderSwitch />
        </RiderProvider>
      </RiderAccessProvider>
    );
  }
  if (screen === 'pending') {
    return (
      <StatusMessage
        testID="screen-pending"
        title="Pending review"
        body="DROP will check your licence, NIN, and Keke photo. You cannot go online until you are approved. You can also finish this in person at a park."
        actionLabel="Sign out"
        onAction={onSignOut}
      />
    );
  }
  if (screen === 'rejected') {
    return (
      <StatusMessage
        testID="screen-rejected"
        title="Not approved"
        body="The licence photo was too dark to read."
        actionLabel="Submit again"
        onAction={onPreview}
        secondaryLabel="Sign out"
        onSecondary={onSignOut}
      />
    );
  }
  if (isOnboardingStep(screen)) {
    return (
      <OnboardingFlow
        preview
        initialStep={screen}
        onSignOut={onSignOut}
        onSubmit={async () => {
          onPending();
        }}
      />
    );
  }
  if (screen === 'code') {
    return (
      <CodeSignIn
        phoneE164="+2348012345678"
        code={signIn.code}
        error={null}
        busy={false}
        resendSeconds={42}
        onChange={(value) => dispatch({ type: 'editCode', value })}
        onSubmit={() => undefined}
        onResend={() => undefined}
        onBack={() => dispatch({ type: 'back' })}
      />
    );
  }
  return (
    <PhoneSignIn
      audience="Rider"
      national={signIn.national}
      error={signIn.error}
      busy={false}
      onChange={(value) => dispatch({ type: 'editPhone', value })}
      onSubmit={() => {
        if (!phoneFromNational(signIn.national)) {
          dispatch({ type: 'fail', message: 'Enter a valid Nigerian mobile number.' });
          return;
        }
        dispatch({
          type: 'fail',
          message:
            'Text messages are not connected yet. Add the Supabase URL and anon key, then restart.',
        });
      }}
      onPreview={onPreview}
    />
  );
}

function PhoneSteps({
  signIn,
  dispatch,
  busy,
  setBusy,
  now,
  onSend,
  onVerify,
}: {
  signIn: ReturnType<typeof initialSignInState>;
  dispatch: (action: Parameters<typeof signInReducer>[1]) => void;
  busy: boolean;
  setBusy: (value: boolean) => void;
  now: number;
  onSend: (phone: string) => Promise<void>;
  onVerify: (phone: string, code: string) => Promise<void>;
}) {
  const phone = phoneFromNational(signIn.national);
  if (signIn.step === 'code' && phone) {
    return (
      <CodeSignIn
        phoneE164={phone}
        code={signIn.code}
        error={signIn.error}
        busy={busy}
        resendSeconds={resendWaitSeconds(signIn.sentAtMs, now)}
        onChange={(value) => dispatch({ type: 'editCode', value })}
        onBack={() => dispatch({ type: 'back' })}
        onResend={() => {
          void run(setBusy, dispatch, () =>
            onSend(phone).then(() => {
              dispatch({ type: 'codeSent', nowMs: Date.now() });
            }),
          );
        }}
        onSubmit={() => {
          if (!isCompleteOtp(signIn.code)) {
            dispatch({ type: 'fail', message: 'Enter the 6-digit code from the text message.' });
            return;
          }
          void run(setBusy, dispatch, () => onVerify(phone, signIn.code));
        }}
      />
    );
  }
  return (
    <PhoneSignIn
      audience="Rider"
      national={signIn.national}
      error={signIn.error}
      busy={busy}
      onChange={(value) => dispatch({ type: 'editPhone', value })}
      onSubmit={() => {
        if (!phone) {
          dispatch({ type: 'fail', message: 'Enter a valid Nigerian mobile number.' });
          return;
        }
        void run(setBusy, dispatch, () =>
          onSend(phone).then(() => {
            dispatch({ type: 'codeSent', nowMs: Date.now() });
          }),
        );
      }}
    />
  );
}

function run(
  setBusy: (value: boolean) => void,
  dispatch: (action: Parameters<typeof signInReducer>[1]) => void,
  task: () => Promise<void>,
) {
  setBusy(true);
  void task()
    .catch((error: unknown) => {
      dispatch({
        type: 'fail',
        message: error instanceof Error ? error.message : 'Something went wrong. Try again.',
      });
    })
    .finally(() => setBusy(false));
}
