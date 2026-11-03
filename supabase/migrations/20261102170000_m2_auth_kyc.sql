-- M2: rider KYC fields, private document bucket, and server-side gates.
-- Money stays integer kobo on the fare tables. This milestone adds no money columns.
-- The full NIN is never stored. Mock check rules match packages/shared/src/nin.ts.

set search_path = public, extensions;

alter table public.riders
  add column licence_number text,
  add column licence_photo_path text,
  add column nin_reference text,
  add column nin_hash text,
  add column rejection_reason text;

alter table public.riders
  add constraint riders_licence_chk check (
    licence_number is null or licence_number ~ '^[A-Z0-9]{6,20}$'
  ),
  add constraint riders_nin_reference_chk check (
    nin_reference is null or char_length(nin_reference) between 4 and 80
  ),
  add constraint riders_nin_hash_chk check (
    nin_hash is null or nin_hash ~ '^[0-9a-f]{64}$'
  ),
  add constraint riders_rejection_chk check (
    rejection_reason is null or char_length(rejection_reason) between 3 and 280
  );

create unique index riders_nin_hash_unique on public.riders (nin_hash) where nin_hash is not null;

create index riders_verification_status_idx on public.riders (verification_status);

comment on column public.riders.nin_hash is
  'SHA-256 of the NIN. Used to spot duplicates. The full number is not stored.';
comment on column public.riders.nin_reference is
  'Reference returned by the NIN provider. mock_* means the stand-in provider.';
comment on column public.riders.licence_number is
  'Driver licence number, stored without spaces.';

-- Clients cannot assign themselves admin. passenger and rider may come from sign-up metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  app_role text;
  user_role text;
  resolved public.user_role := 'passenger';
  display_name text;
