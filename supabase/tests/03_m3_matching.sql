-- M3: minimum fare, one counter, expiry, one trip per rider, carrying passengers, restricted zones.

begin;

create extension if not exists pgtap with schema extensions;

set search_path = extensions, public;

select plan(42);

select is(
  public._geohash(57.64911, 10.40744, 7),
  'u4pruyd',
  'geohash matches the published value'
);

select ok(
  exists (
    select 1 from pg_indexes where indexname = 'trips_one_active_drop_per_rider'
  ),
  'one active DROP per rider is enforced'
);

create temp table m3_points (
  name text primary key,
  lat double precision,
  lng double precision
);

insert into m3_points (name, lat, lng) values ('pickup', 6.614, 3.342);

insert into m3_points (name, lat, lng)
select 'drop800', st_y(g::geometry), st_x(g::geometry)
from (select st_project(public._geo_point(6.614, 3.342), 800, 0) as g) s;

insert into m3_points (name, lat, lng)
select 'near400', st_y(g::geometry), st_x(g::geometry)
from (select st_project(public._geo_point(6.614, 3.342), 400, 0) as g) s;

insert into m3_points (name, lat, lng)
select 'mid2000', st_y(g::geometry), st_x(g::geometry)
from (select st_project(public._geo_point(6.614, 3.342), 2000, 0) as g) s;

insert into m3_points (name, lat, lng)
select 'far4000', st_y(g::geometry), st_x(g::geometry)
from (select st_project(public._geo_point(6.614, 3.342), 4000, 0) as g) s;

grant select on m3_points to authenticated;

create temp table m3_state (
  k text primary key,
  v jsonb
);
grant all on m3_state to authenticated;

do $$
declare
  cols text := 'id';
  vals text := quote_literal('44444444-4444-4444-8444-444444444444') || '::uuid';
  pairs text[] := array[
    'instance_id|' || quote_literal('00000000-0000-0000-0000-000000000000') || '::uuid',
    'aud|' || quote_literal('authenticated'),
    'role|' || quote_literal('authenticated'),
    'email|' || quote_literal('bola.passenger@drop.test'),
    'encrypted_password|' || quote_literal(extensions.crypt('drop-local-only', extensions.gen_salt('bf'))),
    'email_confirmed_at|now()',
    'phone|' || quote_literal('+2348000000005'),
    'phone_confirmed_at|now()',
    'raw_app_meta_data|' || quote_literal('{"provider":"email","providers":["email"],"role":"passenger"}') || '::jsonb',
    'raw_user_meta_data|' || quote_literal('{"full_name":"Bola Adewale"}') || '::jsonb',
    'created_at|now()',
    'updated_at|now()',
    'confirmation_token|' || quote_literal(''),
    'recovery_token|' || quote_literal(''),
    'email_change|' || quote_literal(''),
    'email_change_token_new|' || quote_literal(''),
    'email_change_token_current|' || quote_literal(''),
    'phone_change|' || quote_literal(''),
    'phone_change_token|' || quote_literal(''),
    'reauthentication_token|' || quote_literal(''),
    'is_sso_user|false',
    'is_anonymous|false',
    'is_super_admin|false'
  ];
  pair text;
  colname text;
  expr text;
begin
  foreach pair in array pairs loop
    colname := split_part(pair, '|', 1);
    expr := substr(pair, length(colname) + 2);
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'users'
        and column_name = colname
    ) then
      cols := cols || ', ' || colname;
      vals := vals || ', ' || expr;
    end if;
  end loop;
  execute 'insert into auth.users (' || cols || ') values (' || vals || ') on conflict (id) do nothing';
end
$$;

update public.profiles
set phone = '+2348000000005', full_name = 'Bola Adewale'
where id = '44444444-4444-4444-8444-444444444444';

update public.riders
set verification_status = 'approved',
    approved_at = now(),
    is_online = false
where profile_id = '66666666-6666-4666-8666-666666666666';

