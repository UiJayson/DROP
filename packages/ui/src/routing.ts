function locationSearch(): string | undefined {
  const scope = globalThis as { location?: { search?: string } };
  const search = scope.location?.search;
  return typeof search === 'string' ? search : undefined;
}

export function readInitialScreen<T extends string>(allowed: readonly T[], fallback: T): T {
  const search = locationSearch();
  if (!search) {
    return fallback;
  }
  const value = new URLSearchParams(search).get('screen');
  if (value && allowed.some((item) => item === value)) {
    return value as T;
  }
  return fallback;
}

/** Deep-linked screenshots skip motion so captures are stable. */
export function prefersStaticMotion(): boolean {
  const search = locationSearch();
  if (!search) {
    return false;
  }
  return new URLSearchParams(search).has('screen');
}
