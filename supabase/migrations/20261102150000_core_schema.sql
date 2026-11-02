-- DROP core schema (M0).
-- Money is integer kobo. One offer row per rider per request.
-- agreed_fare_kobo cannot change after insert.
-- Enum values match packages/shared/src/enums.ts.

set search_path = public, extensions;

create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

-- Hosted Supabase already provides these. A bare Postgres image does not.
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth'
      and p.proname = 'jwt'
  ) then
    create function auth.jwt()
    returns jsonb
    language sql
    stable
    as $fn$
      select coalesce(
        nullif(current_setting('request.jwt.claims', true), '')::jsonb,
        '{}'::jsonb
      );
    $fn$;
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth'
      and p.proname = 'uid'
  ) then
    create function auth.uid()
    returns uuid
    language sql
    stable
    as $fn$
      select nullif(auth.jwt() ->> 'sub', '')::uuid;
    $fn$;
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth'
      and p.proname = 'role'
  ) then
    create function auth.role()
    returns text
    language sql
    stable
    as $fn$
      select nullif(auth.jwt() ->> 'role', '');
    $fn$;
  end if;
end
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;

create type public.user_role as enum ('passenger', 'rider', 'admin');
create type public.profile_status as enum ('active', 'suspended');
create type public.verification_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.zone_type as enum ('service', 'restricted');
create type public.request_status as enum ('searching', 'matched', 'expired', 'cancelled');
create type public.offer_type as enum ('accept', 'counter');
create type public.offer_status as enum ('open', 'selected', 'rejected', 'expired', 'withdrawn');
create type public.trip_status as enum ('assigned', 'arrived', 'in_progress', 'completed', 'cancelled');
create type public.payment_method as enum ('cash');
create type public.payment_status as enum ('pending', 'confirmed', 'disputed');
create type public.report_status as enum ('open', 'in_review', 'resolved', 'dismissed');
create type public.device_platform as enum ('ios', 'android', 'web');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'passenger',
  full_name text not null,
  phone text,
  photo_url text,
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  constraint profiles_full_name_chk check (char_length(btrim(full_name)) between 1 and 120),
  constraint profiles_phone_chk check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint profiles_phone_key unique (phone),
  constraint profiles_rating_avg_chk check (rating_avg >= 0 and rating_avg <= 5),
  constraint profiles_rating_count_chk check (rating_count >= 0)
);

comment on table public.profiles is
  'One row per auth user. role is the primary account type. A riders row lets that person also ride.';

create table public.riders (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  verification_status public.verification_status not null default 'pending',
  nin_last4 text,
  nin_verified_at timestamptz,
  selfie_path text,
  is_online boolean not null default false,
  seats_occupied integer not null default 0,
  last_location geography(Point, 4326),
  last_seen_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint riders_nin_last4_chk check (nin_last4 is null or nin_last4 ~ '^[0-9]{4}$'),
  constraint riders_seats_chk check (seats_occupied between 0 and 3)
);

comment on column public.riders.nin_last4 is
  'Last four digits only. The full NIN stays with the verification provider.';

create table public.kekes (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders (profile_id) on delete cascade,
  plate_number text not null,
  colour text not null,
  photo_path text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint kekes_plate_chk check (char_length(btrim(plate_number)) between 1 and 20),
  constraint kekes_colour_chk check (char_length(btrim(colour)) between 1 and 40)
);

create unique index kekes_plate_number_unique on public.kekes (upper(plate_number));
create unique index kekes_one_active_per_rider on public.kekes (rider_id) where active;

create table public.service_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area geography(MultiPolygon, 4326) not null,
  type public.zone_type not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint service_zones_name_chk check (char_length(btrim(name)) between 1 and 120)
);

create table public.fare_rules (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.service_zones (id) on delete restrict,
  base_kobo integer not null,
  per_km_kobo integer not null,
  min_kobo integer not null,
  range_low_pct numeric(5, 2) not null,
  range_high_pct numeric(5, 2) not null,
  effective_from timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint fare_rules_money_chk check (base_kobo >= 0 and per_km_kobo >= 0 and min_kobo >= 0),
  constraint fare_rules_pct_chk check (
    range_low_pct >= 0
    and range_low_pct <= 100
    and range_high_pct >= 0
    and range_high_pct <= 100
  )
);

