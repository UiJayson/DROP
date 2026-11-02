/**
 * These lists mirror the Postgres enums in supabase/migrations.
 * Keep the two in sync when a value is added.
 */
export const userRoles = ['passenger', 'rider', 'admin'] as const;
export type UserRole = (typeof userRoles)[number];

export const profileStatuses = ['active', 'suspended'] as const;
export type ProfileStatus = (typeof profileStatuses)[number];

export const verificationStatuses = ['pending', 'approved', 'rejected', 'suspended'] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];

export const zoneTypes = ['service', 'restricted'] as const;
export type ZoneType = (typeof zoneTypes)[number];

export const requestStatuses = ['searching', 'matched', 'expired', 'cancelled'] as const;
export type RequestStatus = (typeof requestStatuses)[number];

export const offerTypes = ['accept', 'counter'] as const;
export type OfferType = (typeof offerTypes)[number];

export const offerStatuses = ['open', 'selected', 'rejected', 'expired', 'withdrawn'] as const;
export type OfferStatus = (typeof offerStatuses)[number];

export const tripStatuses = [
  'assigned',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type TripStatus = (typeof tripStatuses)[number];

export const paymentMethods = ['cash'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentStatuses = ['pending', 'confirmed', 'disputed'] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const reportStatuses = ['open', 'in_review', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export const devicePlatforms = ['ios', 'android', 'web'] as const;
export type DevicePlatform = (typeof devicePlatforms)[number];
