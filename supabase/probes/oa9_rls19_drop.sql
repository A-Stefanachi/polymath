-- Removes the probe objects of oa9_rls19_create.sql. is_service_role() is kept when the
-- baseline schema owns it (the profiles guard trigger depends on it).
drop table if exists public.zz_rls19_probe;
drop function if exists public.zz_oa9_probe();
do $$
begin
  if not exists (select 1 from pg_class where relname = 'profiles' and relnamespace = 'public'::regnamespace) then
    drop function if exists public.is_service_role();
  end if;
end $$;
notify pgrst, 'reload schema';
