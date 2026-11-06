-- M4: PIN checks, trip status, cash, cancellation, and who can see a location.
-- auth.uid() on the Supabase database reads request.jwt.claim.sub, so each user switch sets that too.

begin;

create extension if not exists pgtap with schema extensions;

set search_path = extensions, public;

select plan(37);

create temp table m4_state (
  k text primary key,
  v jsonb
);
grant all on m4_state to authenticated;

update public.riders
set is_online = true,
    seats_occupied = 0,
    last_seen_at = now(),
    last_location = public._geo_point(6.6176, 3.342)
where profile_id = '22222222-2222-4222-8222-222222222222';

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

insert into m4_state (k, v)
select 'request', public.create_request(6.614, 3.342, 'Near the yellow shop', 6.621, 3.348, 'Computer Village', 50000);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

insert into m4_state (k, v)
select 'offer', public.submit_offer(
  (select (v ->> 'requestId')::uuid from m4_state where k = 'request'),
  'accept',
  50000
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

insert into m4_state (k, v)
select 'picked', public.select_offer((select (v ->> 'offerId')::uuid from m4_state where k = 'offer'));

select is(
  (
    select pin_code
    from public.trip_boarding_pins
    where trip_id = (select (v ->> 'tripId')::uuid from m4_state where k = 'picked')
  ),
  (select v ->> 'pin' from m4_state where k = 'picked'),
  'the passenger can read the boarding PIN saved at accept'
);

select is(
  (public.trip_view((select (v ->> 'tripId')::uuid from m4_state where k = 'picked')) ->> 'pin'),
  (select v ->> 'pin' from m4_state where k = 'picked'),
  'trip view gives the PIN to the passenger'
);

reset role;

select ok(
  extensions.crypt(
    (select v ->> 'pin' from m4_state where k = 'picked'),
    (select pin_hash from public.trips where id = (select (v ->> 'tripId')::uuid from m4_state where k = 'picked'))
  ) = (select pin_hash from public.trips where id = (select (v ->> 'tripId')::uuid from m4_state where k = 'picked')),
  'the boarding PIN is still stored as a hash'
);

select ok(
  not exists (
    select 1
    from public.request_events
    where event in ('select_offer', 'start_trip', 'pin_locked')
      and payload::text like '%' || (select v ->> 'pin' from m4_state where k = 'picked') || '%'
  ),
  'the boarding PIN is not written to the event log'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  (
    select count(*)::int
    from public.trip_boarding_pins
    where trip_id = (select (v ->> 'tripId')::uuid from m4_state where k = 'picked')
  ),
  0,
  'the assigned rider cannot read the PIN'
);

select is(
  (public.trip_view((select (v ->> 'tripId')::uuid from m4_state where k = 'picked')) -> 'pin'),
  'null'::jsonb,
  'trip view hides the PIN from the rider'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  (select count(*)::int from public.trip_boarding_pins),
  0,
  'another rider cannot read any boarding PIN'
);

select throws_ok(
  $$select public.trip_view((select (v ->> 'tripId')::uuid from m4_state where k = 'picked'))$$,
  '42501',
  'This trip is not yours.',
  'another rider cannot open the trip'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$select public.start_trip((select (v ->> 'tripId')::uuid from m4_state where k = 'picked'), '0000')$$,
  '23514',
  'Tap Arrived before asking for the PIN.',
  'the trip cannot start before the rider arrives'
);

select is(
  (public.mark_arrived((select (v ->> 'tripId')::uuid from m4_state where k = 'picked')) ->> 'status'),
  'arrived',
  'the rider can mark arrival'
);

insert into m4_state (k, v)
select 'wrong', public.start_trip(
  (select (v ->> 'tripId')::uuid from m4_state where k = 'picked'),
  '0000'
);

select is((select v ->> 'ok' from m4_state where k = 'wrong'), 'false', 'a wrong PIN does not start the trip');
select is((select v ->> 'message' from m4_state where k = 'wrong'), 'Wrong PIN. 2 tries left.', 'a wrong PIN says how many tries are left');
select is(
  (select status::text from public.trips where id = (select (v ->> 'tripId')::uuid from m4_state where k = 'picked')),
  'arrived',
  'a wrong PIN leaves the trip arrived'
);
select is(
  (select pin_attempts from public.trips where id = (select (v ->> 'tripId')::uuid from m4_state where k = 'picked')),
  1,
  'a wrong PIN is counted'
);

insert into m4_state (k, v)
select 'started', public.start_trip(
  (select (v ->> 'tripId')::uuid from m4_state where k = 'picked'),
  (select v ->> 'pin' from m4_state where k = 'picked')
);

select is((select v ->> 'ok' from m4_state where k = 'started'), 'true', 'the right PIN starts the trip');
select is(
  (select status::text from public.trips where id = (select (v ->> 'tripId')::uuid from m4_state where k = 'picked')),
  'in_progress',
  'the trip is in progress after the PIN'
);
select is(
  (select agreed_fare_kobo from public.trips where id = (select (v ->> 'tripId')::uuid from m4_state where k = 'picked')),
  50000,
  'starting the trip does not change the fare'
);

reset role;
select is(
  (select count(*)::int from public.trip_boarding_pins),
  0,
  'the PIN is removed once the trip starts'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$select public.update_trip_location(
      (select (v ->> 'tripId')::uuid from m4_state where k = 'picked'),
      6.615, 3.343, null, null, null, 'device'
    )$$,
  '42501',
  'This trip is not yours.',
  'another rider cannot update the trip location'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

insert into m4_state (k, v)
select 'sim', public.update_trip_location(
  (select (v ->> 'tripId')::uuid from m4_state where k = 'picked'),
  6.616, 3.344, null, null, 25, 'simulated'
);

select is((select v ->> 'source' from m4_state where k = 'sim'), 'simulated', 'a test fix is stored as simulated');

reset role;
select ok(
  (select last_location from public.riders where profile_id = '22222222-2222-4222-8222-222222222222')
    = public._geo_point(6.6176, 3.342),
  'a simulated fix does not replace the rider matching location'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  (select source from public.trip_locations where trip_id = (select (v ->> 'tripId')::uuid from m4_state where k = 'picked')),
  'simulated',
  'the passenger can read the trip location'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  (select count(*)::int from public.trip_locations),
  0,
  'another rider cannot read the trip location'
);

select throws_ok(
  $$insert into public.trip_locations (trip_id, rider_id, latitude, longitude, source)
    values (
      (select (v ->> 'tripId')::uuid from m4_state where k = 'picked'),
      '22222222-2222-4222-8222-222222222222',
      6.62, 3.35, 'device'
    )$$,
  '42501',
  'permission denied for table trip_locations',
  'location rows are not written directly'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  (public.complete_trip((select (v ->> 'tripId')::uuid from m4_state where k = 'picked')) ->> 'status'),
  'completed',
  'the rider can finish the trip'
);

reset role;
select is(
  (
    select method::text || ':' || status::text || ':' || amount_kobo::text
    from public.payments
    where trip_id = (select (v ->> 'tripId')::uuid from m4_state where k = 'picked')
  ),
  'cash:confirmed:50000',
  'completion records cash for the locked fare'
);

select throws_ok(
  $$update public.payments
      set amount_kobo = amount_kobo + 5000
    where trip_id = (select (v ->> 'tripId')::uuid from m4_state where k = 'picked')$$,
  '23514',
  'The cash amount must match the locked fare.',
  'the cash amount cannot drift from the fare'
);

insert into public.ride_requests (
  id, passenger_id, pickup, dropoff, dropoff_label, distance_m,
  suggested_low_kobo, suggested_high_kobo, min_kobo, offer_kobo, status, radius_m, expires_at
) values (
  'b4444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  public._geo_point(6.614, 3.342),
  public._geo_point(6.621, 3.348),
  'Before start',
  800, 30000, 45000, 30000, 42000, 'matched', 1500, now()
);

insert into public.ride_offers (
  id, request_id, rider_id, type, amount_kobo, eta_s, seats_occupied_at_offer, status, expires_at
) values (
  'b5555555-5555-4555-8555-555555555555',
  'b4444444-4444-4444-8444-444444444444',
  '22222222-2222-4222-8222-222222222222',
  'accept', 42000, 120, 0, 'selected', now() + interval '1 minute'
);

insert into public.trips (
  id, request_id, offer_id, passenger_id, rider_id, keke_id, agreed_fare_kobo, pin_hash, status
) values (
  'b6666666-6666-4666-8666-666666666666',
  'b4444444-4444-4444-8444-444444444444',
  'b5555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  42000,
  extensions.crypt('2468', extensions.gen_salt('bf')),
  'assigned'
);

insert into public.payments (trip_id, method, amount_kobo, status)
values ('b6666666-6666-4666-8666-666666666666', 'cash', 42000, 'pending');

insert into public.trip_boarding_pins (trip_id, pin_code)
values ('b6666666-6666-4666-8666-666666666666', '2468');

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select public.cancel_trip('b6666666-6666-4666-8666-666666666666', 'Changed my mind', false);

reset role;
select is(
  (
    select status::text || ':' || agreed_fare_kobo::text || ':' || (cancelled_at is not null)::text
    from public.trips
    where id = 'b6666666-6666-4666-8666-666666666666'
  ),
  'cancelled:42000:true',
  'cancelling before the start keeps the fare and records the time'
);
select is(
  (select status::text from public.payments where trip_id = 'b6666666-6666-4666-8666-666666666666'),
  'pending',
  'a cancel before the start does not mark the cash paid'
);
select ok(
  exists (
    select 1
    from public.audit_log
    where entity = 'trip'
      and entity_id = 'b6666666-6666-4666-8666-666666666666'
      and event = 'cancel_trip'
      and payload ->> 'agreedFareKobo' = '42000'
  ),
  'the cancel is written to the audit log'
);

insert into public.ride_requests (
  id, passenger_id, pickup, dropoff, dropoff_label, distance_m,
  suggested_low_kobo, suggested_high_kobo, min_kobo, offer_kobo, status, radius_m, expires_at
) values (
  'c4444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  public._geo_point(6.614, 3.342),
  public._geo_point(6.621, 3.348),
  'Pin lock',
  800, 30000, 45000, 30000, 43000, 'matched', 1500, now()
);

insert into public.ride_offers (
  id, request_id, rider_id, type, amount_kobo, eta_s, seats_occupied_at_offer, status, expires_at
) values (
  'c5555555-5555-4555-8555-555555555555',
  'c4444444-4444-4444-8444-444444444444',
  '22222222-2222-4222-8222-222222222222',
  'accept', 43000, 120, 0, 'selected', now() + interval '1 minute'
);

insert into public.trips (
  id, request_id, offer_id, passenger_id, rider_id, keke_id, agreed_fare_kobo, pin_hash, status, arrived_at
) values (
  'c6666666-6666-4666-8666-666666666666',
  'c4444444-4444-4444-8444-444444444444',
  'c5555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  43000,
  extensions.crypt('1357', extensions.gen_salt('bf')),
  'arrived',
  now()
);

insert into public.payments (trip_id, method, amount_kobo, status)
values ('c6666666-6666-4666-8666-666666666666', 'cash', 43000, 'pending');

insert into public.trip_boarding_pins (trip_id, pin_code)
values ('c6666666-6666-4666-8666-666666666666', '1357');

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select public.start_trip('c6666666-6666-4666-8666-666666666666', '0000');
select public.start_trip('c6666666-6666-4666-8666-666666666666', '1111');
insert into m4_state (k, v)
select 'locked', public.start_trip('c6666666-6666-4666-8666-666666666666', '2222');
insert into m4_state (k, v)
select 'still', public.start_trip('c6666666-6666-4666-8666-666666666666', '1357');

select is((select v ->> 'pinLocked' from m4_state where k = 'locked'), 'true', 'three wrong PINs lock the trip');
select is(
  (select v ->> 'message' from m4_state where k = 'still'),
  'Too many tries. Contact DROP support.',
  'the correct PIN does not start a locked trip'
);
select is(
  (select pin_attempts from public.trips where id = 'c6666666-6666-4666-8666-666666666666'),
  3,
  'further tries do not keep adding attempts'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  (select pin_code from public.trip_boarding_pins where trip_id = 'c6666666-6666-4666-8666-666666666666'),
  '1357',
  'the passenger can still see the PIN after it locks'
);

select public.cancel_trip('c6666666-6666-4666-8666-666666666666', 'PIN locked', false);

reset role;

insert into public.ride_requests (
  id, passenger_id, pickup, dropoff, dropoff_label, distance_m,
  suggested_low_kobo, suggested_high_kobo, min_kobo, offer_kobo, status, radius_m, expires_at
) values (
  'd4444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  public._geo_point(6.614, 3.342),
  public._geo_point(6.621, 3.348),
  'After start',
  800, 30000, 45000, 30000, 44000, 'matched', 1500, now()
);

insert into public.ride_offers (
  id, request_id, rider_id, type, amount_kobo, eta_s, seats_occupied_at_offer, status, expires_at
) values (
  'd5555555-5555-4555-8555-555555555555',
  'd4444444-4444-4444-8444-444444444444',
  '22222222-2222-4222-8222-222222222222',
  'accept', 44000, 120, 0, 'selected', now() + interval '1 minute'
);

insert into public.trips (
  id, request_id, offer_id, passenger_id, rider_id, keke_id, agreed_fare_kobo, pin_hash, status, started_at
) values (
  'd6666666-6666-4666-8666-666666666666',
  'd4444444-4444-4444-8444-444444444444',
  'd5555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  44000,
  extensions.crypt('9753', extensions.gen_salt('bf')),
  'in_progress',
  now()
);

insert into public.payments (trip_id, method, amount_kobo, status)
values ('d6666666-6666-4666-8666-666666666666', 'cash', 44000, 'pending');

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$select public.cancel_trip('d6666666-6666-4666-8666-666666666666', 'Stop', false)$$,
  '23514',
  'This trip has started. Confirm to stop it.',
  'a started trip is not cancelled without confirmation'
);

select public.cancel_trip('d6666666-6666-4666-8666-666666666666', 'Both agreed to stop', true);

reset role;
select is(
  (
    select status::text || ':' || agreed_fare_kobo::text
    from public.trips
    where id = 'd6666666-6666-4666-8666-666666666666'
  ),
  'cancelled:44000',
  'a confirmed stop after the start keeps the trip and the fare'
);
select is(
  (select status::text from public.payments where trip_id = 'd6666666-6666-4666-8666-666666666666'),
  'pending',
  'stopping after the start does not mark the cash paid'
);

select * from finish();

rollback;
