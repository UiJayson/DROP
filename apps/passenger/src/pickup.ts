export type PickupSource = 'device' | 'sample' | 'confirmed-sample';

/** A connected request may use a phone fix, or the sample Ikeja point after an explicit confirm. */
export function canRequestPickup(source: PickupSource): boolean {
  return source === 'device' || source === 'confirmed-sample';
}

export const SAMPLE_PICKUP_MESSAGE =
  'Pickup is still the sample point at Allen Avenue, Ikeja. Confirm that pickup, or turn location on.';
