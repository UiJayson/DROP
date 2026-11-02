import { isSentryDsnConfigured } from '@drop/shared';

/** Starts Sentry only when NEXT_PUBLIC_SENTRY_DSN is set. */
export async function initAdminSentry(
  dsn: string | undefined = process.env.NEXT_PUBLIC_SENTRY_DSN,
): Promise<boolean> {
  if (!isSentryDsnConfigured(dsn)) {
    return false;
  }

  const Sentry = await import('@sentry/nextjs');
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
  });
  return true;
}
