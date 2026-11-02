-- Local sample data only. Do not run this against production.
-- Sample people use the password drop-local-only and reserved +234 800 numbers.
-- The Ikeja polygon is a rectangle for development, not a legal service boundary.
-- Money is kobo: 20000 = ₦200.

set search_path = public, extensions;

create or replace function public._seed_local_auth_user(
  p_id uuid,
  p_phone text,
  p_email text,
  p_app_role text,
  p_full_name text
)
returns void
language plpgsql
as $$
declare
  cols text := '';
  vals text := '';
  password_hash text := extensions.crypt('drop-local-only', extensions.gen_salt('bf'));
  app_meta jsonb := jsonb_build_object(
    'provider', 'email',
    'providers', jsonb_build_array('email'),
    'role', p_app_role
  );
  user_meta jsonb := jsonb_build_object('full_name', p_full_name);
begin
  perform 1
  from information_schema.columns
  where table_schema = 'auth' and table_name = 'users' and column_name = 'id';

  if not found then
    raise exception 'auth.users is missing';
  end if;

  cols := 'id';
  vals := quote_literal(p_id) || '::uuid';

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'instance_id'
  ) then
    cols := cols || ', instance_id';
    vals := vals || ', ' || quote_literal('00000000-0000-0000-0000-000000000000') || '::uuid';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'aud'
  ) then
    cols := cols || ', aud';
    vals := vals || ', ' || quote_literal('authenticated');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'role'
  ) then
    cols := cols || ', role';
    vals := vals || ', ' || quote_literal('authenticated');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'email'
  ) then
    cols := cols || ', email';
    vals := vals || ', ' || quote_literal(p_email);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'encrypted_password'
  ) then
    cols := cols || ', encrypted_password';
    vals := vals || ', ' || quote_literal(password_hash);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'email_confirmed_at'
  ) then
    cols := cols || ', email_confirmed_at';
    vals := vals || ', now()';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'phone'
  ) then
    cols := cols || ', phone';
    vals := vals || ', ' || quote_literal(p_phone);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'phone_confirmed_at'
  ) then
    cols := cols || ', phone_confirmed_at';
    vals := vals || ', now()';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'raw_app_meta_data'
  ) then
    cols := cols || ', raw_app_meta_data';
    vals := vals || ', ' || quote_literal(app_meta::text) || '::jsonb';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'raw_user_meta_data'
  ) then
    cols := cols || ', raw_user_meta_data';
    vals := vals || ', ' || quote_literal(user_meta::text) || '::jsonb';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'created_at'
  ) then
    cols := cols || ', created_at';
    vals := vals || ', now()';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'updated_at'
  ) then
    cols := cols || ', updated_at';
    vals := vals || ', now()';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'confirmation_token'
  ) then
    cols := cols || ', confirmation_token';
    vals := vals || ', ' || quote_literal('');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'recovery_token'
  ) then
    cols := cols || ', recovery_token';
    vals := vals || ', ' || quote_literal('');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'email_change'
  ) then
    cols := cols || ', email_change';
    vals := vals || ', ' || quote_literal('');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'email_change_token_new'
  ) then
    cols := cols || ', email_change_token_new';
    vals := vals || ', ' || quote_literal('');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'email_change_token_current'
  ) then
    cols := cols || ', email_change_token_current';
    vals := vals || ', ' || quote_literal('');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'phone_change'
  ) then
    cols := cols || ', phone_change';
    vals := vals || ', ' || quote_literal('');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'phone_change_token'
  ) then
    cols := cols || ', phone_change_token';
    vals := vals || ', ' || quote_literal('');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'reauthentication_token'
  ) then
    cols := cols || ', reauthentication_token';
    vals := vals || ', ' || quote_literal('');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'is_sso_user'
  ) then
    cols := cols || ', is_sso_user';
    vals := vals || ', false';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'is_anonymous'
  ) then
    cols := cols || ', is_anonymous';
    vals := vals || ', false';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'is_super_admin'
  ) then
    cols := cols || ', is_super_admin';
    vals := vals || ', false';
  end if;

  execute 'insert into auth.users (' || cols || ') values (' || vals || ') on conflict (id) do nothing';
