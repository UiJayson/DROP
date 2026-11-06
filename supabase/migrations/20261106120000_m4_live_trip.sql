-- M4 slice: boarding PIN, live trip status, rider location, and cash completion.
-- Status values stay assigned, arrived, in_progress, completed, and cancelled.
-- Apply this file after the earlier migrations. Do not re-apply those if they are already on the database.
-- Do not apply it to a database that already has real riders or passengers.
-- SMS is unchanged. No provider is called from this file.

set search_path = public, extensions;

alter table public.trips
  add column pin_locked_at timestamptz,
  add column cancelled_at timestamptz;

alter table public.trips
  add constraint trips_pin_attempts_max_chk check (pin_attempts <= 3);

comment on column public.trips.pin_locked_at is
  'Set when the rider has entered the wrong boarding PIN three times. The trip stays open.';
comment on column public.trips.cancelled_at is
  'When the passenger or the rider cancelled. The locked fare is left as it was.';

create table public.trip_boarding_pins (
  trip_id uuid primary key references public.trips (id) on delete cascade,
  pin_code text not null,
  constraint trip_boarding_pins_format_chk check (pin_code ~ '^[0-9]{4}$')
);

comment on table public.trip_boarding_pins is
  'The 4-digit PIN, readable by that trip''s passenger until the trip starts or is cancelled. Riders are not given a policy on this table. start_trip checks the hash on trips, not this column.';

create table public.trip_locations (
  trip_id uuid primary key references public.trips (id) on delete cascade,
  rider_id uuid not null references public.riders (profile_id) on delete restrict,
  latitude double precision not null,
  longitude double precision not null,
  heading_deg double precision,
  speed_mps double precision,
  accuracy_m double precision,
  source text not null,
  recorded_at timestamptz not null default now(),
  constraint trip_locations_source_chk check (source in ('device', 'simulated')),
  constraint trip_locations_lat_chk check (latitude between -90 and 90),
  constraint trip_locations_lng_chk check (longitude between -180 and 180),
  constraint trip_locations_heading_chk check (
    heading_deg is null or (heading_deg >= 0 and heading_deg < 360)
  ),
  constraint trip_locations_speed_chk check (
    speed_mps is null or (speed_mps >= 0 and speed_mps <= 70)
  ),
  constraint trip_locations_accuracy_chk check (
    accuracy_m is null or (accuracy_m >= 0 and accuracy_m <= 10000)
  )
);

comment on table public.trip_locations is
  'Latest rider fix for one trip. source is device for a phone GPS reading and simulated for an explicit test fix. Simulated fixes are not written to riders.last_location.';
comment on column public.trip_locations.source is
  'device or simulated. A simulated row must not be shown as the phone GPS.';

alter table public.trip_boarding_pins enable row level security;
alter table public.trip_boarding_pins force row level security;
alter table public.trip_locations enable row level security;
alter table public.trip_locations force row level security;

revoke all on public.trip_boarding_pins from public, anon, authenticated;
revoke all on public.trip_locations from public, anon, authenticated;
grant select on public.trip_boarding_pins to authenticated;
grant select on public.trip_locations to authenticated;
grant all on public.trip_boarding_pins to service_role;
grant all on public.trip_locations to service_role;

create policy trip_boarding_pins_select_passenger
  on public.trip_boarding_pins
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.trips t
      where t.id = trip_boarding_pins.trip_id
        and t.passenger_id = auth.uid()
    )
  );

create policy trip_locations_select_parties
  on public.trip_locations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.trips t
      where t.id = trip_locations.trip_id
        and (t.passenger_id = auth.uid() or t.rider_id = auth.uid())
    )
  );

