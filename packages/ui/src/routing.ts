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

export function readPreview<T extends string>(allowed: readonly T[]): T | null {
  const search = locationSearch();
  if (!search) {
    return null;
  }
  const value = new URLSearchParams(search).get('preview');
  if (value && allowed.some((item) => item === value)) {
    return value as T;
  }
  return null;
}

/** Deep-linked screenshots skip motion so captures are stable. */
export function prefersStaticMotion(): boolean {
  const search = locationSearch();
  if (!search) {
    return false;
  }
  const params = new URLSearchParams(search);
  return params.has('screen') || params.has('preview');
}