end;
$$;

select public._seed_local_auth_user(
  '11111111-1111-4111-8111-111111111111',
  '+2348000000001',
  'ada.passenger@drop.test',
  'passenger',
  'Ada Okonkwo'
);

select public._seed_local_auth_user(
  '33333333-3333-4333-8333-333333333333',
  '+2348000000003',
  'funke.admin@drop.test',
  'admin',
  'Funke Balogun'
);

select public._seed_local_auth_user(
  '22222222-2222-4222-8222-222222222222',
  '+2348000000002',
  'chinedu.rider@drop.test',
  'rider',
  'Chinedu Adeyemi'
);

select public._seed_local_auth_user(
  '66666666-6666-4666-8666-666666666666',
  '+2348000000004',
  'emeka.rider@drop.test',
  'rider',
  'Emeka Nwosu'
);

drop function public._seed_local_auth_user(uuid, text, text, text, text);

-- Profile phone is set from auth.users when that column exists. Older database
-- images do not have it yet, so set the sample numbers on the profile either way.
update public.profiles set phone = '+2348000000001' where id = '11111111-1111-4111-8111-111111111111';
update public.profiles set phone = '+2348000000003' where id = '33333333-3333-4333-8333-333333333333';
update public.profiles set phone = '+2348000000002' where id = '22222222-2222-4222-8222-222222222222';
update public.profiles set phone = '+2348000000004' where id = '66666666-6666-4666-8666-666666666666';

insert into public.service_zones (id, name, area, type, active)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'Lagos — Ikeja test zone',
    extensions.st_geogfromtext(
      'SRID=4326;MULTIPOLYGON(((3.3200 6.5800, 3.3800 6.5800, 3.3800 6.6300, 3.3200 6.6300, 3.3200 6.5800)))'
    ),
    'service',
    true
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'Sample restricted block (not a legal boundary)',
    extensions.st_geogfromtext(
      'SRID=4326;MULTIPOLYGON(((3.3600 6.5900, 3.3700 6.5900, 3.3700 6.6000, 3.3600 6.6000, 3.3600 6.5900)))'
    ),
    'restricted',
    true
  );

insert into public.fare_rules (
  id,
  zone_id,
  base_kobo,
  per_km_kobo,
  min_kobo,
  range_low_pct,
  range_high_pct,
  effective_from
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  20000,
  15000,
  30000,
  10,
  25,
  now()
);

insert into public.riders (
  profile_id,
  verification_status,
  licence_number,
  nin_last4,
  nin_reference,
  is_online,
  seats_occupied,
  approved_by,
  approved_at
)
values (
  '22222222-2222-4222-8222-222222222222',
  'approved',
  'LSD1029384',
  '1234',
  'mock_1234',
  false,
  0,
  '33333333-3333-4333-8333-333333333333',
  now()
);

-- Waiting for a person on the admin page. Not approved, so this rider cannot go online.
insert into public.riders (
  profile_id,
  verification_status,
  licence_number,
  licence_photo_path,
  selfie_path,
  nin_last4,
  nin_reference,
  is_online,
  rejection_reason
)
values (
  '66666666-6666-4666-8666-666666666666',
  'pending',
  'LSD556677',
  '66666666-6666-4666-8666-666666666666/licence.jpg',
  '66666666-6666-4666-8666-666666666666/selfie.jpg',
  '6789',
  'mock_6789',
  false,
  null
);

insert into public.kekes (id, rider_id, plate_number, colour, photo_path, active)
values
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    '22222222-2222-4222-8222-222222222222',
    'LAG-TEST-001',
    'Yellow',
    null,
    true
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    '66666666-6666-4666-8666-666666666666',
    'KJA-204-AB',
    'Yellow',
    '66666666-6666-4666-8666-666666666666/keke.jpg',
    true
  );
