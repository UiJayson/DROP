import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  KYC_SIGNED_URL_SECONDS,
  RIDER_DOCUMENTS_BUCKET,
  documentPath,
  mapAuthError,
  type VerificationStatus,
} from '@drop/shared';

import type { SupabasePublicConfig } from './config';

export type DropSupabase = SupabaseClient;

type AuthStorage = {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
};

export type SessionUser = {
  id: string;
  phone: string | null;
};

export type AccountProfile = {
  fullName: string;
  role: 'passenger' | 'rider' | 'admin';
  status: 'active' | 'suspended';
  phone: string | null;
};

export type RiderAccount = {
  status: VerificationStatus;
  rejectionReason: string | null;
};

export function createDropSupabase(
  config: SupabasePublicConfig,
  storage?: AuthStorage,
): DropSupabase {
  return createClient(config.url, config.anonKey, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

export function sessionUser(
  user: { id: string; phone?: string | null } | null,
): SessionUser | null {
  if (!user) {
    return null;
  }
  return { id: user.id, phone: user.phone ?? null };
}

export async function sendPhoneCode(
  client: DropSupabase,
  phoneE164: string,
  role: 'passenger' | 'rider',
): Promise<void> {
  const { error } = await client.auth.signInWithOtp({
    phone: phoneE164,
    options: {
      channel: 'sms',
      shouldCreateUser: true,
      data: { role },
    },
  });
  if (error) {
    throw new Error(mapAuthError(error.message));
  }
}

export async function verifyPhoneCode(
  client: DropSupabase,
  phoneE164: string,
  token: string,
): Promise<SessionUser> {
  const { data, error } = await client.auth.verifyOtp({
    phone: phoneE164,
    token,
    type: 'sms',
  });
  if (error || !data.user) {
    throw new Error(mapAuthError(error?.message ?? 'invalid'));
  }
  return { id: data.user.id, phone: data.user.phone ?? phoneE164 };
}

export async function signOutDrop(client: DropSupabase): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) {
    throw new Error(mapAuthError(error.message));
  }
}

export async function loadProfile(
  client: DropSupabase,
  userId: string,
): Promise<AccountProfile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('full_name, role, status, phone')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  const row = data as {
    full_name: string;
    role: AccountProfile['role'];
    status: AccountProfile['status'];
    phone: string | null;
  };
  return {
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    phone: row.phone,
  };
}

export async function saveProfileName(
  client: DropSupabase,
  userId: string,
  fullName: string,
): Promise<void> {
  const { error } = await client.from('profiles').update({ full_name: fullName }).eq('id', userId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function loadRiderAccount(
  client: DropSupabase,
  userId: string,
): Promise<RiderAccount | null> {
  const { data, error } = await client
    .from('riders')
    .select('verification_status, rejection_reason')
    .eq('profile_id', userId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  const row = data as { verification_status: VerificationStatus; rejection_reason: string | null };
  return { status: row.verification_status, rejectionReason: row.rejection_reason };
}

export async function uploadRiderPhoto(
  client: DropSupabase,
  userId: string,
  kind: 'selfie' | 'licence' | 'keke',
  file: { bytes: ArrayBuffer; ext: 'jpg' | 'png' | 'webp'; contentType: string },
): Promise<string> {
  const path = documentPath(userId, kind, file.ext);
  const { error } = await client.storage.from(RIDER_DOCUMENTS_BUCKET).upload(path, file.bytes, {
    upsert: true,
    contentType: file.contentType,
  });
  if (error) {
    throw new Error(error.message);
  }
  return path;
}

export async function submitRiderApplication(
  client: DropSupabase,
  input: {
    fullName: string;
    licenceNumber: string;
    plateNumber: string;
    selfiePath: string;
    licencePhotoPath: string;
    kekePhotoPath: string;
    nin: string;
  },
): Promise<void> {
  const { error } = await client.rpc('submit_rider_onboarding', {
    p_full_name: input.fullName,
    p_licence_number: input.licenceNumber,
    p_plate_number: input.plateNumber,
    p_selfie_path: input.selfiePath,
    p_licence_photo_path: input.licencePhotoPath,
    p_keke_photo_path: input.kekePhotoPath,
    p_nin: input.nin,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function setRiderOnline(client: DropSupabase, online: boolean): Promise<void> {
  const { error } = await client.rpc('set_rider_online', { p_online: online });
  if (error) {
    throw new Error(error.message);
  }
}

export async function reviewRider(
  client: DropSupabase,
  profileId: string,
  decision: 'approved' | 'rejected',
  reason: string | null,
): Promise<void> {
  const { error } = await client.rpc('admin_review_rider', {
    p_profile_id: profileId,
    p_decision: decision,
    p_reason: reason,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function signedDocumentUrl(
  client: DropSupabase,
  path: string | null,
): Promise<string | null> {
  if (!path) {
    return null;
  }
  const { data, error } = await client.storage
    .from(RIDER_DOCUMENTS_BUCKET)
    .createSignedUrl(path, KYC_SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}