create table public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.profiles (id) on delete restrict,
  pickup geography(Point, 4326) not null,
  pickup_note text,
  dropoff geography(Point, 4326) not null,
  dropoff_label text not null,
  distance_m integer not null,
  suggested_low_kobo integer not null,
  suggested_high_kobo integer not null,
  min_kobo integer not null,
  offer_kobo integer not null,
  status public.request_status not null default 'searching',
  radius_m integer not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint ride_requests_label_chk check (char_length(btrim(dropoff_label)) between 1 and 200),
  constraint ride_requests_note_chk check (pickup_note is null or char_length(pickup_note) <= 280),
  constraint ride_requests_distance_chk check (distance_m >= 0),
  constraint ride_requests_radius_chk check (radius_m > 0),
  constraint ride_requests_money_chk check (
    suggested_low_kobo >= 0
    and suggested_high_kobo >= suggested_low_kobo
    and min_kobo >= 0
    and offer_kobo >= min_kobo
  )
);

create table public.ride_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.ride_requests (id) on delete restrict,
  rider_id uuid not null references public.riders (profile_id) on delete restrict,
  type public.offer_type not null,
  amount_kobo integer not null,
  eta_s integer not null,
  seats_occupied_at_offer integer not null,
  status public.offer_status not null default 'open',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint ride_offers_one_per_rider_per_request unique (request_id, rider_id),
  constraint ride_offers_amount_chk check (amount_kobo > 0),
  constraint ride_offers_eta_chk check (eta_s >= 0),
  constraint ride_offers_seats_chk check (seats_occupied_at_offer between 0 and 3)
);

comment on constraint ride_offers_one_per_rider_per_request on public.ride_offers is
  'At most one offer, accept or counter, per rider per request.';

create table public.request_recipients (
  request_id uuid not null references public.ride_requests (id) on delete cascade,
  rider_id uuid not null references public.riders (profile_id) on delete restrict,
  round integer not null,
  sent_at timestamptz not null default now(),
  primary key (request_id, rider_id, round),
  constraint request_recipients_round_chk check (round >= 1)
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.ride_requests (id) on delete restrict,
  offer_id uuid not null unique references public.ride_offers (id) on delete restrict,
  passenger_id uuid not null references public.profiles (id) on delete restrict,
  rider_id uuid not null references public.riders (profile_id) on delete restrict,
  keke_id uuid not null references public.kekes (id) on delete restrict,
  agreed_fare_kobo integer not null,
  pin_hash text not null,
  pin_attempts integer not null default 0,
  status public.trip_status not null default 'assigned',
  cancelled_by uuid references public.profiles (id) on delete set null,
  cancel_reason text,
  assigned_at timestamptz not null default now(),
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  constraint trips_fare_chk check (agreed_fare_kobo > 0),
  constraint trips_pin_attempts_chk check (pin_attempts >= 0),
  constraint trips_pin_hash_chk check (char_length(pin_hash) > 0),
  constraint trips_cancel_reason_chk check (cancel_reason is null or char_length(cancel_reason) <= 280)
);

comment on column public.trips.agreed_fare_kobo is
  'Locked at insert. The fare-lock trigger rejects later changes.';
comment on column public.trips.pin_hash is
  'Hash of the 4-digit boarding PIN. Clients are not granted this column.';

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips (id) on delete restrict,
  method public.payment_method not null default 'cash',
  amount_kobo integer not null,
  status public.payment_status not null default 'pending',
  confirmed_by_rider_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payments_amount_chk check (amount_kobo > 0)
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete restrict,
  from_id uuid not null references public.profiles (id) on delete restrict,
  to_id uuid not null references public.profiles (id) on delete restrict,
  stars integer not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint ratings_one_direction unique (trip_id, from_id),
  constraint ratings_stars_chk check (stars between 1 and 5),
  constraint ratings_distinct_people_chk check (from_id <> to_id),
  constraint ratings_tags_chk check (cardinality(tags) <= 8)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete restrict,
  reporter_id uuid not null references public.profiles (id) on delete restrict,
  category text not null,
  details text,
  status public.report_status not null default 'open',
  assigned_admin uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint reports_category_chk check (char_length(btrim(category)) between 1 and 80),
  constraint reports_details_chk check (details is null or char_length(details) <= 2000)
);

