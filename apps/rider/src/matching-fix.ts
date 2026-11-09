export const LOCATION_OFF_MESSAGE =
  'Location is off. You will not be offered trips until DROP can see your Keke.';

/** A matching ping is sent only for a real device fix. Never substitute a sample point. */
export function matchingPing(
  located: { lat: number; lng: number } | null,
): { send: true; point: { lat: number; lng: number } } | { send: false; message: string } {
  if (!located) {
    return { send: false, message: LOCATION_OFF_MESSAGE };
  }
  return { send: true, point: located };
}
