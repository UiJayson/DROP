-- Requires migrations and supabase/seed.sql.
-- Anonymous role must see zero rows in every public table.
-- The agreed fare cannot be updated, and a rider can only offer once per request.

begin;

create extension if not exists pgtap with schema extensions;

set search_path = extensions, public;

select plan(7);

select is(
  (
    select count(*)::int
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
  ),
  0,
  'row level security is enabled on every public table'
);

select is(
  (
    select count(*)::int
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relforcerowsecurity
  ),
  0,
  'row level security is forced on every public table'
);

create or replace function public._m0_anon_leaks()
returns text[]
language plpgsql
as $$
declare
  rec record;
  row_count bigint;
  leaked text[] := '{}';
begin
  for rec in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
    order by 1
  loop
    begin
      execute 'set local role anon';
      execute format('select count(*) from public.%I', rec.relname) into row_count;
      execute 'reset role';
    exception
      when insufficient_privilege then
        execute 'reset role';
        row_count := 0;
    end;

    if row_count <> 0 then
      leaked := array_append(leaked, rec.relname);
    end if;
  end loop;

  return leaked;
end;
$$;

select is(
  public._m0_anon_leaks(),
  '{}'::text[],
  'anonymous reads return no rows on every public table'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'approved_rider_profiles'
      and column_name in ('phone', 'nin_last4', 'last_location')
  ),
  'approved rider cards omit phone, NIN, and location'
);

insert into public.ride_requests (
  id,
  passenger_id,
  pickup,
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
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  extensions.st_geogfromtext('SRID=4326;POINT(3.3510 6.6010)'),
  extensions.st_geogfromtext('SRID=4326;POINT(3.3550 6.6050)'),
  'Test junction',
  1500,
  30000,
  45000,
  30000,
  35000,
  'searching',
  1500,
  now() + interval '2 minutes'
);

insert into public.ride_offers (
  id,
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
  '55555555-5555-4555-8555-555555555555',
  '44444444-4444-4444-8444-444444444444',
  '22222222-2222-4222-8222-222222222222',
  'accept',
  35000,
  180,
  0,
  'open',
  now() + interval '30 seconds'
);

insert into public.trips (
  id,
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
  '66666666-6666-4666-8666-666666666666',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  35000,
  'test-hash',
  'assigned'
);

select throws_ok(
  $$update public.trips
      set agreed_fare_kobo = agreed_fare_kobo + 100
    where id = '66666666-6666-4666-8666-666666666666'$$,
  '23514',
  'agreed_fare_kobo is locked and cannot be changed',
  'agreed fare stays locked'
);

select throws_ok(
  $$insert into public.ride_offers (
      request_id, rider_id, type, amount_kobo, eta_s, seats_occupied_at_offer, status, expires_at
    ) values (
      '44444444-4444-4444-8444-444444444444',
      '22222222-2222-4222-8222-222222222222',
      'counter',
      40000,
      200,
      0,
      'open',
      now() + interval '30 seconds'
    )$$,
  '23505'
);

insert into public.ride_requests (
  id,
  passenger_id,
  pickup,
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
  '77777777-7777-4777-8777-777777777777',
  '11111111-1111-4111-8111-111111111111',
  extensions.st_geogfromtext('SRID=4326;POINT(3.3510 6.6010)'),
  extensions.st_geogfromtext('SRID=4326;POINT(3.3550 6.6050)'),
  'Second test',
  800,
  30000,
  45000,
  30000,
  30000,
  'searching',
  1500,
  now() + interval '2 minutes'
);

select throws_ok(
  $$insert into public.ride_offers (
      request_id, rider_id, type, amount_kobo, eta_s, seats_occupied_at_offer, status, expires_at
    ) values (
      '77777777-7777-4777-8777-777777777777',
      '22222222-2222-4222-8222-222222222222',
      'counter',
      30000,
      120,
      0,
      'open',
      now() + interval '30 seconds'
    )$$,
  '23514',
  'a counter offer must be higher than the passenger offer',
  'a counter has to be higher than the passenger offer'
);

select * from finish();

rollback;
