-- Temporary probe objects for supabase/probes/oa9_rls19.sh (BL-0007). Dropped by oa9_rls19_drop.sql.
-- is_service_role() is the body of schemas/schema.sql; on a database with the baseline it already
-- exists and is only replaced by the same definition.
create or replace function public.is_service_role()
returns boolean language sql stable as $$
  select current_user = 'service_role' or coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin');
$$;
create or replace function public.zz_oa9_probe()
returns json language sql stable as $$
  select json_build_object('current_user', current_user, 'session_user', session_user,
    'auth_role', auth.role(), 'is_service_role', public.is_service_role());
$$;
revoke execute on function public.zz_oa9_probe() from public;
grant execute on function public.zz_oa9_probe() to anon, service_role;
revoke execute on function public.is_service_role() from public;
grant execute on function public.is_service_role() to anon, authenticated, service_role;
create table if not exists public.zz_rls19_probe (id int primary key);
revoke all on public.zz_rls19_probe from anon, authenticated, service_role;
notify pgrst, 'reload schema';