begin
  app_role := nullif(new.raw_app_meta_data ->> 'role', '');
  user_role := nullif(new.raw_user_meta_data ->> 'role', '');

  if app_role in ('passenger', 'rider', 'admin') then
    resolved := app_role::public.user_role;
  elsif user_role in ('passenger', 'rider') then
    resolved := user_role::public.user_role;
  end if;

  display_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  if display_name is null then
    display_name := 'New user';
  end if;

  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    resolved,
    display_name,
    nullif(to_jsonb(new) ->> 'phone', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.riders_block_unapproved_online()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_online and new.verification_status is distinct from 'approved' then
    raise exception 'A rider cannot go online until DROP approves them.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger riders_block_unapproved_online
  before insert or update of is_online, verification_status on public.riders
  for each row execute function public.riders_block_unapproved_online();

create or replace function public.mock_verify_nin(p_nin text)
returns table (reference text, last4 text, nin_hash text)
language plpgsql
stable
set search_path = public
as $$
begin
  if p_nin is null or p_nin !~ '^[0-9]{11}$' then
    raise exception 'Enter the 11-digit NIN.'
      using errcode = 'check_violation';
  end if;

  if p_nin = '00000000000' then
    raise exception 'NIN check is unavailable. Try again shortly.'
      using errcode = 'check_violation';
  end if;

  if right(p_nin, 4) = '0000' then
    raise exception 'The name does not match this NIN.'
      using errcode = 'check_violation';
  end if;

  reference := 'mock_' || right(p_nin, 4);
  last4 := right(p_nin, 4);
  nin_hash := encode(extensions.digest(convert_to(p_nin, 'UTF8'), 'sha256'), 'hex');
  return next;
end;
$$;

create or replace function public._m2_own_photo(p_path text, p_kind text)
returns boolean
language sql
stable
as $$
  select p_path ~ (
    '^' || auth.uid()::text || '/' || p_kind || '\.(jpg|jpeg|png|webp)$'
  );
$$;

create or replace function public.submit_rider_onboarding(
  p_full_name text,
  p_licence_number text,
  p_plate_number text,
  p_selfie_path text,
  p_licence_photo_path text,
  p_keke_photo_path text,
  p_nin text
)
returns public.verification_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := auth.uid();
  v_name text := nullif(btrim(p_full_name), '');
  v_licence text := upper(regexp_replace(coalesce(p_licence_number, ''), '[\s-]+', '', 'g'));
  v_plate text := upper(regexp_replace(coalesce(p_plate_number, ''), '\s+', '', 'g'));
  v_check record;
  v_status public.verification_status;
begin
  if v_id is null then
    raise exception 'Sign in first.'
      using errcode = 'insufficient_privilege';
  end if;

  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'Enter the name passengers should use.'
      using errcode = 'check_violation';
  end if;

  if v_licence !~ '^[A-Z0-9]{6,20}$' then
    raise exception 'Enter the licence number from the card.'
      using errcode = 'check_violation';
  end if;

  if v_plate !~ '^[A-Z0-9-]{4,12}$' then
    raise exception 'Enter the plate on the Keke.'
      using errcode = 'check_violation';
  end if;

  if not public._m2_own_photo(p_selfie_path, 'selfie')
    or not public._m2_own_photo(p_licence_photo_path, 'licence')
    or not public._m2_own_photo(p_keke_photo_path, 'keke') then
    raise exception 'Upload the face, licence, and Keke photos first.'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1
    from public.riders
    where profile_id = v_id
      and verification_status = 'approved'
  ) then
    raise exception 'You are already approved.'
      using errcode = 'check_violation';
  end if;

  select * into v_check from public.mock_verify_nin(p_nin);

  update public.profiles
  set full_name = v_name,
      photo_url = p_selfie_path
  where id = v_id;

  insert into public.riders (
    profile_id,
    verification_status,
    licence_number,
    licence_photo_path,
    selfie_path,
    nin_last4,
    nin_reference,
    nin_hash,
    nin_verified_at,
    is_online,
    rejection_reason,
    approved_by,
    approved_at
  )
  values (
    v_id,
    'pending',
    v_licence,
    p_licence_photo_path,
    p_selfie_path,
    v_check.last4,
    v_check.reference,
    v_check.nin_hash,
    now(),
    false,
    null,
    null,
    null
  )
  on conflict (profile_id) do update
  set verification_status = 'pending',
      licence_number = excluded.licence_number,
      licence_photo_path = excluded.licence_photo_path,
      selfie_path = excluded.selfie_path,
      nin_last4 = excluded.nin_last4,
      nin_reference = excluded.nin_reference,
      nin_hash = excluded.nin_hash,
      nin_verified_at = excluded.nin_verified_at,
      is_online = false,
      rejection_reason = null,
      approved_by = null,
      approved_at = null
  where public.riders.verification_status is distinct from 'approved'
  returning verification_status into v_status;

  if v_status is null then
    raise exception 'You are already approved.'
      using errcode = 'check_violation';
  end if;

  update public.kekes
  set plate_number = v_plate,
      colour = 'Yellow',
      photo_path = p_keke_photo_path,
      active = true
  where rider_id = v_id
    and active;

  if not found then
    insert into public.kekes (rider_id, plate_number, colour, photo_path, active)
    values (v_id, v_plate, 'Yellow', p_keke_photo_path, true);
  end if;

  insert into public.audit_log (entity, entity_id, actor_id, event, payload)
  values (
    'rider',
    v_id,
    v_id,
    'kyc_submitted',
    jsonb_build_object('nin_last4', v_check.last4, 'provider', 'mock')
  );

  return v_status;
exception
  when unique_violation then
    if sqlerrm ilike '%nin_hash%' then
      raise exception 'This NIN is already registered.'
        using errcode = 'unique_violation';
    end if;
    raise exception 'This plate is already registered.'
      using errcode = 'unique_violation';
end;
$$;

create or replace function public.set_rider_online(p_online boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := auth.uid();
  v_status public.verification_status;
  v_account public.profile_status;
begin
  if v_id is null then
    raise exception 'Sign in first.'
      using errcode = 'insufficient_privilege';
  end if;

  select verification_status into v_status
  from public.riders
  where profile_id = v_id;

  if v_status is null then
    raise exception 'Finish rider signup first.'
      using errcode = 'check_violation';
  end if;

  select status into v_account from public.profiles where id = v_id;

  if p_online and v_account is distinct from 'active' then
    raise exception 'This account is paused.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_online and v_status is distinct from 'approved' then
    raise exception 'A rider cannot go online until DROP approves them.'
      using errcode = 'check_violation';
  end if;

  update public.riders
  set is_online = p_online,
      last_seen_at = case when p_online then now() else last_seen_at end
  where profile_id = v_id;

  return p_online;
end;
$$;

create or replace function public.admin_review_rider(
  p_profile_id uuid,
  p_decision text,
  p_reason text
)
returns public.verification_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status public.verification_status;
begin
  if v_actor is null or not public.is_admin() then
    raise exception 'Only an admin can review riders.'
      using errcode = 'insufficient_privilege';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Choose approve or reject.'
      using errcode = 'check_violation';
  end if;

  if p_decision = 'rejected' and (v_reason is null or char_length(v_reason) < 3) then
    raise exception 'Add a short reason for the rider.'
      using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.riders where profile_id = p_profile_id) then
    raise exception 'Rider not found.'
      using errcode = 'no_data_found';
  end if;

  v_status := p_decision::public.verification_status;

  update public.riders
  set verification_status = v_status,
      rejection_reason = case when v_status = 'rejected' then v_reason else null end,
      approved_by = case when v_status = 'approved' then v_actor else null end,
      approved_at = case when v_status = 'approved' then now() else null end,
      is_online = false
  where profile_id = p_profile_id;

  insert into public.audit_log (entity, entity_id, actor_id, event, payload)
  values (
    'rider',
    p_profile_id,
    v_actor,
    case when v_status = 'approved' then 'rider_approved' else 'rider_rejected' end,
    jsonb_build_object('reason', v_reason)
  );

  return v_status;
