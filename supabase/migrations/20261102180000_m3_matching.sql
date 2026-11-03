-- M3: fare quote, request, rider offers, and one locked trip.
-- Numbers match packages/shared/src/matching.ts.
-- Radius ladder: 1500 m, then 3000 m, then 5000 m.
-- A rider who is already carrying people (seats 1 or 2) can still be asked.
-- A rider on an active DROP trip cannot take a second one.
-- Clients cannot write these tables. These functions are the only door.

set search_path = public, extensions;

alter table public.riders
  add column heading_deg numeric(5, 1),
  add column speed_mps numeric(6, 2),
  add column accuracy_m numeric(8, 1);

alter table public.riders
  add constraint riders_heading_chk check (
    heading_deg is null or (heading_deg >= 0 and heading_deg < 360)
  ),
  add constraint riders_speed_chk check (
    speed_mps is null or (speed_mps >= 0 and speed_mps <= 70)
  ),
  add constraint riders_accuracy_chk check (
    accuracy_m is null or (accuracy_m >= 0 and accuracy_m <= 10000)
  );

comment on column public.riders.heading_deg is 'Latest location ping. Null until the rider shares a heading.';
comment on column public.riders.speed_mps is 'Latest speed in metres per second.';
comment on column public.riders.accuracy_m is 'Latest location accuracy in metres.';

create unique index trips_one_active_drop_per_rider
  on public.trips (rider_id)
  where status in ('assigned', 'arrived', 'in_progress');

comment on index public.trips_one_active_drop_per_rider is
  'One open DROP per rider. Two passengers cannot book the same rider.';

create table public.route_cache (
  origin_geohash text not null,
  dest_geohash text not null,
  distance_m integer not null,
  source text not null,
  fetched_at timestamptz not null default now(),
  primary key (origin_geohash, dest_geohash),
  constraint route_cache_distance_chk check (distance_m >= 0),
  constraint route_cache_source_chk check (source in ('google', 'estimate'))
);

comment on table public.route_cache is
  'Road distance by geohash pair. Google Routes wins over the straight-line estimate.';

alter table public.route_cache enable row level security;
alter table public.route_cache force row level security;
revoke all on public.route_cache from anon, authenticated;
grant all on public.route_cache to service_role;

create or replace function public._geohash(
  p_lat double precision,
  p_lng double precision,
  p_precision integer default 7
)
returns text
language plpgsql
immutable
set search_path = public
as $fn$
declare
  base32 text := '0123456789bcdefghjkmnpqrstuvwxyz';
  lat_min double precision := -90;
  lat_max double precision := 90;
  lng_min double precision := -180;
  lng_max double precision := 180;
  even_bit boolean := true;
  bit_n integer := 0;
  ch integer := 0;
  hash text := '';
  mid double precision;
begin
  if p_precision < 1 or p_precision > 12 then
    raise exception 'geohash precision must be from 1 to 12'
      using errcode = 'check_violation';
  end if;

  while char_length(hash) < p_precision loop
    if even_bit then
      mid := (lng_min + lng_max) / 2;
      if p_lng >= mid then
        ch := ch * 2 + 1;
        lng_min := mid;
      else
        ch := ch * 2;
        lng_max := mid;
      end if;
    else
      mid := (lat_min + lat_max) / 2;
      if p_lat >= mid then
        ch := ch * 2 + 1;
        lat_min := mid;
      else
        ch := ch * 2;
        lat_max := mid;
      end if;
    end if;
    even_bit := not even_bit;
    bit_n := bit_n + 1;
    if bit_n = 5 then
      hash := hash || substr(base32, ch + 1, 1);
      bit_n := 0;
      ch := 0;
    end if;
  end loop;

  return hash;
end;
$fn$;

create or replace function public._geo_point(p_lat double precision, p_lng double precision)
returns geography
language plpgsql
immutable
set search_path = public, extensions
as $fn$
declare
  v_lat double precision;
  v_lng double precision;
begin
  if p_lat is null or p_lng is null or p_lat <> p_lat or p_lng <> p_lng
    or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'Enter a real map location.'
      using errcode = 'check_violation';
  end if;
  v_lat := round(p_lat::numeric, 5)::double precision;
  v_lng := round(p_lng::numeric, 5)::double precision;
  return extensions.st_setsrid(extensions.st_makepoint(v_lng, v_lat), 4326)::extensions.geography;
end;
$fn$;

create or replace function public._zone_problem(p_point geography, p_label text)
returns text
language plpgsql
stable
set search_path = public, extensions
as $fn$
begin
  if not exists (
    select 1
    from public.service_zones
    where active
      and type = 'service'
      and extensions.st_covers(area, p_point)
  ) then
    return 'The ' || p_label || ' is outside the DROP service area.';
  end if;

  if exists (
    select 1
    from public.service_zones
    where active
      and type = 'restricted'
      and extensions.st_covers(area, p_point)
  ) then
    return 'The ' || p_label || ' is in a restricted area. Pick another place.';
  end if;

  return null;
end;
$fn$;

create or replace function public._next_radius_m(p_radius integer)
returns integer
language sql
immutable
set search_path = public
as $fn$
  select case
    when p_radius < 1500 then 1500
    when p_radius < 3000 then 3000
    when p_radius < 5000 then 5000
    else 5000
  end;
$fn$;

create or replace function public._eta_seconds(p_distance_m double precision, p_seats integer)
returns integer
language sql
immutable
set search_path = public
as $fn$
  select ceil(greatest(coalesce(p_distance_m, 0), 0) / 5.0)::integer
    + case
      when coalesce(p_seats, 0) > 0 then 120 + 60 * p_seats
      else 0
    end;
$fn$;

create or replace function public._require_active_profile()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_id uuid := auth.uid();
  v_status public.profile_status;
