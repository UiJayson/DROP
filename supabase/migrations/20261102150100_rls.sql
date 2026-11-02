-- Baseline access.
-- Anonymous reads are denied on every table (RLS on, no anon policies).
-- Signed-in users can read their own rows. Trip state is not writable by clients.
-- Phone numbers stay on profiles, which only the owner or an admin can read.
-- Approved rider cards are a separate view and omit phone, NIN, and location.

set search_path = public, extensions;

do $$
declare
  rec record;
begin
  for rec in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', rec.relname);
    execute format('alter table public.%I force row level security', rec.relname);
  end loop;
end;
$$;

create policy profiles_select_self_or_admin
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy riders_select_self_admin_or_active_trip
  on public.riders
  for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.trips t
      where t.rider_id = riders.profile_id
        and t.passenger_id = auth.uid()
        and t.status in ('assigned', 'arrived', 'in_progress')
    )
  );

create policy kekes_select_own_admin_or_active_trip
  on public.kekes
  for select
  to authenticated
  using (
    rider_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.trips t
      where t.keke_id = kekes.id
        and t.passenger_id = auth.uid()
        and t.status in ('assigned', 'arrived', 'in_progress')
    )
  );

create policy service_zones_select_authenticated
  on public.service_zones
  for select
  to authenticated
  using (true);

create policy fare_rules_select_authenticated
  on public.fare_rules
  for select
  to authenticated
  using (true);

create policy ride_requests_select_parties
  on public.ride_requests
  for select
  to authenticated
  using (
    passenger_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.request_recipients rr
      where rr.request_id = ride_requests.id
        and rr.rider_id = auth.uid()
    )
  );

create policy ride_offers_select_parties
  on public.ride_offers
  for select
  to authenticated
  using (
    rider_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.ride_requests r
      where r.id = ride_offers.request_id
        and r.passenger_id = auth.uid()
    )
  );

create policy request_recipients_select_parties
  on public.request_recipients
  for select
  to authenticated
  using (
    rider_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.ride_requests r
      where r.id = request_recipients.request_id
        and r.passenger_id = auth.uid()
    )
  );

create policy trips_select_parties
  on public.trips
  for select
  to authenticated
  using (
    passenger_id = auth.uid()
    or rider_id = auth.uid()
    or public.is_admin()
  );

create policy payments_select_parties
  on public.payments
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.trips t
      where t.id = payments.trip_id
        and (t.passenger_id = auth.uid() or t.rider_id = auth.uid())
    )
  );

create policy ratings_select_parties
  on public.ratings
  for select
  to authenticated
  using (from_id = auth.uid() or to_id = auth.uid() or public.is_admin());

create policy reports_select_own_or_admin
  on public.reports
  for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy trip_shares_select_passenger_or_admin
  on public.trip_shares
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.trips t
      where t.id = trip_shares.trip_id
        and t.passenger_id = auth.uid()
    )
  );

create policy request_events_select_parties
  on public.request_events
  for select
  to authenticated
  using (
    public.is_admin()
    or actor_id = auth.uid()
    or (
      entity = 'ride_request'
      and exists (
        select 1
        from public.ride_requests r
        where r.id = request_events.entity_id
          and r.passenger_id = auth.uid()
      )
    )
    or (
      entity = 'ride_request'
      and exists (
        select 1
        from public.request_recipients rr
        where rr.request_id = request_events.entity_id
          and rr.rider_id = auth.uid()
      )
    )
  );

create policy audit_log_select_admin
  on public.audit_log
  for select
  to authenticated
  using (public.is_admin());

create policy devices_manage_own
  on public.devices
  for all
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create view public.approved_rider_profiles
with (security_barrier = true, security_invoker = false) as
select
  p.id,
  p.full_name,
  p.photo_url,
  p.rating_avg,
  p.rating_count,
  r.is_online,
  r.seats_occupied,
  k.id as keke_id,
  k.plate_number,
  k.colour
from public.profiles p
join public.riders r on r.profile_id = p.id
left join public.kekes k on k.rider_id = r.profile_id and k.active
where r.verification_status = 'approved'
  and p.status = 'active';

comment on view public.approved_rider_profiles is
  'Card fields for approved riders. Phone, NIN, and live location are left out.';

create view public.trips_client
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
  completed_at
from public.trips;

comment on view public.trips_client is
  'Trip rows without pin_hash. Row visibility still follows trips policies.';

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
revoke all on all tables in schema public from anon, authenticated;

grant select on
  public.profiles,
  public.riders,
  public.kekes,
  public.service_zones,
  public.fare_rules,
  public.ride_requests,
  public.ride_offers,
  public.request_recipients,
  public.trips,
  public.payments,
  public.ratings,
  public.reports,
  public.trip_shares,
  public.request_events,
  public.audit_log,
  public.devices
to anon;

grant select on
  public.profiles,
  public.kekes,
  public.service_zones,
  public.fare_rules,
  public.ride_requests,
  public.ride_offers,
  public.request_recipients,
  public.payments,
  public.ratings,
  public.reports,
  public.trip_shares,
  public.request_events,
  public.audit_log,
  public.devices
to authenticated;

grant select (
  profile_id,
  verification_status,
  is_online,
  seats_occupied,
  last_location,
  last_seen_at,
  approved_at,
  created_at
) on public.riders to authenticated;

grant select (
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
  completed_at
) on public.trips to authenticated;

grant update (full_name, photo_url) on public.profiles to authenticated;
grant insert, update, delete on public.devices to authenticated;

revoke all on public.approved_rider_profiles from public, anon;
revoke all on public.trips_client from public, anon;
grant select on public.approved_rider_profiles to authenticated, service_role;
grant select on public.trips_client to authenticated, service_role;
