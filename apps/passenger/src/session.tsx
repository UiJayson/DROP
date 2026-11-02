import {
  createDropSupabase,
  loadProfile,
  readPublicSupabase,
  saveProfileName,
  sendPhoneCode,
  signOutDrop,
  verifyPhoneCode,
  type AccountProfile,
  type DropSupabase,
  type SessionUser,
} from '@drop/api-client';
import {
  initialSignInState,
  isCompleteOtp,
  maskNigerianPhone,
  needsProfileName,
  normalizePersonName,
  phoneFromNational,
  resendWaitSeconds,
  signInReducer,
} from '@drop/shared';
import { CodeSignIn, NameSignIn, PhoneSignIn, StatusMessage, readPreview, useNow } from '@drop/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';

import { AccountProvider } from './account';
import { BookingProvider } from './booking';

const previewScreens = ['phone', 'code', 'name', 'app'] as const;

function clientForEnv(): DropSupabase | null {
  const config = readPublicSupabase({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
  return config ? createDropSupabase(config, AsyncStorage) : null;
}

export function PassengerSession({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => clientForEnv(), []);
  const preview = readPreview(previewScreens);
  const [localPreview, setLocalPreview] = useState<'app' | 'name' | null>(null);
  const [signIn, dispatch] = useReducer(signInReducer, undefined, initialSignInState);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [name, setName] = useState('');
  const now = useNow(signIn.step === 'code');

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user
        ? { id: session.user.id, phone: session.user.phone ?? null }
        : null;
      setUser(next);
      if (!next) {
        setProfile(null);
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
        let next = await loadProfile(supabase, user.id);
        if (!next) {
          await new Promise((resolve) => setTimeout(resolve, 700));
          next = await loadProfile(supabase, user.id);
        }
        if (active) {
          setProfile(next);
          if (next && needsProfileName(next.fullName)) {
            setName('');
          }
        }
      } catch (error) {
        if (active) {
          dispatch({
            type: 'fail',
            message: error instanceof Error ? error.message : 'Could not load your account.',
          });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [supabase, user]);

  async function signOut() {
    if (!supabase) {
      setLocalPreview(null);
      setUser(null);
      setProfile(null);
      return;
    }
    await signOutDrop(supabase);
  }

  const showPreview = !supabase && (preview === 'app' || localPreview === 'app');
  if (showPreview) {
    return (
      <AccountProvider
        value={{ phoneMask: '+234 80 ••• ••00', signOut: () => setLocalPreview(null) }}
      >
        <BookingProvider client={null}>{children}</BookingProvider>
      </AccountProvider>
    );
  }

  if (!supabase) {
    if (preview === 'name' || localPreview === 'name') {
      return (
        <NameSignIn
          name={name}
          error={signIn.error}
          busy={false}
          onChange={setName}
          onSubmit={() => {
            if (!normalizePersonName(name)) {
              dispatch({ type: 'fail', message: 'Enter the name riders should use.' });
              return;
            }
            setLocalPreview('app');
          }}
        />
      );
    }
    if (preview === 'code') {
      return (
        <CodeSignIn
          phoneE164="+2348012345678"
          code={signIn.code}
          error={signIn.error}
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
        audience="Passenger"
        national={signIn.national}
        error={signIn.error}
        busy={false}
        onChange={(value) => dispatch({ type: 'editPhone', value })}
        onSubmit={() => {
          const phone = phoneFromNational(signIn.national);
          if (!phone) {
            dispatch({ type: 'fail', message: 'Enter a valid Nigerian mobile number.' });
            return;
          }
          dispatch({
            type: 'fail',
            message:
              'Text messages are not connected yet. Add the Supabase URL and anon key, then restart.',
          });
        }}
        onPreview={() => setLocalPreview('app')}
      />
    );
  }

  if (!ready || (user && !profile && !signIn.error)) {
    return (
      <StatusMessage
        testID="screen-loading"
        title="Checking your sign-in"
        body="This takes a moment."
      />
    );
  }

  if (!user) {
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
            void (async () => {
              setBusy(true);
              try {
                await sendPhoneCode(supabase, phone, 'passenger');
                dispatch({ type: 'codeSent', nowMs: Date.now() });
              } catch (error) {
                dispatch({
                  type: 'fail',
                  message: error instanceof Error ? error.message : 'Could not send the code.',
                });
              } finally {
                setBusy(false);
              }
            })();
          }}
          onSubmit={() => {
            if (!isCompleteOtp(signIn.code)) {
              dispatch({ type: 'fail', message: 'Enter the 6-digit code from the text message.' });
              return;
            }
            void (async () => {
              setBusy(true);
              try {
                const next = await verifyPhoneCode(supabase, phone, signIn.code);
                setUser(next);
              } catch (error) {
                dispatch({
                  type: 'fail',
                  message: error instanceof Error ? error.message : 'That code is not right.',
                });
              } finally {
                setBusy(false);
              }
            })();
          }}
        />
      );
    }
    return (
      <PhoneSignIn
        audience="Passenger"
        national={signIn.national}
        error={signIn.error}
        busy={busy}
        onChange={(value) => dispatch({ type: 'editPhone', value })}
        onSubmit={() => {
          if (!phone) {
            dispatch({ type: 'fail', message: 'Enter a valid Nigerian mobile number.' });
            return;
          }
          void (async () => {
            setBusy(true);
            try {
              await sendPhoneCode(supabase, phone, 'passenger');
              dispatch({ type: 'codeSent', nowMs: Date.now() });
            } catch (error) {
              dispatch({
                type: 'fail',
                message: error instanceof Error ? error.message : 'Could not send the code.',
              });
            } finally {
              setBusy(false);
            }
          })();
        }}
      />
    );
  }

  if (!profile) {
    return (
      <StatusMessage
        testID="screen-account-error"
        title="Account not ready"
        body={signIn.error ?? 'We could not open your profile.'}
        actionLabel="Sign out"
        onAction={() => void signOut()}
      />
    );
  }

  if (profile.status === 'suspended') {
    return (
      <StatusMessage
        testID="screen-suspended"
        title="Account paused"
        body="DROP has paused this number. You can sign out and try another one."
        actionLabel="Sign out"
        onAction={() => void signOut()}
      />
    );
  }

  if (needsProfileName(profile.fullName)) {
    return (
      <NameSignIn
        name={name}
        error={signIn.error}
        busy={busy}
        onChange={setName}
        onSubmit={() => {
          const cleaned = normalizePersonName(name);
          if (!cleaned) {
            dispatch({ type: 'fail', message: 'Enter the name riders should use.' });
            return;
          }
          void (async () => {
            setBusy(true);
            try {
              await saveProfileName(supabase, user.id, cleaned);
              setProfile({ ...profile, fullName: cleaned });
            } catch (error) {
              dispatch({
                type: 'fail',
                message: error instanceof Error ? error.message : 'Could not save your name.',
              });
            } finally {
              setBusy(false);
            }
          })();
        }}
      />
    );
  }

  return (
    <AccountProvider
      value={{
        phoneMask: maskNigerianPhone(user.phone ?? profile.phone ?? ''),
        signOut: () => void signOut(),
      }}
    >
      <BookingProvider client={supabase}>{children}</BookingProvider>
    </AccountProvider>
  );
}