begin
  if v_id is null then
    raise exception 'Sign in first.'
      using errcode = 'insufficient_privilege';
  end if;

  select status into v_status from public.profiles where id = v_id;
  if v_status is null then
    raise exception 'Finish sign-up first.'
      using errcode = 'check_violation';
  end if;
  if v_status is distinct from 'active' then
    raise exception 'This account is paused.'
      using errcode = 'insufficient_privilege';
  end if;
  return v_id;
end;
$fn$;

create or replace function public._rate_limit(p_actor uuid, p_event text, p_limit integer)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_count integer;
begin
  select count(*)::integer into v_count
  from public.request_events
  where actor_id = p_actor
    and event = p_event
    and at > now() - interval '1 minute';

  if v_count >= p_limit then
    raise exception 'Too many attempts. Wait a minute and try again.'
      using errcode = 'check_violation';
  end if;
end;
$fn$;

create or replace function public._log_event(
  p_entity text,
  p_entity_id uuid,
  p_actor uuid,
  p_event text,
  p_payload jsonb
)
returns void
language sql
security definer
set search_path = public
as $fn$
  insert into public.request_events (entity, entity_id, actor_id, event, payload)
  values (p_entity, p_entity_id, p_actor, p_event, coalesce(p_payload, '{}'::jsonb));
$fn$;

create or replace function public._quote_kobo(p_distance_m integer, p_zone_id uuid)
returns jsonb
language plpgsql
stable
set search_path = public
as $fn$
declare
  v_base integer;
  v_per_km integer;
  v_min integer;
  v_low_pct numeric;
  v_high_pct numeric;
  v_raw integer;
  v_mid integer;
  v_low integer;
  v_high integer;
  v_low_u integer;
  v_high_u integer;
begin
  select base_kobo, per_km_kobo, min_kobo, range_low_pct, range_high_pct
  into v_base, v_per_km, v_min, v_low_pct, v_high_pct
  from public.fare_rules
  where zone_id = p_zone_id
    and effective_from <= now()
  order by effective_from desc
  limit 1;

  if v_base is null then
    raise exception 'Fares are not set for this area yet.'
      using errcode = 'check_violation';
  end if;

  v_raw := v_base + round((p_distance_m::numeric * v_per_km) / 1000)::integer;
  v_mid := greatest(v_min, (round(v_raw::numeric / 5000) * 5000)::integer);
  v_low_u := round((v_mid::numeric * (100 - v_low_pct)) / 100)::integer;
  v_high_u := round((v_mid::numeric * (100 + v_high_pct)) / 100)::integer;
  v_low := greatest(v_min, (round(v_low_u::numeric / 5000) * 5000)::integer);
  v_high := greatest(v_mid, (round(v_high_u::numeric / 5000) * 5000)::integer);
  if v_low > v_mid then
    v_low := v_mid;
  end if;
  if v_high < v_mid then
    v_high := v_mid;
  end if;

  return jsonb_build_object(
    'rawKobo', v_raw,
    'midpointKobo', v_mid,
    'suggestedLowKobo', v_low,
    'suggestedHighKobo', v_high,
    'minKobo', v_min
  );
end;
$fn$;

create or replace function public._service_zone_id(p_point geography)
returns uuid
language sql
stable
set search_path = public, extensions
as $fn$
  select id
  from public.service_zones
  where active
    and type = 'service'
    and extensions.st_covers(area, p_point)
  order by extensions.st_area(area) asc
  limit 1;
$fn$;

create or replace function public._road_distance(p_pickup geography, p_dropoff geography)
returns table (distance_m integer, source text)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $fn$
declare
  v_origin text;
  v_dest text;
  v_cached integer;
  v_source text;
  v_estimate integer;
begin
  v_origin := public._geohash(
    extensions.st_y(p_pickup::extensions.geometry),
    extensions.st_x(p_pickup::extensions.geometry),
    7
  );
  v_dest := public._geohash(
    extensions.st_y(p_dropoff::extensions.geometry),
    extensions.st_x(p_dropoff::extensions.geometry),
    7
  );

  select route_cache.distance_m, route_cache.source
  into v_cached, v_source
  from public.route_cache
  where origin_geohash = v_origin
    and dest_geohash = v_dest
    and (
      route_cache.source = 'google'
      or fetched_at > now() - interval '6 hours'
    )
  order by case when route_cache.source = 'google' then 0 else 1 end, fetched_at desc
  limit 1;

  if v_cached is not null then
    distance_m := v_cached;
    source := v_source;
    return next;
    return;
  end if;

  v_estimate := greatest(
    0,
    round(extensions.st_distance(p_pickup, p_dropoff) * 1.4)::integer
  );

  insert into public.route_cache (origin_geohash, dest_geohash, distance_m, source)
  values (v_origin, v_dest, v_estimate, 'estimate')
  on conflict (origin_geohash, dest_geohash) do update
    set distance_m = excluded.distance_m,
        source = 'estimate',
        fetched_at = now()
    where public.route_cache.source <> 'google';

  distance_m := v_estimate;
  source := 'estimate';
  return next;
end;
$fn$;

create or replace function public._fan_out(p_request_id uuid, p_round integer)
returns integer
language plpgsql
volatile
security definer
set search_path = public, extensions
as $fn$
declare
  v_pickup geography;
  v_passenger uuid;
  v_radius integer;
  v_count integer := 0;