create or replace function public.lock_cash_payment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  fare integer;
begin
  select agreed_fare_kobo into fare
  from public.trips
  where id = new.trip_id;

  if fare is null then
    raise exception 'This trip was not found.'
      using errcode = 'check_violation';
  end if;
  if new.method is distinct from 'cash'::public.payment_method then
    raise exception 'Cash is the only payment method.'
      using errcode = 'check_violation';
  end if;
  if new.amount_kobo is distinct from fare then
    raise exception 'The cash amount must match the locked fare.'
      using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' and new.amount_kobo is distinct from old.amount_kobo then
    raise exception 'The cash amount is locked.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists payments_lock_cash on public.payments;
create trigger payments_lock_cash
  before insert or update of amount_kobo, method on public.payments
  for each row execute function public.lock_cash_payment();

revoke all on function public.lock_cash_payment() from public, anon, authenticated;

grant select (pin_locked_at, cancelled_at) on public.trips to authenticated;

create or replace view public.trips_client
with (security_barrier = true, security_invoker = true) as
select
  id,
  request_id,
  offer_id,
  passenger_id,
  rider_id,
  keke_id,
  agreed_fare_kobo,
  pin_attempts,
  status,
  cancelled_by,
  cancel_reason,
  assigned_at,
  arrived_at,
  started_at,
  completed_at,
  pin_locked_at,
  cancelled_at
from public.trips;

comment on view public.trips_client is
  'Trip rows without pin_hash. The boarding PIN is not in this view.';

create or replace function public._load_trip(p_trip_id uuid)
returns public.trips
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_actor uuid := public._require_active_profile();
  v_trip public.trips;
begin
  if p_trip_id is null then
    raise exception 'This trip was not found.'
      using errcode = 'check_violation';
  end if;

  select * into v_trip
  from public.trips
  where id = p_trip_id
  for update;

  if v_trip.id is null then
    raise exception 'This trip was not found.'
      using errcode = 'check_violation';
  end if;
  if v_trip.passenger_id <> v_actor and v_trip.rider_id <> v_actor then
    raise exception 'This trip is not yours.'
      using errcode = 'insufficient_privilege';
  end if;

  return v_trip;
end;
$fn$;

