/**
 * Edge function names from the architecture doc.
 * Calling them is a later milestone. This list is only the contract.
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