begin
  select pickup, passenger_id, radius_m
  into v_pickup, v_passenger, v_radius
  from public.ride_requests
  where id = p_request_id;

  insert into public.request_recipients (request_id, rider_id, round)
  select p_request_id, r.profile_id, p_round
  from public.riders r
  where r.is_online
    and r.verification_status = 'approved'
    and r.last_location is not null
    and r.last_seen_at > now() - interval '60 seconds'
    and r.seats_occupied < 3
    and r.profile_id <> v_passenger
    and extensions.st_dwithin(r.last_location, v_pickup, v_radius)
    and not exists (
      select 1
      from public.trips t
      where t.rider_id = r.profile_id
        and t.status in ('assigned', 'arrived', 'in_progress')
    )
    and not exists (
      select 1
      from public.request_recipients existing
      where existing.request_id = p_request_id
        and existing.rider_id = r.profile_id
    )
  order by extensions.st_distance(r.last_location, v_pickup)
  limit 15;

  get diagnostics v_count = row_count;
  return v_count;
end;
$fn$;

create or replace function public.fare_quote(
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $fn$
declare
  v_actor uuid;
  v_pickup geography;
  v_dropoff geography;
  v_problem text;
  v_zone uuid;
  v_distance integer;
  v_source text;
  v_quote jsonb;
begin
  v_actor := public._require_active_profile();
  perform public._rate_limit(v_actor, 'fare_quote', 60);
  v_pickup := public._geo_point(p_pickup_lat, p_pickup_lng);
  v_dropoff := public._geo_point(p_dropoff_lat, p_dropoff_lng);

  v_problem := public._zone_problem(v_pickup, 'pickup');
  if v_problem is not null then
    raise exception '%', v_problem using errcode = 'check_violation';
  end if;
  v_problem := public._zone_problem(v_dropoff, 'drop-off');
  if v_problem is not null then
    raise exception '%', v_problem using errcode = 'check_violation';
  end if;

  v_zone := public._service_zone_id(v_pickup);
  select road.distance_m, road.source into v_distance, v_source
  from public._road_distance(v_pickup, v_dropoff) as road;
  v_quote := public._quote_kobo(v_distance, v_zone);

  perform public._log_event(
    'fare_quote',
    v_zone,
    v_actor,
    'fare_quote',
    jsonb_build_object('distanceM', v_distance, 'source', v_source)
  );

  return v_quote || jsonb_build_object(
    'distanceM', v_distance,
    'distanceSource', v_source,
    'zoneId', v_zone
  );
end;
$fn$;

create or replace function public.cache_road_distance(
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision,
  p_distance_m integer
)
returns void
language plpgsql
volatile
security definer
set search_path = public, extensions
as $fn$
declare
  v_actor uuid;
  v_pickup geography;
  v_dropoff geography;
  v_straight double precision;
  v_min integer;
  v_max integer;
  v_origin text;
  v_dest text;
begin
  v_actor := public._require_active_profile();
  perform public._rate_limit(v_actor, 'cache_road_distance', 30);
  if p_distance_m is null or p_distance_m < 0 then
    raise exception 'That road distance does not match these places.'
      using errcode = 'check_violation';
  end if;

  v_pickup := public._geo_point(p_pickup_lat, p_pickup_lng);
  v_dropoff := public._geo_point(p_dropoff_lat, p_dropoff_lng);
  v_straight := extensions.st_distance(v_pickup, v_dropoff);
  if v_straight <= 1 then
    v_min := 0;
    v_max := 500;
  else
    v_min := round(v_straight * 0.85)::integer;
    v_max := greatest(500, round(v_straight * 3)::integer);
  end if;
  if p_distance_m < v_min or p_distance_m > v_max then
    raise exception 'That road distance does not match these places.'
      using errcode = 'check_violation';
  end if;

  v_origin := public._geohash(
    extensions.st_y(v_pickup::extensions.geometry),
    extensions.st_x(v_pickup::extensions.geometry),
    7
  );
  v_dest := public._geohash(
    extensions.st_y(v_dropoff::extensions.geometry),
    extensions.st_x(v_dropoff::extensions.geometry),
    7
  );

  insert into public.route_cache (origin_geohash, dest_geohash, distance_m, source)
  values (v_origin, v_dest, p_distance_m, 'google')
  on conflict (origin_geohash, dest_geohash) do update
    set distance_m = excluded.distance_m,
        source = 'google',
        fetched_at = now();
end;
$fn$;

create or replace function public.create_request(
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_pickup_note text,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision,
  p_dropoff_label text,
  p_offer_kobo integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $fn$
declare
  v_actor uuid;
  v_note text;
  v_label text;
  v_pickup geography;
  v_dropoff geography;
  v_problem text;
  v_zone uuid;
  v_distance integer;
  v_source text;
  v_quote jsonb;
  v_min integer;
  v_id uuid;
  v_expires timestamptz;
  v_sent integer;
begin
  v_actor := public._require_active_profile();
  perform public._rate_limit(v_actor, 'create_request', 6);

  v_note := nullif(btrim(coalesce(p_pickup_note, '')), '');
  if v_note is not null and char_length(v_note) > 280 then
    raise exception 'The pickup note is too long.'
      using errcode = 'check_violation';
  end if;
  v_label := btrim(coalesce(p_dropoff_label, ''));
  if char_length(v_label) < 1 or char_length(v_label) > 200 then
    raise exception 'Enter a place name.'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1
    from public.ride_requests
    where passenger_id = v_actor
      and status = 'searching'
    for update
  ) then
    raise exception 'You already have a request open. Cancel it before starting another.'
      using errcode = 'check_violation';
  end if;

  v_pickup := public._geo_point(p_pickup_lat, p_pickup_lng);
  v_dropoff := public._geo_point(p_dropoff_lat, p_dropoff_lng);
  v_problem := public._zone_problem(v_pickup, 'pickup');
  if v_problem is not null then
    raise exception '%', v_problem using errcode = 'check_violation';
  end if;
  v_problem := public._zone_problem(v_dropoff, 'drop-off');
  if v_problem is not null then
    raise exception '%', v_problem using errcode = 'check_violation';
  end if;

  v_zone := public._service_zone_id(v_pickup);
  select road.distance_m, road.source into v_distance, v_source
  from public._road_distance(v_pickup, v_dropoff) as road;
  v_quote := public._quote_kobo(v_distance, v_zone);
  v_min := (v_quote ->> 'minKobo')::integer;

  if p_offer_kobo is null or p_offer_kobo < v_min then
    raise exception 'The fare is below the minimum.'
      using errcode = 'check_violation';
  end if;
  if p_offer_kobo % 5000 <> 0 then
    raise exception 'Fares move in steps of ₦50.'
      using errcode = 'check_violation';
  end if;

  v_expires := now() + interval '75 seconds';
  insert into public.ride_requests (
    passenger_id,
    pickup,
    pickup_note,
    dropoff,
    dropoff_label,
    distance_m,
    suggested_low_kobo,
    suggested_high_kobo,
    min_kobo,
    offer_kobo,
    status,
    radius_m,
    expires_at
  )
  values (
    v_actor,
    v_pickup,
    v_note,
    v_dropoff,
    v_label,
    v_distance,
    (v_quote ->> 'suggestedLowKobo')::integer,
    (v_quote ->> 'suggestedHighKobo')::integer,
    v_min,
    p_offer_kobo,
    'searching',
    1500,
    v_expires
  )
  returning id into v_id;

  v_sent := public._fan_out(v_id, 1);
  perform public._log_event(
    'ride_request',
    v_id,
    v_actor,
    'create_request',
    jsonb_build_object(
      'offerKobo', p_offer_kobo,
      'radiusM', 1500,
      'recipientCount', v_sent,
      'distanceM', v_distance,
      'distanceSource', v_source
    )
  );

  return jsonb_build_object(
    'requestId', v_id,
    'offerKobo', p_offer_kobo,
    'minKobo', v_min,
    'suggestedLowKobo', (v_quote ->> 'suggestedLowKobo')::integer,
    'suggestedHighKobo', (v_quote ->> 'suggestedHighKobo')::integer,
    'distanceM', v_distance,
    'radiusM', 1500,
    'expiresAt', v_expires,
    'recipientCount', v_sent
  );
end;
$fn$;

create or replace function public._lock_open_request(p_request_id uuid, p_actor uuid)
returns public.ride_requests
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_req public.ride_requests;
begin
  select * into v_req
  from public.ride_requests
  where id = p_request_id
  for update;

  if v_req.id is null or v_req.passenger_id <> p_actor then
    raise exception 'This request is not yours.'
      using errcode = 'insufficient_privilege';
  end if;
  if v_req.status <> 'searching' then
    raise exception 'This request is no longer open.'
      using errcode = 'check_violation';
  end if;
  if v_req.expires_at <= now() then
    raise exception 'This request has expired.'
      using errcode = 'check_violation';
  end if;
  return v_req;
end;
$fn$;

create or replace function public.raise_offer(p_request_id uuid, p_offer_kobo integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_actor uuid;
  v_req public.ride_requests;
  v_radius integer;
  v_round integer;
  v_expires timestamptz;
  v_sent integer;
begin
  v_actor := public._require_active_profile();
  perform public._rate_limit(v_actor, 'raise_offer', 10);
  v_req := public._lock_open_request(p_request_id, v_actor);

  if p_offer_kobo is null or p_offer_kobo <= v_req.offer_kobo then
    raise exception 'Raise the fare above what you offered.'
      using errcode = 'check_violation';
  end if;
  if p_offer_kobo < v_req.min_kobo or p_offer_kobo % 5000 <> 0 then
    raise exception 'Fares move in steps of ₦50.'
      using errcode = 'check_violation';
  end if;

  v_radius := public._next_radius_m(v_req.radius_m);
  v_expires := now() + interval '75 seconds';
  update public.ride_requests
  set offer_kobo = p_offer_kobo,
      radius_m = v_radius,
      expires_at = v_expires
  where id = p_request_id;

  select coalesce(max(round), 0) + 1 into v_round
  from public.request_recipients
  where request_id = p_request_id;
  v_sent := public._fan_out(p_request_id, v_round);

  perform public._log_event(
    'ride_request',
    p_request_id,
    v_actor,
    'raise_offer',
    jsonb_build_object('offerKobo', p_offer_kobo, 'radiusM', v_radius, 'recipientCount', v_sent)
  );

  return jsonb_build_object(
    'requestId', p_request_id,
    'offerKobo', p_offer_kobo,
    'radiusM', v_radius,
    'expiresAt', v_expires,
    'recipientCount', v_sent
  );
end;
$fn$;

create or replace function public.extend_search(p_request_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_actor uuid;
  v_req public.ride_requests;
  v_radius integer;
  v_round integer;
  v_expires timestamptz;
  v_sent integer;
begin
  v_actor := public._require_active_profile();
  v_req := public._lock_open_request(p_request_id, v_actor);
  if v_req.created_at < now() - interval '5 minutes' then
    raise exception 'This request has been open too long. Cancel it and try again.'
      using errcode = 'check_violation';
  end if;

  v_radius := public._next_radius_m(v_req.radius_m);
  v_expires := now() + interval '75 seconds';
  update public.ride_requests
  set radius_m = v_radius,
      expires_at = v_expires
  where id = p_request_id;

  select coalesce(max(round), 0) + 1 into v_round
  from public.request_recipients
  where request_id = p_request_id;
  v_sent := public._fan_out(p_request_id, v_round);

  perform public._log_event(
    'ride_request',
    p_request_id,
    v_actor,
    'extend_search',
    jsonb_build_object('radiusM', v_radius, 'recipientCount', v_sent)
  );

  return jsonb_build_object(
    'requestId', p_request_id,
    'offerKobo', v_req.offer_kobo,
    'radiusM', v_radius,
    'expiresAt', v_expires,
    'recipientCount', v_sent
  );
end;
$fn$;

create or replace function public.cancel_request(p_request_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_actor uuid;
  v_status public.request_status;
begin
  v_actor := public._require_active_profile();

  select status into v_status
  from public.ride_requests
  where id = p_request_id
    and passenger_id = v_actor
  for update;

  if v_status is null then
    raise exception 'This request is not yours.'
      using errcode = 'insufficient_privilege';
  end if;
  if v_status = 'matched' then
    raise exception 'A rider is already confirmed.'
      using errcode = 'check_violation';
  end if;
  if v_status <> 'searching' then
    return;
  end if;

  update public.ride_requests
  set status = 'cancelled'
  where id = p_request_id;

  update public.ride_offers
  set status = 'expired'
  where request_id = p_request_id
    and status = 'open';

  perform public._log_event('ride_request', p_request_id, v_actor, 'cancel_request', '{}'::jsonb);
end;
$fn$;

create or replace function public.submit_offer(
  p_request_id uuid,
  p_type text,
  p_amount_kobo integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $fn$
declare
  v_actor uuid;
  v_req public.ride_requests;
  v_status public.verification_status;
  v_online boolean;
  v_seen timestamptz;
  v_seats integer;
  v_location geography;
  v_existing public.ride_offers;
  v_distance double precision;
  v_eta integer;
  v_expires timestamptz;
  v_id uuid;
begin
  v_actor := public._require_active_profile();
  perform public._rate_limit(v_actor, 'submit_offer', 20);

  if p_type not in ('accept', 'counter') then
    raise exception 'Choose accept or counter.'
      using errcode = 'check_violation';
  end if;

  select * into v_req
  from public.ride_requests
  where id = p_request_id
  for update;

  if v_req.id is null then
    raise exception 'This request is not yours.'
      using errcode = 'insufficient_privilege';
  end if;
  if v_req.passenger_id = v_actor then
    raise exception 'You cannot choose your own Keke.'
      using errcode = 'check_violation';
  end if;
  if v_req.status <> 'searching' then
    raise exception 'This request is no longer open.'
      using errcode = 'check_violation';
  end if;
  if v_req.expires_at <= now() then
    raise exception 'This request has expired.'
      using errcode = 'check_violation';
  end if;
  if not exists (
    select 1
    from public.request_recipients
    where request_id = p_request_id
      and rider_id = v_actor
  ) then
    raise exception 'This request was not sent to you.'
      using errcode = 'insufficient_privilege';
  end if;

  select verification_status, is_online, last_seen_at, seats_occupied, last_location
  into v_status, v_online, v_seen, v_seats, v_location
  from public.riders
  where profile_id = v_actor
  for update;

  if v_status is null then
    raise exception 'Finish rider signup first.'
      using errcode = 'check_violation';
  end if;
  if v_status is distinct from 'approved' or not v_online
    or v_seen is null or v_seen <= now() - interval '60 seconds'
    or v_location is null then
    raise exception 'Go online again so passengers can see you.'
      using errcode = 'check_violation';
  end if;

  if p_amount_kobo is null or p_amount_kobo % 5000 <> 0 then
    raise exception 'Fares move in steps of ₦50.'
      using errcode = 'check_violation';
  end if;
  if p_type = 'accept' and p_amount_kobo <> v_req.offer_kobo then
    raise exception 'An accept must match the passenger''s fare.'
      using errcode = 'check_violation';
  end if;
  if p_type = 'counter' and p_amount_kobo <= v_req.offer_kobo then
    raise exception 'A counter must be higher than the passenger''s fare.'
      using errcode = 'check_violation';
  end if;

  select * into v_existing
  from public.ride_offers
  where request_id = p_request_id
    and rider_id = v_actor
  for update;

  if found and v_existing.type = 'counter' then
    raise exception 'You already sent a counter for this request.'
      using errcode = 'check_violation';
  end if;
  if found and v_existing.status = 'selected' then
    raise exception 'This offer is no longer open.'
      using errcode = 'check_violation';
  end if;

  v_distance := extensions.st_distance(v_location, v_req.pickup);
  v_eta := public._eta_seconds(v_distance, v_seats);
  v_expires := least(now() + interval '30 seconds', v_req.expires_at);

  if not found then
    insert into public.ride_offers (
      request_id,
      rider_id,
      type,
      amount_kobo,
      eta_s,
      seats_occupied_at_offer,
      status,
      expires_at
    )
    values (
      p_request_id,
      v_actor,
      p_type::public.offer_type,
      p_amount_kobo,
      v_eta,
      v_seats,
      'open',
      v_expires
    )
    returning id into v_id;
  else
    update public.ride_offers
    set type = p_type::public.offer_type,
        amount_kobo = p_amount_kobo,
        eta_s = v_eta,
        seats_occupied_at_offer = v_seats,
        status = 'open',
        expires_at = v_expires
    where id = v_existing.id
    returning id into v_id;
  end if;

  perform public._log_event(
    'ride_offer',
    v_id,
    v_actor,
    'submit_offer',
    jsonb_build_object(
      'requestId', p_request_id,
      'type', p_type,
      'amountKobo', p_amount_kobo,
      'etaS', v_eta,
      'seats', v_seats
    )
  );

  return jsonb_build_object(
    'offerId', v_id,
    'amountKobo', p_amount_kobo,
    'etaS', v_eta,
    'seats', v_seats,
    'expiresAt', v_expires
  );
exception
  when unique_violation then
    raise exception 'You already sent an offer on this request.'
      using errcode = 'unique_violation';
end;
$fn$;

create or replace function public.withdraw_offer(p_offer_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_actor uuid;
  v_status public.offer_status;
  v_rider uuid;
begin
  v_actor := public._require_active_profile();

  select status, rider_id into v_status, v_rider
  from public.ride_offers
  where id = p_offer_id
  for update;

  if v_rider is null or v_rider <> v_actor then
    raise exception 'This offer is not yours.'
      using errcode = 'insufficient_privilege';
  end if;
  if v_status = 'selected' then
    raise exception 'The passenger already chose this offer.'
      using errcode = 'check_violation';
  end if;
  if v_status <> 'open' then
    return;
  end if;

  update public.ride_offers
  set status = 'withdrawn'
  where id = p_offer_id;

  perform public._log_event('ride_offer', p_offer_id, v_actor, 'withdraw_offer', '{}'::jsonb);
end;
$fn$;

create or replace function public.select_offer(p_offer_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $fn$
declare
  v_actor uuid;
  v_request_id uuid;
  v_rider_id uuid;
  v_req public.ride_requests;
  v_offer public.ride_offers;
  v_online boolean;
  v_seen timestamptz;
  v_approved public.verification_status;
  v_keke uuid;
  v_pin text;
  v_bytes bytea;
  v_hash text;
  v_trip uuid;
begin
  v_actor := public._require_active_profile();

  select request_id, rider_id into v_request_id, v_rider_id
  from public.ride_offers
  where id = p_offer_id;

  if v_request_id is null then
    raise exception 'This offer is no longer open.'
      using errcode = 'check_violation';
  end if;

  select * into v_req
  from public.ride_requests
  where id = v_request_id
  for update;

  select verification_status, is_online, last_seen_at
  into v_approved, v_online, v_seen
  from public.riders
  where profile_id = v_rider_id
  for update;

  select * into v_offer
  from public.ride_offers
  where id = p_offer_id
  for update;

  if v_req.passenger_id <> v_actor then
    raise exception 'This request is not yours.'
      using errcode = 'insufficient_privilege';
  end if;
  if v_req.status <> 'searching' or v_req.expires_at <= now() then
    raise exception 'This request is no longer open.'
      using errcode = 'check_violation';
  end if;
  if v_offer.status <> 'open' then
    raise exception 'This offer is no longer open.'
      using errcode = 'check_violation';
  end if;
  if v_offer.expires_at <= now() then
    raise exception 'This offer has expired.'
      using errcode = 'check_violation';
  end if;
  if v_offer.rider_id = v_actor then
    raise exception 'You cannot choose your own Keke.'
      using errcode = 'check_violation';
  end if;
  if v_approved is distinct from 'approved' or not coalesce(v_online, false)
    or v_seen is null or v_seen <= now() - interval '60 seconds' then
    raise exception 'This rider is no longer available.'
      using errcode = 'check_violation';
  end if;
  if exists (
    select 1
    from public.trips
    where rider_id = v_rider_id
      and status in ('assigned', 'arrived', 'in_progress')
  ) then
    raise exception 'This rider was just booked. Choose another offer.'
      using errcode = 'unique_violation';
  end if;

  select id into v_keke
  from public.kekes
  where rider_id = v_rider_id
    and active
  limit 1;
  if v_keke is null then
    raise exception 'This rider has no Keke on file.'
      using errcode = 'check_violation';
  end if;

  v_bytes := extensions.gen_random_bytes(2);
  v_pin := lpad(
    ((get_byte(v_bytes, 0)::integer * 256 + get_byte(v_bytes, 1)::integer) % 10000)::text,
    4,
    '0'
  );
  v_hash := extensions.crypt(v_pin, extensions.gen_salt('bf'));

  insert into public.trips (
    request_id,
    offer_id,
    passenger_id,
    rider_id,
    keke_id,
    agreed_fare_kobo,
    pin_hash,
    status
  )
  values (
    v_req.id,
    v_offer.id,
    v_actor,
    v_rider_id,
    v_keke,
    v_offer.amount_kobo,
    v_hash,
    'assigned'
  )
  returning id into v_trip;

  insert into public.payments (trip_id, method, amount_kobo, status)
  values (v_trip, 'cash', v_offer.amount_kobo, 'pending');

  update public.ride_offers
  set status = 'selected'
  where id = v_offer.id;

  update public.ride_offers
  set status = 'rejected'
  where request_id = v_req.id
    and id <> v_offer.id
    and status = 'open';

  update public.ride_requests
  set status = 'matched'
  where id = v_req.id;

  perform public._log_event(
    'ride_request',
    v_req.id,
    v_actor,
    'select_offer',
    jsonb_build_object(
      'tripId', v_trip,
      'offerId', v_offer.id,
      'agreedFareKobo', v_offer.amount_kobo,
      'riderId', v_rider_id
    )
  );

  return jsonb_build_object(
    'tripId', v_trip,
    'offerId', v_offer.id,
    'agreedFareKobo', v_offer.amount_kobo,
    'pin', v_pin,
    'riderId', v_rider_id
  );
exception
  when unique_violation then
    raise exception 'This rider was just booked. Choose another offer.'
      using errcode = 'unique_violation';
end;
$fn$;

create or replace function public.list_request_offers(p_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_actor uuid;
  v_rows jsonb;
begin
  v_actor := public._require_active_profile();
  if not exists (
    select 1
    from public.ride_requests
    where id = p_request_id
      and passenger_id = v_actor
  ) then
    raise exception 'This request is not yours.'
      using errcode = 'insufficient_privilege';
  end if;

  select coalesce(
    jsonb_agg(item order by (item ->> 'etaS')::integer, (item ->> 'amountKobo')::integer),
    '[]'::jsonb
  )
  into v_rows
  from (
    select jsonb_build_object(
      'id', o.id,
      'riderId', o.rider_id,
      'name', p.full_name,
      'rating', p.rating_avg,
      'rides', p.rating_count,
      'plate', coalesce(k.plate_number, 'Plate pending'),
      'colour', coalesce(k.colour, 'Yellow'),
      'etaS', o.eta_s,
      'seats', o.seats_occupied_at_offer,
      'amountKobo', o.amount_kobo,
      'kind', o.type,
      'status', o.status,
      'expiresAt', o.expires_at
    ) as item
    from public.ride_offers o
    join public.profiles p on p.id = o.rider_id
    left join public.kekes k on k.rider_id = o.rider_id and k.active
    where o.request_id = p_request_id
      and o.status in ('open', 'selected')
      and (o.status = 'selected' or o.expires_at > now())
  ) listed;

  return v_rows;
end;
$fn$;

create or replace function public.list_rider_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $fn$
declare
  v_actor uuid;
  v_rows jsonb;
begin
  v_actor := public._require_active_profile();

  select coalesce(jsonb_agg(item order by (item ->> 'expiresAt')), '[]'::jsonb)
  into v_rows
  from (
    select distinct on (r.id)
      jsonb_build_object(
        'requestId', r.id,
        'passengerName', split_part(p.full_name, ' ', 1),
        'pickupNote', r.pickup_note,
        'dropoffLabel', r.dropoff_label,
        'pickupLat', extensions.st_y(r.pickup::extensions.geometry),
        'pickupLng', extensions.st_x(r.pickup::extensions.geometry),
        'distanceToPickupM', coalesce(
          round(extensions.st_distance(rider.last_location, r.pickup))::integer,
          0
        ),
        'tripDistanceM', r.distance_m,
        'offerKobo', r.offer_kobo,
        'expiresAt', r.expires_at,
        'radiusM', r.radius_m,
        'myOfferId', o.id,
        'myOfferStatus', o.status
      ) as item
    from public.request_recipients rr
    join public.ride_requests r on r.id = rr.request_id
    join public.profiles p on p.id = r.passenger_id
    join public.riders rider on rider.profile_id = v_actor
    left join public.ride_offers o
      on o.request_id = r.id
      and o.rider_id = v_actor
    where rr.rider_id = v_actor
      and coalesce(o.status::text, '') <> 'withdrawn'
      and (
        (r.status = 'searching' and r.expires_at > now() and o.id is null)
        or o.status = 'open'
        or (
          o.status in ('selected', 'rejected', 'expired')
          and o.created_at > now() - interval '10 minutes'
        )
      )
    order by r.id, rr.round desc
  ) listed;

  return v_rows;
end;
$fn$;

create or replace function public.expire_matching()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_requests integer := 0;
  v_offers integer := 0;
begin
  update public.ride_requests
  set status = 'expired'
  where status = 'searching'
    and expires_at <= now();
  get diagnostics v_requests = row_count;

  update public.ride_offers o
  set status = 'expired'
  where o.status = 'open'
    and (
      o.expires_at <= now()
      or exists (
        select 1
        from public.ride_requests r
        where r.id = o.request_id
          and r.status <> 'searching'
      )
    );
  get diagnostics v_offers = row_count;

  return jsonb_build_object('requests', v_requests, 'offers', v_offers);
end;
$fn$;

create or replace function public.set_rider_status(p_online boolean, p_seats integer)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_id uuid := auth.uid();
  v_status public.verification_status;
  v_account public.profile_status;
begin
  if v_id is null then
    raise exception 'Sign in first.'
      using errcode = 'insufficient_privilege';
  end if;
  if p_seats is not null and p_seats not between 0 and 3 then
    raise exception 'Choose 0, 1, 2, or 3 passengers already on board.'
      using errcode = 'check_violation';
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
      seats_occupied = coalesce(p_seats, seats_occupied),
      last_seen_at = case when p_online then now() else last_seen_at end
  where profile_id = v_id;

  return p_online;
end;
$fn$;

create or replace function public.set_rider_online(p_online boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $fn$
begin
  return public.set_rider_status(p_online, null);
end;
$fn$;

create or replace function public.ping_rider_location(
  p_lat double precision,
  p_lng double precision,
  p_heading double precision,
  p_speed double precision,
  p_accuracy double precision
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $fn$
declare
  v_actor uuid;
  v_status public.verification_status;
  v_online boolean;
  v_seen timestamptz;
  v_old geography;
  v_point geography;
  v_moved double precision;
begin
  v_actor := public._require_active_profile();
  if p_heading is not null and (p_heading < 0 or p_heading >= 360) then
    raise exception 'Enter a real map location.'
      using errcode = 'check_violation';
  end if;
  if p_speed is not null and (p_speed < 0 or p_speed > 70) then
    raise exception 'Enter a real map location.'
      using errcode = 'check_violation';
  end if;
  if p_accuracy is not null and (p_accuracy < 0 or p_accuracy > 10000) then
    raise exception 'Enter a real map location.'
      using errcode = 'check_violation';
  end if;

  select verification_status, is_online, last_seen_at, last_location
  into v_status, v_online, v_seen, v_old
  from public.riders
  where profile_id = v_actor
  for update;

  if v_status is null then
    raise exception 'Finish rider signup first.'
      using errcode = 'check_violation';
  end if;
  if v_status is distinct from 'approved' then
    raise exception 'A rider cannot go online until DROP approves them.'
      using errcode = 'check_violation';
  end if;
  if not v_online and not exists (
    select 1
    from public.trips
    where rider_id = v_actor
      and status in ('assigned', 'arrived', 'in_progress')
  ) then
    raise exception 'Go online before sharing your location.'
      using errcode = 'check_violation';
  end if;

  v_point := public._geo_point(p_lat, p_lng);
  if v_old is not null and v_seen is not null and v_seen > now() - interval '5 seconds' then
    v_moved := extensions.st_distance(v_old, v_point);
    if v_moved < 100 then
      return jsonb_build_object('ok', true, 'stored', false);
    end if;
  end if;

  update public.riders
  set last_location = v_point,
      last_seen_at = now(),
      heading_deg = p_heading,
      speed_mps = p_speed,
      accuracy_m = p_accuracy
  where profile_id = v_actor;

  return jsonb_build_object('ok', true, 'stored', true);
end;
$fn$;

-- Reading a request must not look through row security again, or the
-- request and recipient policies call each other forever.
create or replace function public.can_read_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select auth.uid() is not null
    and (
      public.is_admin()
      or exists (
        select 1
        from public.ride_requests r
        where r.id = p_request_id
          and r.passenger_id = auth.uid()
      )
      or exists (
        select 1
        from public.request_recipients rr
        where rr.request_id = p_request_id
          and rr.rider_id = auth.uid()
      )
    );
$fn$;

drop policy if exists ride_requests_select_parties on public.ride_requests;
create policy ride_requests_select_parties
  on public.ride_requests
  for select
  to authenticated
  using (passenger_id = auth.uid() or public.can_read_request(id));

drop policy if exists ride_offers_select_parties on public.ride_offers;
create policy ride_offers_select_parties
  on public.ride_offers
  for select
  to authenticated
  using (rider_id = auth.uid() or public.can_read_request(request_id));

drop policy if exists request_recipients_select_parties on public.request_recipients;
create policy request_recipients_select_parties
  on public.request_recipients
  for select
  to authenticated
  using (rider_id = auth.uid() or public.can_read_request(request_id));

revoke all on function public.can_read_request(uuid) from public, anon;
grant execute on function public.can_read_request(uuid) to authenticated, service_role;

revoke all on function public._geohash(double precision, double precision, integer) from public, anon, authenticated;
revoke all on function public._geo_point(double precision, double precision) from public, anon, authenticated;
revoke all on function public._zone_problem(geography, text) from public, anon, authenticated;
revoke all on function public._next_radius_m(integer) from public, anon, authenticated;
revoke all on function public._eta_seconds(double precision, integer) from public, anon, authenticated;
revoke all on function public._require_active_profile() from public, anon, authenticated;
revoke all on function public._rate_limit(uuid, text, integer) from public, anon, authenticated;
revoke all on function public._log_event(text, uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public._quote_kobo(integer, uuid) from public, anon, authenticated;
revoke all on function public._service_zone_id(geography) from public, anon, authenticated;
revoke all on function public._road_distance(geography, geography) from public, anon, authenticated;
revoke all on function public._fan_out(uuid, integer) from public, anon, authenticated;
revoke all on function public._lock_open_request(uuid, uuid) from public, anon, authenticated;

revoke all on function public.fare_quote(double precision, double precision, double precision, double precision) from public, anon;
revoke all on function public.cache_road_distance(double precision, double precision, double precision, double precision, integer) from public, anon;
revoke all on function public.create_request(double precision, double precision, text, double precision, double precision, text, integer) from public, anon;
revoke all on function public.raise_offer(uuid, integer) from public, anon;
revoke all on function public.extend_search(uuid) from public, anon;
revoke all on function public.cancel_request(uuid) from public, anon;
revoke all on function public.submit_offer(uuid, text, integer) from public, anon;
revoke all on function public.withdraw_offer(uuid) from public, anon;
revoke all on function public.select_offer(uuid) from public, anon;
revoke all on function public.list_request_offers(uuid) from public, anon;
revoke all on function public.list_rider_requests() from public, anon;
revoke all on function public.expire_matching() from public, anon;
revoke all on function public.set_rider_status(boolean, integer) from public, anon;
revoke all on function public.ping_rider_location(double precision, double precision, double precision, double precision, double precision) from public, anon;

grant execute on function public.fare_quote(double precision, double precision, double precision, double precision) to authenticated, service_role;
grant execute on function public.cache_road_distance(double precision, double precision, double precision, double precision, integer) to authenticated, service_role;
grant execute on function public.create_request(double precision, double precision, text, double precision, double precision, text, integer) to authenticated, service_role;
grant execute on function public.raise_offer(uuid, integer) to authenticated, service_role;
grant execute on function public.extend_search(uuid) to authenticated, service_role;
grant execute on function public.cancel_request(uuid) to authenticated, service_role;
grant execute on function public.submit_offer(uuid, text, integer) to authenticated, service_role;
grant execute on function public.withdraw_offer(uuid) to authenticated, service_role;
grant execute on function public.select_offer(uuid) to authenticated, service_role;
grant execute on function public.list_request_offers(uuid) to authenticated, service_role;
grant execute on function public.list_rider_requests() to authenticated, service_role;
grant execute on function public.expire_matching() to authenticated, service_role;
grant execute on function public.set_rider_status(boolean, integer) to authenticated, service_role;
grant execute on function public.ping_rider_location(double precision, double precision, double precision, double precision, double precision) to authenticated, service_role;

alter table public.ride_requests replica identity full;
alter table public.ride_offers replica identity full;
alter table public.request_recipients replica identity full;
alter table public.trips replica identity full;

do $pub$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach t in array array['ride_requests', 'ride_offers', 'request_recipients', 'trips']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$pub$;

do $cron$
begin
  begin
    create extension if not exists pg_cron;
  exception
    when others then
      raise notice 'pg_cron extension skipped: %', sqlerrm;
      return;
  end;

  perform set_config('search_path', 'public, extensions, cron', true);

  begin
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'drop-expire-matching';
  exception
    when others then
      null;
  end;

  begin
    perform cron.schedule(
      'drop-expire-matching',
      '10 seconds',
      'select public.expire_matching()'
    );
  exception
    when others then
      begin
        perform cron.schedule(
          'drop-expire-matching',
          '* * * * *',
          'select public.expire_matching()'
        );
      exception
        when others then
          raise notice 'pg_cron schedule skipped: %', sqlerrm;
      end;
  end;
end
$cron$;
