/**
 * Server action names from the architecture doc.
 * Matching (fare quote through select) runs as Postgres functions so the
 * fare lock and the one-trip rule happen in one transaction. The names here
 * stay in the contract; the apps call the snake_case functions in booking.ts.
 */
export const edgeFunctionNames = [
  'fare-quote',
  'create-request',
  'raise-offer',
  'cancel-request',
  'submit-offer',
  'withdraw-offer',
  'select-offer',
  'rider-status',
  'location-ping',
  'arrive',
  'start-trip',
  'complete-trip',
  'cancel-trip',
  'confirm-cash',
  'dispute-payment',
  'rate-trip',
  'create-report',
  'create-share-link',
  'public-trip',
  'kyc-submit',
  'admin-review-rider',
] as const;

export type EdgeFunctionName = (typeof edgeFunctionNames)[number];