create table public.trip_shares (
  token text primary key,
  trip_id uuid not null references public.trips (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint trip_shares_token_chk check (char_length(token) >= 16)
);

create table public.request_events (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  entity_id uuid not null,
  actor_id uuid references public.profiles (id) on delete set null,
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  at timestamptz not null default now(),
  constraint request_events_entity_chk check (char_length(btrim(entity)) between 1 and 80),
  constraint request_events_event_chk check (char_length(btrim(event)) between 1 and 80)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  entity_id uuid not null,
  actor_id uuid references public.profiles (id) on delete set null,
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  at timestamptz not null default now(),
  constraint audit_log_entity_chk check (char_length(btrim(entity)) between 1 and 80),
  constraint audit_log_event_chk check (char_length(btrim(event)) between 1 and 80)
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  push_token text not null,
  platform public.device_platform not null,
  created_at timestamptz not null default now(),
  constraint devices_token_chk check (char_length(btrim(push_token)) > 0),
  constraint devices_profile_token_unique unique (profile_id, push_token)
);

create index riders_online_location_gix
  on public.riders using gist (last_location)
  where is_online and verification_status = 'approved' and last_location is not null;

create index service_zones_area_gix on public.service_zones using gist (area);
create index ride_requests_pickup_gix on public.ride_requests using gist (pickup);
create index ride_requests_expiry_idx on public.ride_requests (status, expires_at);
create index ride_offers_expiry_idx on public.ride_offers (status, expires_at);
create index ride_requests_passenger_idx on public.ride_requests (passenger_id);
create index ride_offers_rider_idx on public.ride_offers (rider_id);
create index request_recipients_rider_idx on public.request_recipients (rider_id);
create index trips_passenger_idx on public.trips (passenger_id);
create index trips_rider_idx on public.trips (rider_id);
create index trips_status_idx on public.trips (status);
create index fare_rules_zone_effective_idx on public.fare_rules (zone_id, effective_from desc);
create index reports_status_idx on public.reports (status);
create index devices_profile_idx on public.devices (profile_id);
create index riders_presence_idx on public.riders (is_online, last_seen_at);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
        and status = 'active'
    );
$$;

create or replace function public.current_user_phone()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select phone from public.profiles where id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text;
  resolved public.user_role := 'passenger';
  display_name text;
begin
  requested := nullif(new.raw_app_meta_data ->> 'role', '');
  if requested in ('passenger', 'rider', 'admin') then
    resolved := requested::public.user_role;
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role')
    or coalesce(auth.role(), '') = 'service_role'
    or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
    or new.status is distinct from old.status
    or new.rating_avg is distinct from old.rating_avg
    or new.rating_count is distinct from old.rating_count
    or new.phone is distinct from old.phone
    or new.id is distinct from old.id
    or new.created_at is distinct from old.created_at then
    raise exception 'only an admin or the server can change this profile field'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger profiles_protect_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

create or replace function public.enforce_offer_amount()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  passenger_offer integer;
begin
  select offer_kobo into passenger_offer
  from public.ride_requests
  where id = new.request_id;

  if passenger_offer is null then
    raise exception 'ride request not found'
      using errcode = 'foreign_key_violation';
  end if;

  if new.type = 'accept' and new.amount_kobo <> passenger_offer then
    raise exception 'an accept offer must match the passenger offer'
      using errcode = 'check_violation';
  elsif new.type = 'counter' and new.amount_kobo <= passenger_offer then
    raise exception 'a counter offer must be higher than the passenger offer'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger ride_offers_enforce_amount
  before insert or update of type, amount_kobo, request_id on public.ride_offers
  for each row execute function public.enforce_offer_amount();

create or replace function public.lock_agreed_fare()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.agreed_fare_kobo is distinct from old.agreed_fare_kobo then
    raise exception 'agreed_fare_kobo is locked and cannot be changed'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger trips_lock_agreed_fare
  before update of agreed_fare_kobo on public.trips
  for each row execute function public.lock_agreed_fare();

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile_privileged_columns() from public, anon, authenticated;
revoke all on function public.enforce_offer_amount() from public, anon, authenticated;
revoke all on function public.lock_agreed_fare() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.current_user_phone() to authenticated, service_role;
