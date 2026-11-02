'use client';

import {
  createDropSupabase,
  loadProfile,
  readPublicSupabase,
  reviewRider,
  sendPhoneCode,
  signOutDrop,
  signedDocumentUrl,
  verifyPhoneCode,
  type DropSupabase,
} from '@drop/api-client';
import {
  initialSignInState,
  isCompleteOtp,
  maskNigerianPhone,
  phoneFromNational,
  reviewReasonError,
  signInReducer,
} from '@drop/shared';
import { colors, radii, spacing, typeScale } from '@drop/ui-tokens';
import { useEffect, useMemo, useReducer, useState } from 'react';

type QueueRider = {
  id: string;
  fullName: string;
  phone: string;
  licenceNumber: string;
  plate: string;
  ninLast4: string;
  selfieUrl: string | null;
  licenceUrl: string | null;
  kekeUrl: string | null;
};

const sampleRiders: QueueRider[] = [
  {
    id: 'sample-emeka',
    fullName: 'Emeka Nwosu',
    phone: '+2348010000004',
    licenceNumber: 'LSD556677',
    plate: 'KJA-204-AB',
    ninLast4: '6789',
    selfieUrl: null,
    licenceUrl: null,
    kekeUrl: null,
  },
];

export function ReviewQueue() {
  const supabase = useMemo(() => {
    const config = readPublicSupabase({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
    return config ? createDropSupabase(config) : null;
  }, []);

  if (!supabase) {
    return <SampleQueue />;
  }
  return <LiveQueue client={supabase} />;
}

function SampleQueue() {
  const [riders, setRiders] = useState(sampleRiders);
  const [note, setNote] = useState<string | null>(null);
  return (
    <Shell subtitle="Sample queue" onSignOut={null}>
      <p style={styles.banner}>
        Sample rider. This is not a real person. Add the Supabase URL and anon key to review real
        applications. Nothing on this page is saved.
      </p>
      {note ? <p style={styles.note}>{note}</p> : null}
      <Queue
        riders={riders}
        onApprove={(id) => {
          setRiders((current) => current.filter((rider) => rider.id !== id));
          setNote('Sample only. Emeka was not approved in a database.');
        }}
        onReject={(id, reason) => {
          const problem = reviewReasonError(reason);
          if (problem) {
            setNote(problem);
            return;
          }
          setRiders((current) => current.filter((rider) => rider.id !== id));
          setNote('Sample only. Nothing was saved.');
        }}
      />
    </Shell>
  );
}

function LiveQueue({ client }: { client: DropSupabase }) {
  const [signIn, dispatch] = useReducer(signInReducer, undefined, initialSignInState);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [riders, setRiders] = useState<QueueRider[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      if (!session?.user) {
        setAllowed(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }
    let active = true;
    void (async () => {
      try {
        const profile = await loadProfile(client, userId);
        if (!active) {
          return;
        }
        const isAdmin = profile?.role === 'admin' && profile.status === 'active';
        setAllowed(isAdmin);
        if (isAdmin) {
          setRiders(await loadPending(client));
        }
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Could not load riders.');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [client, userId]);

  async function signOut() {
    await signOutDrop(client);
    setRiders([]);
    setAllowed(null);
  }

  if (!userId) {
    const phone = phoneFromNational(signIn.national);
    return (
      <Shell subtitle="Admin sign-in" onSignOut={null}>
        <h2 style={styles.h2}>Sign in with your admin number</h2>
        <p style={styles.help}>
          Use the Nigerian mobile number on the admin account. We will text you a code.
        </p>
        {signIn.step === 'phone' || !phone ? (
          <form
            style={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              if (!phone) {
                dispatch({ type: 'fail', message: 'Enter a valid Nigerian mobile number.' });
                return;
              }
              void run(setBusy, dispatch, async () => {
                await sendPhoneCode(client, phone, 'passenger');
                dispatch({ type: 'codeSent', nowMs: Date.now() });
              });
            }}
          >
            <label style={styles.label} htmlFor="admin-phone">
              Mobile number
            </label>
            <div style={styles.phoneRow}>
              <span style={styles.prefix}>+234</span>
              <input
                id="admin-phone"
                value={signIn.national}
                onChange={(event) => dispatch({ type: 'editPhone', value: event.target.value })}
                inputMode="tel"
                autoComplete="tel"
                placeholder="801 234 5678"
                style={styles.input}
              />
            </div>
            {signIn.error ? <p style={styles.error}>{signIn.error}</p> : null}
            <button type="submit" style={styles.primary} disabled={busy}>
              {busy ? 'Sending code…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form
            style={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              if (!isCompleteOtp(signIn.code)) {
                dispatch({
                  type: 'fail',
                  message: 'Enter the 6-digit code from the text message.',
                });
                return;
              }
              void run(setBusy, dispatch, async () => {
                await verifyPhoneCode(client, phone, signIn.code);
              });
            }}
          >
            <label style={styles.label} htmlFor="admin-code">
              Code sent to {maskNigerianPhone(phone)}
            </label>
            <input
              id="admin-code"
              value={signIn.code}
              onChange={(event) => dispatch({ type: 'editCode', value: event.target.value })}
              inputMode="numeric"
              autoComplete="one-time-code"
              style={styles.input}
            />
            {signIn.error ? <p style={styles.error}>{signIn.error}</p> : null}
            <button type="submit" style={styles.primary} disabled={busy}>
              {busy ? 'Checking…' : 'Continue'}
            </button>
            <button
              type="button"
              style={styles.secondary}
              onClick={() => dispatch({ type: 'back' })}
            >
              Change number
            </button>
          </form>
        )}
      </Shell>
    );
  }

  if (allowed === null) {
    return (
      <Shell subtitle="Admin" onSignOut={() => void signOut()}>
        <p style={styles.help}>Checking your account…</p>
      </Shell>
    );
  }

  if (!allowed) {
    return (
      <Shell subtitle="Admin" onSignOut={() => void signOut()}>
        <h2 style={styles.h2}>This page is for the DROP team</h2>
        <p style={styles.help}>This number is signed in, but it is not an admin account.</p>
      </Shell>
    );
  }

  return (
    <Shell subtitle="Rider review" onSignOut={() => void signOut()}>
      {loadError ? <p style={styles.error}>{loadError}</p> : null}
      <Queue
        riders={riders}
        onApprove={(id) => {
          void run(setBusy, dispatch, async () => {
            await reviewRider(client, id, 'approved', null);
            setRiders((current) => current.filter((rider) => rider.id !== id));
          });
        }}
        onReject={(id, reason) => {
          const problem = reviewReasonError(reason);
          if (problem) {
            dispatch({ type: 'fail', message: problem });
            return;
          }
          void run(setBusy, dispatch, async () => {
            await reviewRider(client, id, 'rejected', reason.trim());
            setRiders((current) => current.filter((rider) => rider.id !== id));
          });
        }}
      />
      {signIn.error ? <p style={styles.error}>{signIn.error}</p> : null}
      {busy ? <p style={styles.help}>Saving…</p> : null}
    </Shell>
  );
}

function Queue({
  riders,
  onApprove,
  onReject,
}: {
  riders: QueueRider[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  if (riders.length === 0) {
    return <p style={styles.help}>No riders are waiting for review.</p>;
  }
  return (
    <ul style={styles.list}>
      {riders.map((rider) => (
        <li key={rider.id} style={styles.card}>
          <h2 style={styles.h2}>{rider.fullName}</h2>
          <p style={styles.meta}>{rider.phone}</p>
          <p style={styles.meta}>Licence {rider.licenceNumber}</p>
          <p style={styles.meta}>Plate {rider.plate}</p>
          <p style={styles.meta}>NIN ending {rider.ninLast4}</p>
          <p style={styles.links}>
            <DocLink href={rider.selfieUrl} label="Face photo" />
            <DocLink href={rider.licenceUrl} label="Licence photo" />
            <DocLink href={rider.kekeUrl} label="Keke photo" />
          </p>
          <label style={styles.label} htmlFor={`reason-${rider.id}`}>
            Reason if you reject
          </label>
          <textarea
            id={`reason-${rider.id}`}
            value={reasons[rider.id] ?? ''}
            onChange={(event) =>
              setReasons((current) => ({ ...current, [rider.id]: event.target.value }))
            }
            style={styles.textarea}
          />
          <div style={styles.actions}>
            <button type="button" style={styles.primary} onClick={() => onApprove(rider.id)}>
              Approve
            </button>
            <button
              type="button"
              style={styles.danger}
              onClick={() => onReject(rider.id, reasons[rider.id] ?? '')}
            >
              Reject
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DocLink({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return <span style={styles.meta}>{label} not uploaded</span>;
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" style={styles.link}>
      {label}
    </a>
  );
}

function Shell({
  subtitle,
  onSignOut,
  children,
}: {
  subtitle: string;
  onSignOut: (() => void) | null;
  children: React.ReactNode;
}) {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.wordmark}>DROP</p>
          <h1 style={styles.h1}>{subtitle}</h1>
        </div>
        {onSignOut ? (
          <button type="button" style={styles.secondary} onClick={onSignOut}>
            Sign out
          </button>
        ) : null}
      </header>
      {children}
    </main>
  );
}

async function loadPending(client: DropSupabase): Promise<QueueRider[]> {
  const { data, error } = await client
    .from('riders')
    .select(
      'profile_id, licence_number, nin_last4, selfie_path, licence_photo_path, profiles(full_name, phone), kekes(plate_number, photo_path, active)',
    )
    .eq('verification_status', 'pending');
  if (error) {
    throw new Error(error.message);
  }
  const rows = (data ?? []) as unknown as RawRider[];
  return Promise.all(
    rows.map(async (row) => {
      const profile = first(row.profiles);
      const keke = (Array.isArray(row.kekes) ? row.kekes : row.kekes ? [row.kekes] : []).find(
        (item) => item.active,
      );
      const [selfieUrl, licenceUrl, kekeUrl] = await Promise.all([
        signedDocumentUrl(client, row.selfie_path),
        signedDocumentUrl(client, row.licence_photo_path),
        signedDocumentUrl(client, keke?.photo_path ?? null),
      ]);
      return {
        id: row.profile_id,
        fullName: profile?.full_name ?? 'Rider',
        phone: profile?.phone ?? '',
        licenceNumber: row.licence_number ?? '—',
        plate: keke?.plate_number ?? '—',
        ninLast4: row.nin_last4 ?? '—',
        selfieUrl,
        licenceUrl,
        kekeUrl,
      };
    }),
  );
}

type RawProfile = { full_name: string; phone: string | null };
type RawKeke = { plate_number: string; photo_path: string | null; active: boolean };
type RawRider = {
  profile_id: string;
  licence_number: string | null;
  nin_last4: string | null;
  selfie_path: string | null;
  licence_photo_path: string | null;
  profiles: RawProfile | RawProfile[] | null;
  kekes: RawKeke | RawKeke[] | null;
};

function first<T>(value: T | T[] | null): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
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

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 720,
    margin: '0 auto',
    padding: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  wordmark: {
    margin: 0,
    color: colors.primary,
    fontWeight: 700,
    letterSpacing: 1.4,
    fontSize: 22,
  },
  h1: {
    margin: `${spacing.xxs}px 0 0`,
    color: colors.textPrimary,
    fontSize: typeScale.title.fontSize,
    lineHeight: `${typeScale.title.lineHeight}px`,
  },
  h2: {
    margin: 0,
    color: colors.textPrimary,
    fontSize: typeScale.headline.fontSize,
    lineHeight: `${typeScale.headline.lineHeight}px`,
  },
  help: {
    margin: 0,
    color: colors.textSecondary,
    fontSize: typeScale.body.fontSize,
    lineHeight: `${typeScale.body.lineHeight}px`,
  },
  banner: {
    margin: 0,
    background: colors.surface3,
    color: colors.textPrimary,
    borderRadius: radii.card,
    padding: spacing.md,
    fontSize: typeScale.body.fontSize,
    lineHeight: `${typeScale.body.lineHeight}px`,
  },
  note: { margin: 0, color: colors.success, fontSize: typeScale.body.fontSize },
  error: { margin: 0, color: colors.danger, fontSize: typeScale.body.fontSize },
  form: { display: 'flex', flexDirection: 'column', gap: spacing.sm },
  label: { color: colors.textSecondary, fontSize: typeScale.footnote.fontSize },
  phoneRow: { display: 'flex', gap: spacing.xs },
  prefix: {
    display: 'flex',
    alignItems: 'center',
    padding: `0 ${spacing.md}px`,
    minHeight: 48,
    borderRadius: radii.card,
    background: colors.surface3,
    color: colors.textPrimary,
    fontWeight: 600,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.card,
    border: `1px solid ${colors.separator}`,
    background: colors.surface3,
    color: colors.textPrimary,
    padding: `0 ${spacing.md}px`,
    fontSize: typeScale.body.fontSize,
  },
  textarea: {
    minHeight: 72,
    borderRadius: radii.card,
    border: `1px solid ${colors.separator}`,
    background: colors.surface3,
    color: colors.textPrimary,
    padding: spacing.sm,
    fontSize: typeScale.body.fontSize,
    fontFamily: 'inherit',
  },
  primary: {
    minHeight: 48,
    border: 0,
    borderRadius: radii.pill,
    background: colors.primary,
    color: colors.onPrimary,
    fontWeight: 600,
    fontSize: typeScale.headline.fontSize,
    padding: `0 ${spacing.lg}px`,
    cursor: 'pointer',
  },
  secondary: {
    minHeight: 48,
    border: `1px solid ${colors.separator}`,
    borderRadius: radii.pill,
    background: colors.surface3,
    color: colors.textPrimary,
    fontWeight: 600,
    fontSize: typeScale.callout.fontSize,
    padding: `0 ${spacing.md}px`,
    cursor: 'pointer',
  },
  danger: {
    minHeight: 48,
    border: 0,
    borderRadius: radii.pill,
    background: colors.surface3,
    color: colors.danger,
    fontWeight: 600,
    fontSize: typeScale.headline.fontSize,
    padding: `0 ${spacing.lg}px`,
    cursor: 'pointer',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  card: {
    background: colors.surface1,
    border: `1px solid ${colors.separator}`,
    borderRadius: radii.card,
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  meta: { margin: 0, color: colors.textSecondary, fontSize: typeScale.body.fontSize },
  links: { display: 'flex', flexWrap: 'wrap', gap: spacing.sm },
  link: { color: colors.primary, fontWeight: 600 },
  actions: { display: 'flex', gap: spacing.sm, marginTop: spacing.sm },
};
