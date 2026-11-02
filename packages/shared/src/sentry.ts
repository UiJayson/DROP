/** True when an app should turn Sentry on. Empty values stay off so local setup still boots. */
export function isSentryDsnConfigured(dsn: string | undefined): boolean {
  return typeof dsn === 'string' && dsn.trim().length > 0;
}
