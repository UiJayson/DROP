-- Realtime was publishing every column of trips, including pin_hash.
-- Subscribers on that trip could read the hash. The plaintext PIN table stays unpublished.
-- Replica identity stays the primary key. A FULL identity cannot omit pin_hash from the publication.

alter table public.trips replica identity default;

do $pub$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;

  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trips'
  ) then
    alter publication supabase_realtime drop table public.trips;
  end if;

  alter publication supabase_realtime add table public.trips (
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
  );
end
$pub$;