create or replace function public._trip_payload(p_trip_id uuid, p_actor uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $fn$
declare
  v_trip public.trips;
  v_pin text;
  v_passenger text;
  v_rider text;
  v_plate text;
  v_colour text;
  v_note text;
  v_label text;
  v_pickup_lat double precision;
  v_pickup_lng double precision;
  v_drop_lat double precision;
  v_drop_lng double precision;
  v_method text;
  v_amount integer;
  v_pay_status text;
  v_lat double precision;
  v_lng double precision;
  v_recorded timestamptz;
  v_source text;
  v_location jsonb;
begin
  select * into v_trip from public.trips where id = p_trip_id;
  if v_trip.id is null then
    raise exception 'This trip was not found.'
      using errcode = 'check_violation';
  end if;
  if v_trip.passenger_id <> p_actor and v_trip.rider_id <> p_actor then
    raise exception 'This trip is not yours.'
      using errcode = 'insufficient_privilege';
  end if;

  if v_trip.passenger_id = p_actor then
    select pin_code into v_pin
    from public.trip_boarding_pins
    where trip_id = v_trip.id;
  end if;

  select
    split_part(passenger.full_name, ' ', 1),
    split_part(rider.full_name, ' ', 1),
    coalesce(k.plate_number, 'Plate pending'),
    coalesce(k.colour, 'Yellow'),
    r.pickup_note,
    r.dropoff_label,
    round(extensions.st_y(r.pickup::extensions.geometry)::numeric, 5)::double precision,
    round(extensions.st_x(r.pickup::extensions.geometry)::numeric, 5)::double precision,
    round(extensions.st_y(r.dropoff::extensions.geometry)::numeric, 5)::double precision,
    round(extensions.st_x(r.dropoff::extensions.geometry)::numeric, 5)::double precision
  into
    v_passenger,
    v_rider,
    v_plate,
    v_colour,
    v_note,
    v_label,
    v_pickup_lat,
    v_pickup_lng,
    v_drop_lat,
    v_drop_lng
  from public.trips t
  join public.profiles passenger on passenger.id = t.passenger_id
  join public.profiles rider on rider.id = t.rider_id
  join public.kekes k on k.id = t.keke_id
  join public.ride_requests r on r.id = t.request_id
  where t.id = v_trip.id;

  select method::text, amount_kobo, status::text
  into v_method, v_amount, v_pay_status
  from public.payments
  where trip_id = v_trip.id;

  if v_amount is null then
    raise exception 'This trip has no cash record.'
      using errcode = 'check_violation';
  end if;

  select latitude, longitude, recorded_at, source
  into v_lat, v_lng, v_recorded, v_source
  from public.trip_locations
  where trip_id = v_trip.id;

  if v_source is null then
    v_location := 'null'::jsonb;
  else
    v_location := jsonb_build_object(
      'lat', v_lat,
      'lng', v_lng,
      'recordedAt', v_recorded,
      'source', v_source
    );
  end if;

  return jsonb_build_object(
    'tripId', v_trip.id,
    'status', v_trip.status,
    'agreedFareKobo', v_trip.agreed_fare_kobo,
    'pinAttempts', v_trip.pin_attempts,
    'pinLocked', v_trip.pin_locked_at is not null,
    'pin', to_jsonb(v_pin),
    'role', case when v_trip.passenger_id = p_actor then 'passenger' else 'rider' end,
    'passengerName', coalesce(v_passenger, 'Passenger'),
    'riderName', coalesce(v_rider, 'Rider'),
    'plate', coalesce(v_plate, 'Plate pending'),
    'colour', coalesce(v_colour, 'Yellow'),
    'pickupNote', v_note,
    'dropoffLabel', coalesce(v_label, 'Drop-off'),
    'pickup', jsonb_build_object('lat', v_pickup_lat, 'lng', v_pickup_lng),
    'dropoff', jsonb_build_object('lat', v_drop_lat, 'lng', v_drop_lng),
    'paymentMethod', coalesce(v_method, 'cash'),
    'paymentStatus', coalesce(v_pay_status, 'pending'),
    'paymentAmountKobo', v_amount,
    'location', v_location,
    'cancelReason', v_trip.cancel_reason,
    'cancelledAt', v_trip.cancelled_at,
    'arrivedAt', v_trip.arrived_at,
    'startedAt', v_trip.started_at,
    'completedAt', v_trip.completed_at
  );
end;
$fn$;

create or replace function public.trip_view(p_trip_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_actor uuid := public._require_active_profile();
  v_id uuid := p_trip_id;
begin
  if v_id is null then
    select id into v_id
    from public.trips
    where (passenger_id = v_actor or rider_id = v_actor)
      and status in ('assigned', 'arrived', 'in_progress')
    order by assigned_at desc
    limit 1;
    if v_id is null then
      return 'null'::jsonb;
    end if;
  end if;

  return public._trip_payload(v_id, v_actor);
end;
$fn$;

create or replace function public.mark_arrived(p_trip_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_actor uuid := public._require_active_profile();
  v_trip public.trips;
begin
  v_trip := public._load_trip(p_trip_id);
  if v_trip.rider_id <> v_actor then
    raise exception 'Only the rider can mark arrival.'
      using errcode = 'insufficient_privilege';
  end if;
  if v_trip.status = 'arrived' then
    return public._trip_payload(v_trip.id, v_actor);
  end if;
  if v_trip.status <> 'assigned' then
    raise exception 'You can mark arrival only on the way to pickup.'
      using errcode = 'check_violation';
  end if;

  update public.trips
  set status = 'arrived',
      arrived_at = coalesce(arrived_at, now())
  where id = v_trip.id;

  perform public._log_event('trip', v_trip.id, v_actor, 'arrive', '{}'::jsonb);
  insert into public.audit_log (entity, entity_id, actor_id, event, payload)
  values ('trip', v_trip.id, v_actor, 'arrive', jsonb_build_object('agreedFareKobo', v_trip.agreed_fare_kobo));

  return public._trip_payload(v_trip.id, v_actor);
end;
$fn$;

create or replace function public.start_trip(p_trip_id uuid, p_pin text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $fn$
declare
  v_actor uuid := public._require_active_profile();
  v_trip public.trips;
  v_attempts integer;
  v_locked boolean := false;
  v_message text;
begin
  v_trip := public._load_trip(p_trip_id);
  if v_trip.rider_id <> v_actor then
    raise exception 'Only the rider can start the trip.'
      using errcode = 'insufficient_privilege';
  end if;
  if v_trip.status = 'in_progress' then
    return jsonb_build_object(
      'ok', true,
      'message', 'Trip started.',
      'pinAttempts', v_trip.pin_attempts,
      'pinLocked', false,
      'trip', public._trip_payload(v_trip.id, v_actor)
    );
  end if;
  if v_trip.status <> 'arrived' then
    raise exception 'Tap Arrived before asking for the PIN.'
      using errcode = 'check_violation';
  end if;

  perform public._rate_limit(v_actor, 'start_trip', 8);

  if v_trip.pin_locked_at is not null or v_trip.pin_attempts >= 3 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Too many tries. Contact DROP support.',
      'pinAttempts', v_trip.pin_attempts,
      'pinLocked', true,
      'trip', public._trip_payload(v_trip.id, v_actor)
    );
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    perform public._log_event('trip', v_trip.id, v_actor, 'start_trip', jsonb_build_object('ok', false));
    return jsonb_build_object(
      'ok', false,
      'message', 'Enter the 4-digit PIN.',
      'pinAttempts', v_trip.pin_attempts,
      'pinLocked', false,
      'trip', public._trip_payload(v_trip.id, v_actor)
    );
  end if;

  if extensions.crypt(p_pin, v_trip.pin_hash) = v_trip.pin_hash then
    update public.trips
    set status = 'in_progress',
        started_at = coalesce(started_at, now())
    where id = v_trip.id;
    delete from public.trip_boarding_pins where trip_id = v_trip.id;
    perform public._log_event('trip', v_trip.id, v_actor, 'start_trip', jsonb_build_object('ok', true));
    insert into public.audit_log (entity, entity_id, actor_id, event, payload)
    values (
      'trip',
      v_trip.id,
      v_actor,
      'start_trip',
      jsonb_build_object('agreedFareKobo', v_trip.agreed_fare_kobo)
    );
    return jsonb_build_object(
      'ok', true,
      'message', 'Trip started.',
      'pinAttempts', v_trip.pin_attempts,
      'pinLocked', false,
      'trip', public._trip_payload(v_trip.id, v_actor)
    );
  end if;

  v_attempts := v_trip.pin_attempts + 1;
  if v_attempts >= 3 then
    v_locked := true;
    v_message := 'Too many tries. Contact DROP support.';
  else
    v_message := 'Wrong PIN. ' || (3 - v_attempts)::text || case when (3 - v_attempts) = 1 then ' try' else ' tries' end || ' left.';
  end if;

  update public.trips
  set pin_attempts = v_attempts,
      pin_locked_at = case when v_locked then now() else pin_locked_at end
  where id = v_trip.id;

  perform public._log_event(
    'trip',
    v_trip.id,
    v_actor,
    'start_trip',
    jsonb_build_object('ok', false, 'attempts', v_attempts, 'locked', v_locked)
  );
  if v_locked then
    insert into public.audit_log (entity, entity_id, actor_id, event, payload)
    values (
      'trip',
      v_trip.id,
      v_actor,
      'pin_locked',
      jsonb_build_object('attempts', v_attempts, 'agreedFareKobo', v_trip.agreed_fare_kobo)
    );
  end if;

  return jsonb_build_object(
    'ok', false,
    'message', v_message,
    'pinAttempts', v_attempts,
    'pinLocked', v_locked,
    'trip', public._trip_payload(v_trip.id, v_actor)
  );
end;
$fn$;

create or replace function public.complete_trip(p_trip_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_actor uuid := public._require_active_profile();
  v_trip public.trips;
  v_amount integer;
  v_method public.payment_method;
begin
  v_trip := public._load_trip(p_trip_id);
  if v_trip.rider_id <> v_actor then
    raise exception 'Only the rider can finish the trip.'
      using errcode = 'insufficient_privilege';
  end if;

  select amount_kobo, method
  into v_amount, v_method
  from public.payments
  where trip_id = v_trip.id
  for update;

  if v_amount is null then
    raise exception 'This trip has no cash record.'
      using errcode = 'check_violation';
  end if;
  if v_method is distinct from 'cash' or v_amount is distinct from v_trip.agreed_fare_kobo then
    raise exception 'The cash amount must match the locked fare.'
      using errcode = 'check_violation';
  end if;
  if v_trip.status = 'completed' then
    return public._trip_payload(v_trip.id, v_actor);
  end if;
  if v_trip.status <> 'in_progress' then
    raise exception 'End the trip only after it has started.'
      using errcode = 'check_violation';
  end if;

  update public.trips
  set status = 'completed',
      completed_at = coalesce(completed_at, now())
  where id = v_trip.id;

  update public.payments
  set status = 'confirmed',
      confirmed_by_rider_at = coalesce(confirmed_by_rider_at, now())
  where trip_id = v_trip.id;

  perform public._log_event(
    'trip',
    v_trip.id,
    v_actor,
    'complete_trip',
    jsonb_build_object('method', 'cash', 'amountKobo', v_trip.agreed_fare_kobo)
  );
  insert into public.audit_log (entity, entity_id, actor_id, event, payload)
  values (
    'trip',
    v_trip.id,
    v_actor,
    'complete_trip',
    jsonb_build_object('method', 'cash', 'amountKobo', v_trip.agreed_fare_kobo)
  );

  return public._trip_payload(v_trip.id, v_actor);
end;
$fn$;

create or replace function public.cancel_trip(
  p_trip_id uuid,
  p_reason text,
  p_confirm_started boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_actor uuid := public._require_active_profile();
  v_trip public.trips;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  v_trip := public._load_trip(p_trip_id);
  if char_length(v_reason) < 1 then
    raise exception 'Say why you are cancelling.'
      using errcode = 'check_violation';
  end if;
  if char_length(v_reason) > 280 then
    raise exception 'Keep the reason under 280 characters.'
      using errcode = 'check_violation';
  end if;
  if v_trip.status = 'cancelled' then
    raise exception 'This trip is already cancelled.'
      using errcode = 'check_violation';
  end if;
  if v_trip.status = 'completed' then
    raise exception 'This trip is already finished.'
      using errcode = 'check_violation';
  end if;
  if v_trip.status = 'in_progress' and not coalesce(p_confirm_started, false) then
    raise exception 'This trip has started. Confirm to stop it.'
      using errcode = 'check_violation';
  end if;

  update public.trips
  set status = 'cancelled',
      cancelled_by = v_actor,
      cancel_reason = v_reason,
      cancelled_at = coalesce(cancelled_at, now())
  where id = v_trip.id;

  delete from public.trip_boarding_pins where trip_id = v_trip.id;

  perform public._log_event(
    'trip',
    v_trip.id,
    v_actor,
    'cancel_trip',
    jsonb_build_object(
      'fromStatus', v_trip.status,
      'agreedFareKobo', v_trip.agreed_fare_kobo,
      'reason', v_reason
    )
  );
  insert into public.audit_log (entity, entity_id, actor_id, event, payload)
  values (
    'trip',
    v_trip.id,
    v_actor,
    'cancel_trip',
    jsonb_build_object(
      'fromStatus', v_trip.status,
      'agreedFareKobo', v_trip.agreed_fare_kobo,
      'reason', v_reason
    )
  );

  return public._trip_payload(v_trip.id, v_actor);
end;
$fn$;

create or replace function public.update_trip_location(
  p_trip_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_heading double precision,
  p_speed double precision,
  p_accuracy double precision,
  p_source text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $fn$
declare
  v_actor uuid := public._require_active_profile();
  v_trip public.trips;
  v_point geography;
  v_old public.trip_locations;
  v_moved double precision;
  v_lat double precision;
  v_lng double precision;
begin
  v_trip := public._load_trip(p_trip_id);
  if v_trip.rider_id <> v_actor then
    raise exception 'This trip is not yours.'
      using errcode = 'insufficient_privilege';
  end if;
  if v_trip.status not in ('assigned', 'arrived', 'in_progress') then
    raise exception 'This trip is no longer live.'
      using errcode = 'check_violation';
  end if;
  if p_source is distinct from 'device' and p_source is distinct from 'simulated' then
    raise exception 'Say whether this location is from the phone or a test.'
      using errcode = 'check_violation';
  end if;
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

  v_point := public._geo_point(p_lat, p_lng);
  v_lat := extensions.st_y(v_point::extensions.geometry);
  v_lng := extensions.st_x(v_point::extensions.geometry);

  select * into v_old
  from public.trip_locations
  where trip_id = v_trip.id
  for update;

  if p_source = 'device' and v_old.trip_id is not null and v_old.recorded_at > now() - interval '5 seconds' then
    v_moved := extensions.st_distance(public._geo_point(v_old.latitude, v_old.longitude), v_point);
    if v_moved < 20 then
      return jsonb_build_object('ok', true, 'stored', false, 'source', 'device');
    end if;
  end if;

  insert into public.trip_locations (
    trip_id,
    rider_id,
    latitude,
    longitude,
    heading_deg,
    speed_mps,
    accuracy_m,
    source,
    recorded_at
  )
  values (
    v_trip.id,
    v_actor,
    v_lat,
    v_lng,
    p_heading,
    p_speed,
    p_accuracy,
    p_source,
    now()
  )
  on conflict (trip_id) do update
  set latitude = excluded.latitude,
      longitude = excluded.longitude,
      heading_deg = excluded.heading_deg,
      speed_mps = excluded.speed_mps,
      accuracy_m = excluded.accuracy_m,
      source = excluded.source,
      recorded_at = excluded.recorded_at;

  if p_source = 'device' then
    update public.riders
    set last_location = v_point,
        last_seen_at = now(),
        heading_deg = p_heading,
        speed_mps = p_speed,
        accuracy_m = p_accuracy
    where profile_id = v_actor;
  end if;

  return jsonb_build_object('ok', true, 'stored', true, 'source', p_source);
end;
$fn$;

-- Keep the M3 select path, and also store the PIN where only the passenger can read it.
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

  insert into public.trip_boarding_pins (trip_id, pin_code)
  values (v_trip, v_pin);

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

revoke all on function public._load_trip(uuid) from public, anon, authenticated;
revoke all on function public._trip_payload(uuid, uuid) from public, anon, authenticated;
revoke all on function public.trip_view(uuid) from public, anon;
revoke all on function public.mark_arrived(uuid) from public, anon;
revoke all on function public.start_trip(uuid, text) from public, anon;
revoke all on function public.complete_trip(uuid) from public, anon;
revoke all on function public.cancel_trip(uuid, text, boolean) from public, anon;
revoke all on function public.update_trip_location(uuid, double precision, double precision, double precision, double precision, double precision, text) from public, anon;

grant execute on function public.trip_view(uuid) to authenticated, service_role;
grant execute on function public.mark_arrived(uuid) to authenticated, service_role;
grant execute on function public.start_trip(uuid, text) to authenticated, service_role;
grant execute on function public.complete_trip(uuid) to authenticated, service_role;
grant execute on function public.cancel_trip(uuid, text, boolean) to authenticated, service_role;
grant execute on function public.update_trip_location(uuid, double precision, double precision, double precision, double precision, double precision, text) to authenticated, service_role;

alter table public.trip_locations replica identity full;
alter table public.payments replica identity full;

do $pub$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach t in array array['trip_locations', 'payments']
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
