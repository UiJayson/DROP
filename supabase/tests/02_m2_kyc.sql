-- M2: a rider cannot go online until approved, people only see their own rows,
-- and KYC files stay in the private bucket.

begin;

create extension if not exists pgtap with schema extensions;

set search_path = extensions, public;

select plan(22);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'riders'
      and column_name = 'licence_number'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'riders'
      and column_name in ('nin', 'national_identification_number')
  ),
  'riders store a licence number and do not store a full NIN'
);

select is(
  (select public from storage.buckets where id = 'rider-documents'),
  false,
  'rider document bucket is private'
);

select throws_ok(
  $$update public.riders
      set is_online = true
    where profile_id = '66666666-6666-4666-8666-666666666666'$$,
  '23514',
  'A rider cannot go online until DROP approves them.',
  'a pending rider cannot be put online, even by the database owner'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set local role authenticated;

select is(
  (select count(*)::int from public.profiles where id <> '11111111-1111-4111-8111-111111111111'),
  0,
  'a passenger only sees their own profile'
);

select is(
  (select count(*)::int from public.riders),
  0,
  'a passenger does not see rider rows'
);

select is(
  (select count(*)::int from public.kekes),
  0,
  'a passenger does not see Keke rows'
);

select throws_ok(
  $$select public.admin_review_rider(
      '66666666-6666-4666-8666-666666666666',
      'approved',
      null
    )$$,
  '42501',
  'Only an admin can review riders.',
  'a passenger cannot approve a rider'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);
set local role authenticated;

select throws_ok(
  'select public.set_rider_online(true)',
  '23514',
  'A rider cannot go online until DROP approves them.',
  'the go-online action rejects a rider who is still pending'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
set local role authenticated;

select is(
  (
    select licence_number
    from public.riders
    where profile_id = '66666666-6666-4666-8666-666666666666'
  ),
  'LSD556677',
  'an admin can read the pending rider licence'
);

select is(
  (
    select nin_last4
    from public.riders
    where profile_id = '66666666-6666-4666-8666-666666666666'
  ),
  '6789',
  'an admin sees only the last four NIN digits on the row'
);

select throws_ok(
  $$select public.admin_review_rider(
      '66666666-6666-4666-8666-666666666666',
      'rejected',
      'no'
    )$$,
  '23514',
  'Add a short reason for the rider.',
  'a rejection needs a short reason'
);

select is(
  public.admin_review_rider(
    '66666666-6666-4666-8666-666666666666',
    'approved',
    null
  )::text,
  'approved',
  'an admin can approve a pending rider'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', true);
set local role authenticated;

select is(
  public.set_rider_online(true),
  true,
  'an approved rider can go online'
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
  $$select public.submit_rider_onboarding(
      'Ada Okonkwo',
      'LSD445566',
      'M2-TEST-01',
      '11111111-1111-4111-8111-111111111111/selfie.jpg',
      '11111111-1111-4111-8111-111111111111/licence.jpg',
      '11111111-1111-4111-8111-111111111111/keke.jpg',
      '12345670000'
    )$$,
  '23514',
  'The name does not match this NIN.',
  'a NIN that fails the check is refused'
);

select is(
  public.submit_rider_onboarding(
    'Ada Okonkwo',
    'LSD445566',
    'M2-TEST-01',
    '11111111-1111-4111-8111-111111111111/selfie.jpg',
    '11111111-1111-4111-8111-111111111111/licence.jpg',
    '11111111-1111-4111-8111-111111111111/keke.jpg',
    '12345678901'
  )::text,
  'pending',
  'a valid application is stored as pending'
);

select ok(
  (
    select nin_last4 = '8901'
      and nin_reference = 'mock_8901'
      and licence_number = 'LSD445566'
    from public.riders
    where profile_id = '11111111-1111-4111-8111-111111111111'
  ),
  'the application keeps the last four digits and a reference'
);

select is(
  (select count(*)::int from public.riders),
  1,
  'after applying, the rider still cannot see other riders'
);

select throws_ok(
  'select public.set_rider_online(true)',
  '23514',
  'A rider cannot go online until DROP approves them.',
  'a newly submitted rider cannot go online'
);

reset role;

select ok(
  (
    select nin_hash ~ '^[0-9a-f]{64}$'
      and nin_hash <> '12345678901'
    from public.riders
    where profile_id = '11111111-1111-4111-8111-111111111111'
  ),
  'the full NIN is stored only as a hash'
);

insert into storage.objects (bucket_id, name, owner)
values (
  'rider-documents',
  '66666666-6666-4666-8666-666666666666/selfie.jpg',
  '66666666-6666-4666-8666-666666666666'
);

set local role anon;

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'rider-documents'
  ),
  0,
  'anonymous cannot read rider documents'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set local role authenticated;

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'rider-documents'
      and name like '66666666-6666-4666-8666-666666666666/%'
  ),
  0,
  'a rider cannot open another rider''s documents'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
set local role authenticated;

select cmp_ok(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'rider-documents'
      and name like '66666666-6666-4666-8666-666666666666/%'
  ),
  '>=',
  1,
  'an admin can open rider documents'
);

select * from finish();

rollback;
