import type { LatLng } from '@drop/shared';

/** Same browser geolocation the booking flow already uses. No extra location library. */
export function readDeviceFix(): Promise<LatLng | null> {
  const geo = globalThis.navigator?.geolocation;
  if (!geo) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 15_000, timeout: 8_000 },
    );
  });
}