set local role anon;
select throws_ok(
  $$select public.create_request(6.614, 3.342, null, 6.62, 3.35, 'Mall', 50000)$$,
  '42501',
  'permission denied for function create_request',
  'a stranger cannot open a request'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set local role authenticated;

select throws_ok(
  $$select public.fare_quote(6.614, 3.342, 6.55, 3.40)$$,
  '23514',
  'The drop-off is outside the DROP service area.',
  'a drop-off outside the service area is blocked'
);

select throws_ok(
  $$select public.fare_quote(6.55, 3.40, 6.614, 3.342)$$,
  '23514',
  'The pickup is outside the DROP service area.',
  'a pickup outside the service area is blocked'
);

select throws_ok(
  $$select public.fare_quote(6.614, 3.342, 6.595, 3.365)$$,
  '23514',
  'The drop-off is in a restricted area. Pick another place.',
  'a restricted drop-off is blocked'
);

insert into m3_state (k, v)
select 'quoted', public.fare_quote(p.lat, p.lng, d.lat, d.lng)
from m3_points p
join m3_points d on d.name = 'drop800'
where p.name = 'pickup';

select throws_ok(
  $$select public.cache_road_distance(
      (select lat from m3_points where name = 'pickup'),
      (select lng from m3_points where name = 'pickup'),
      (select lat from m3_points where name = 'drop800'),
      (select lng from m3_points where name = 'drop800'),
      100
    )$$,
  '23514',
  'That road distance does not match these places.',
  'a road distance shorter than the straight line is rejected'
);

select lives_ok(
  $$select public.cache_road_distance(
      (select lat from m3_points where name = 'pickup'),
      (select lng from m3_points where name = 'pickup'),
      (select lat from m3_points where name = 'drop800'),
      (select lng from m3_points where name = 'drop800'),
      2000
    )$$,
  'a plausible Google road distance can be cached'
);

insert into m3_state (k, v)
select 'cached', public.fare_quote(p.lat, p.lng, d.lat, d.lng)
from m3_points p
join m3_points d on d.name = 'drop800'
where p.name = 'pickup'
on conflict (k) do update set v = excluded.v;

select is((select v ->> 'distanceSource' from m3_state where k = 'cached'), 'google', 'the quote uses the cached road distance');
select is((select (v ->> 'distanceM')::int from m3_state where k = 'cached'), 2000, 'the cached distance is 2 km');
select is((select (v ->> 'midpointKobo')::int from m3_state where k = 'cached'), 50000, '2 km quotes a ₦500 midpoint');
select is((select (v ->> 'minKobo')::int from m3_state where k = 'cached'), 30000, 'the Ikeja minimum is ₦300');

select throws_ok(
  $$select public.create_request(
      (select lat from m3_points where name = 'pickup'),
      (select lng from m3_points where name = 'pickup'),
      'Near the blue kiosk',
      (select lat from m3_points where name = 'drop800'),
      (select lng from m3_points where name = 'drop800'),
      'Ikeja City Mall',
      25000
    )$$,
  '23514',
  'The fare is below the minimum.',
  'an offer under the minimum is rejected'
);

select throws_ok(
  $$select public.create_request(
      (select lat from m3_points where name = 'pickup'),
      (select lng from m3_points where name = 'pickup'),
      'Near the blue kiosk',
      (select lat from m3_points where name = 'drop800'),
      (select lng from m3_points where name = 'drop800'),
      'Ikeja City Mall',
      31000
    )$$,
  '23514',
  'Fares move in steps of ₦50.',
  'a fare off the ₦50 step is rejected'
);

select throws_ok(
  $$insert into public.ride_requests (
      passenger_id, pickup, dropoff, dropoff_label, distance_m,
      suggested_low_kobo, suggested_high_kobo, min_kobo, offer_kobo, radius_m, expires_at
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'SRID=4326;POINT(3.342 6.614)'::extensions.geography,
      'SRID=4326;POINT(3.35 6.62)'::extensions.geography,
      'Mall', 1000, 30000, 40000, 30000, 30000, 1500, now()
    )$$,
  '42501',
  'permission denied for table ride_requests',
  'a passenger cannot write a request directly'
);

select throws_ok(
  'select * from public.route_cache',
  '42501',
  'permission denied for table route_cache',
  'the road-distance cache is not readable by the apps'
);

reset role;

update public.riders
set is_online = true,
    seats_occupied = 3,
    last_seen_at = now(),
    last_location = public._geo_point(
      (select lat from m3_points where name = 'near400'),
      (select lng from m3_points where name = 'near400')
    )
where profile_id = '22222222-2222-4222-8222-222222222222';

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

insert into m3_state (k, v)
select 'full', public.create_request(
  (select lat from m3_points where name = 'pickup'),
  (select lng from m3_points where name = 'pickup'),
  'Near the blue kiosk',
  (select lat from m3_points where name = 'drop800'),
  (select lng from m3_points where name = 'drop800'),
  'Ikeja City Mall',
  50000
);

select is(
  (select count(*)::int from public.request_recipients where request_id = (select (v ->> 'requestId')::uuid from m3_state where k = 'full')),
  0,
  'a full Keke, three seats taken, is not asked'
);

select lives_ok(
  $$select public.cancel_request((select (v ->> 'requestId')::uuid from m3_state where k = 'full'))$$,
  'the passenger can cancel before a rider is chosen'
);

reset role;

update public.riders
set is_online = true,
    seats_occupied = 2,
    last_seen_at = now(),
    last_location = public._geo_point(
      (select lat from m3_points where name = 'mid2000'),
      (select lng from m3_points where name = 'mid2000')
    )
where profile_id = '22222222-2222-4222-8222-222222222222';

update public.riders
set is_online = true,
    seats_occupied = 0,
    last_seen_at = now() - interval '5 minutes',
    last_location = public._geo_point(
      (select lat from m3_points where name = 'far4000'),
      (select lng from m3_points where name = 'far4000')
    )
where profile_id = '66666666-6666-4666-8666-666666666666';

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

insert into m3_state (k, v)
select 'ladder', public.create_request(
  (select lat from m3_points where name = 'pickup'),
  (select lng from m3_points where name = 'pickup'),
  'Near the blue kiosk',
  (select lat from m3_points where name = 'drop800'),
  (select lng from m3_points where name = 'drop800'),
  'Ikeja City Mall',
  50000
);

select throws_ok(
  $$select public.create_request(
      (select lat from m3_points where name = 'pickup'),
      (select lng from m3_points where name = 'pickup'),
      null,
      (select lat from m3_points where name = 'drop800'),
      (select lng from m3_points where name = 'drop800'),
      'Ikeja City Mall',
      50000
    )$$,
  '23514',
  'You already have a request open. Cancel it before starting another.',
  'a second open request is rejected'
);

select is(
  (select count(*)::int from public.request_recipients where request_id = (select (v ->> 'requestId')::uuid from m3_state where k = 'ladder')),
  0,
  'the first round stays inside 1.5 km'
);

insert into m3_state (k, v)
select 'wider', public.extend_search((select (v ->> 'requestId')::uuid from m3_state where k = 'ladder'))
on conflict (k) do update set v = excluded.v;

select is((select (v ->> 'radiusM')::int from m3_state where k = 'wider'), 3000, 'keep waiting widens the search to 3 km');
select is(
  (
    select count(*)::int
    from public.request_recipients
    where request_id = (select (v ->> 'requestId')::uuid from m3_state where k = 'ladder')
      and rider_id = '22222222-2222-4222-8222-222222222222'
  ),
  1,
  'a rider carrying two passengers is still asked'
);
select is(
  (
    select count(*)::int
    from public.request_recipients
    where request_id = (select (v ->> 'requestId')::uuid from m3_state where k = 'ladder')
      and rider_id = '66666666-6666-4666-8666-666666666666'
  ),
  0,
  'a rider whose location is stale, or outside 3 km, is not asked yet'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.submit_offer(
      (select (v ->> 'requestId')::uuid from m3_state where k = 'ladder'),
      'accept',
      50000
    )$$,
  '42501',
  'This request was not sent to you.',
  'a rider who was not asked cannot offer'
);

reset role;
update public.riders
set last_seen_at = now()
where profile_id = '66666666-6666-4666-8666-666666666666';

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

insert into m3_state (k, v)
select 'widest', public.extend_search((select (v ->> 'requestId')::uuid from m3_state where k = 'ladder'))
on conflict (k) do update set v = excluded.v;

select is((select (v ->> 'radiusM')::int from m3_state where k = 'widest'), 5000, 'the next widen reaches 5 km');
select is(
  (
    select count(*)::int
    from public.request_recipients
    where request_id = (select (v ->> 'requestId')::uuid from m3_state where k = 'ladder')
      and rider_id = '66666666-6666-4666-8666-666666666666'
  ),
  1,
  'a fresh rider inside 5 km is asked on the later round'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

insert into m3_state (k, v)
select 'counter', public.submit_offer(
  (select (v ->> 'requestId')::uuid from m3_state where k = 'ladder'),
  'counter',
  60000
);

select is(
  (select (v ->> 'seats')::int from m3_state where k = 'counter'),
  2,
  'the offer records that the rider is carrying two passengers'
);

reset role;
select is(
  (select (v ->> 'etaS')::int from m3_state where k = 'counter')
    - public._eta_seconds(
      extensions.st_distance(
        (select last_location from public.riders where profile_id = '22222222-2222-4222-8222-222222222222'),
        (select pickup from public.ride_requests where id = (select (v ->> 'requestId')::uuid from m3_state where k = 'ladder'))
      ),
      0
    ),
  240,
  'carrying two passengers adds four minutes to the ETA'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.submit_offer(
      (select (v ->> 'requestId')::uuid from m3_state where k = 'ladder'),
      'counter',
      70000
    )$$,
  '23514',
  'You already sent a counter for this request.',
  'a rider gets one counter'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;
select public.cancel_request((select (v ->> 'requestId')::uuid from m3_state where k = 'ladder'));

reset role;
update public.riders
set seats_occupied = 2,
    last_seen_at = now(),
    is_online = true,
    last_location = public._geo_point(
      (select lat from m3_points where name = 'near400'),
      (select lng from m3_points where name = 'near400')
    )
where profile_id = '22222222-2222-4222-8222-222222222222';

update public.riders
set seats_occupied = 0,
    last_seen_at = now(),
    is_online = true,
    last_location = public._geo_point(
      (select lat from m3_points where name = 'near400'),
      (select lng from m3_points where name = 'near400')
    )
where profile_id = '66666666-6666-4666-8666-666666666666';

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

insert into m3_state (k, v)
select 'ada', public.create_request(
  (select lat from m3_points where name = 'pickup'),
  (select lng from m3_points where name = 'pickup'),
  'Near the blue kiosk',
  (select lat from m3_points where name = 'drop800'),
  (select lng from m3_points where name = 'drop800'),
  'Ikeja City Mall',
  50000
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}',
  true
);
set local role authenticated;

insert into m3_state (k, v)
select 'emeka', public.submit_offer(
  (select (v ->> 'requestId')::uuid from m3_state where k = 'ada'),
  'accept',
  50000
);

select lives_ok(
  $$select public.withdraw_offer((select (v ->> 'offerId')::uuid from m3_state where k = 'emeka'))$$,
  'a rider can withdraw an open offer'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.select_offer((select (v ->> 'offerId')::uuid from m3_state where k = 'emeka'))$$,
  '23514',
  'This offer is no longer open.',
  'a withdrawn offer cannot be selected'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.submit_offer(
      (select (v ->> 'requestId')::uuid from m3_state where k = 'ada'),
      'accept',
      40000
    )$$,
  '23514',
  'An accept must match the passenger''s fare.',
  'an accept at a different fare is rejected'
);

insert into m3_state (k, v)
select 'chinedu', public.submit_offer(
  (select (v ->> 'requestId')::uuid from m3_state where k = 'ada'),
  'accept',
  50000
);

reset role;
update public.ride_offers
set expires_at = now() - interval '1 second'
where id = (select (v ->> 'offerId')::uuid from m3_state where k = 'chinedu');

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.select_offer((select (v ->> 'offerId')::uuid from m3_state where k = 'chinedu'))$$,
  '23514',
  'This offer has expired.',
  'an expired offer cannot be selected'
);

select public.expire_matching();

select is(
  (select status::text from public.ride_offers where id = (select (v ->> 'offerId')::uuid from m3_state where k = 'chinedu')),
  'expired',
  'the sweeper marks the offer expired'
);

reset role;
update public.ride_offers
set status = 'open',
    expires_at = now() + interval '30 seconds'
where id = (select (v ->> 'offerId')::uuid from m3_state where k = 'chinedu');

select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

insert into m3_state (k, v)
select 'bola', public.create_request(
  (select lat from m3_points where name = 'pickup'),
  (select lng from m3_points where name = 'pickup'),
  'By the yellow shop',
  (select lat from m3_points where name = 'drop800'),
  (select lng from m3_points where name = 'drop800'),
  'Computer Village',
  50000
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

insert into m3_state (k, v)
select 'chinedu_bola', public.submit_offer(
  (select (v ->> 'requestId')::uuid from m3_state where k = 'bola'),
  'accept',
  50000
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

insert into m3_state (k, v)
select 'picked', public.select_offer((select (v ->> 'offerId')::uuid from m3_state where k = 'chinedu'));

select is(
  (select count(*)::int from public.trips where rider_id = '22222222-2222-4222-8222-222222222222' and status = 'assigned'),
  1,
  'selecting a rider creates one trip'
);
select is(char_length((select v ->> 'pin' from m3_state where k = 'picked')), 4, 'the passenger receives a 4-digit PIN');

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.select_offer((select (v ->> 'offerId')::uuid from m3_state where k = 'chinedu_bola'))$$,
  '23505',
  'This rider was just booked. Choose another offer.',
  'the second passenger cannot book the same rider'
);

reset role;

select is(
  (select count(*)::int from public.trips where rider_id = '22222222-2222-4222-8222-222222222222' and status = 'assigned'),
  1,
  'two passengers choosing one rider still leave exactly one trip'
);

select ok(
  extensions.crypt(
    (select v ->> 'pin' from m3_state where k = 'picked'),
    (select pin_hash from public.trips where id = (select (v ->> 'tripId')::uuid from m3_state where k = 'picked'))
  ) = (select pin_hash from public.trips where id = (select (v ->> 'tripId')::uuid from m3_state where k = 'picked')),
  'the boarding PIN is stored hashed'
);

select ok(
  not exists (
    select 1 from public.request_events where event = 'select_offer' and payload ? 'pin'
  ),
  'the boarding PIN is not written to the event log'
);

select throws_ok(
  $$update public.trips set agreed_fare_kobo = agreed_fare_kobo + 5000$$,
  '23514',
  'agreed_fare_kobo is locked and cannot be changed',
  'the agreed fare cannot change'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;
select public.cancel_request((select (v ->> 'requestId')::uuid from m3_state where k = 'bola'));

insert into m3_state (k, v)
select 'after', public.create_request(
  (select lat from m3_points where name = 'pickup'),
  (select lng from m3_points where name = 'pickup'),
  null,
  (select lat from m3_points where name = 'drop800'),
  (select lng from m3_points where name = 'drop800'),
  'Allen Avenue junction',
  50000
);

select is(
  (
    select count(*)::int
    from public.request_recipients
    where request_id = (select (v ->> 'requestId')::uuid from m3_state where k = 'after')
      and rider_id = '22222222-2222-4222-8222-222222222222'
  ),
  0,
  'a rider already carrying a DROP is not asked for another'
);

select * from finish();

rollback;
