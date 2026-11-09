-- Realtime may send trip status. It must not send the PIN hash or the plaintext PIN.

begin;

create extension if not exists pgtap with schema extensions;

set search_path = extensions, public;

select plan(4);

select ok(
  exists (select 1 from pg_publication where pubname = 'supabase_realtime'),
  'the realtime publication exists'
);

select is(
  (
    select c.relreplident
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'trips'
  ),
  'd',
  'trip updates do not require the PIN hash in the realtime identity'
);

select ok(
  not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'trips'
      and a.attname = 'pin_hash'
      and not a.attisdropped
      and (pr.prattrs is null or a.attnum = any (pr.prattrs))
  ),
  'realtime does not publish the boarding PIN hash'
);

select ok(
  not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_boarding_pins'
  )
  and exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'trips'
      and a.attname = 'status'
      and not a.attisdropped
      and a.attnum = any (pr.prattrs)
  ),
  'realtime still publishes trip status and not the plaintext PIN'
);

select * from finish();

rollback;
