-- Tighten grants that signed-in clients do not need.
-- Passengers load rider cards from list_request_offers, not this view.
alter view public.approved_rider_profiles set (security_invoker = true);

-- Signed-in apps call these. Anonymous clients do not.
revoke execute on function public.expire_matching() from public, anon;
revoke execute on function public.cache_road_distance(double precision, double precision, double precision, double precision, integer) from public, anon;
grant execute on function public.expire_matching() to authenticated, service_role;
grant execute on function public.cache_road_distance(double precision, double precision, double precision, double precision, integer) to authenticated, service_role;

-- Phone sign-in uses GoTrue, not these functions.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.current_user_phone() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.current_user_phone() to authenticated, service_role;

alter function public._m2_own_photo(text, text) set search_path = public;
