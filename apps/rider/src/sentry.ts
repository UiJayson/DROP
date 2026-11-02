import { isSentryDsnConfigured } from '@drop/shared';

/** Starts Sentry only when EXPO_PUBLIC_SENTRY_DSN is set. */
export async function initSentry(
  dsn: string | undefined = process.env.EXPO_PUBLIC_SENTRY_DSN,
): Promise<boolean> {
  if (!isSentryDsnConfigured(dsn)) {
    return false;
  }

  const Sentry = await import('@sentry/react-native');
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
  });
  return true;
}