end;
$$;

revoke all on function public.mock_verify_nin(text) from public, anon, authenticated;
revoke all on function public._m2_own_photo(text, text) from public, anon, authenticated;
revoke all on function public.riders_block_unapproved_online() from public, anon, authenticated;
revoke all on function public.submit_rider_onboarding(text, text, text, text, text, text, text) from public, anon;
revoke all on function public.set_rider_online(boolean) from public, anon;
revoke all on function public.admin_review_rider(uuid, text, text) from public, anon;

grant execute on function public.submit_rider_onboarding(text, text, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.set_rider_online(boolean) to authenticated, service_role;
grant execute on function public.admin_review_rider(uuid, text, text) to authenticated, service_role;

-- Own row or an admin. Trip cards use approved_rider_profiles, which omits NIN and licence.
drop policy if exists riders_select_self_admin_or_active_trip on public.riders;
create policy riders_select_own_or_admin
  on public.riders
  for select
  to authenticated
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists kekes_select_own_admin_or_active_trip on public.kekes;
create policy kekes_select_own_or_admin
  on public.kekes
  for select
  to authenticated
  using (rider_id = auth.uid() or public.is_admin());

grant select (
  licence_number,
  licence_photo_path,
  selfie_path,
  nin_last4,
  nin_reference,
  rejection_reason
) on public.riders to authenticated;

revoke select (
  licence_number,
  licence_photo_path,
  selfie_path,
  nin_last4,
  nin_reference,
  nin_hash,
  rejection_reason
) on public.riders from anon;

-- Private bucket for face, licence, and Keke photos.
-- Bare Postgres has no storage schema. Create a stand-in only when storage.objects
-- is absent, so policies can be tested. Hosted Supabase already owns that schema;
-- creating or granting there raises 42501.
do $storage$
begin
  if exists (
    select 1
    from pg_namespace
    where nspname = 'storage'
  ) and exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage'
      and c.relname = 'objects'
      and c.relkind in ('r', 'p')
  ) then
    return;
  end if;

  create schema if not exists storage;

  create table if not exists storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false
  );

  create table if not exists storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text,
    owner uuid,
    created_at timestamptz not null default now(),
    unique (bucket_id, name)
  );

  alter table storage.objects enable row level security;

  grant usage on schema storage to anon, authenticated, service_role;
  grant select on storage.buckets to anon, authenticated, service_role;
  grant select on storage.objects to anon, authenticated, service_role;
  grant insert, update on storage.objects to authenticated, service_role;
end
$storage$;

insert into storage.buckets (id, name, public)
values ('rider-documents', 'rider-documents', false)
on conflict (id) do update set public = false;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'storage'
      and table_name = 'buckets'
      and column_name = 'file_size_limit'
  ) then
    update storage.buckets
    set file_size_limit = 8388608
    where id = 'rider-documents';
  end if;
end
$$;

drop policy if exists rider_documents_select_own on storage.objects;
create policy rider_documents_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'rider-documents'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists rider_documents_insert_own on storage.objects;
create policy rider_documents_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'rider-documents'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists rider_documents_update_own on storage.objects;
create policy rider_documents_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'rider-documents'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'rider-documents'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists rider_documents_select_admin on storage.objects;
create policy rider_documents_select_admin
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'rider-documents'
    and public.is_admin()
  );

comment on table public.riders is
  'Rider KYC and presence. Full NIN is not stored. is_online requires verification_status approved.';
