-- BL-0012: meta checks of the catalogue. ST-RLS-01, 02, 17, 19 (doc 12 section 13.2).
begin;
\ir _helpers.psql

select plan(10);

-- ST-RLS-01: every public (and app_private) table has RLS enabled, except the documented allow-list.
select is((select coalesce(string_agg(tablename, ', '), '') from pg_tables
            where schemaname in ('public', 'app_private') and not rowsecurity
              and tablename not in (select tbl from rls_test.no_rls_allowed)),
          '', 'ST-RLS-01: every public table has RLS enabled (offenders outside the allow-list)');
select is((select coalesce(string_agg(a.tbl, ', '), '') from rls_test.no_rls_allowed a
            where not exists (select 1 from pg_tables t where t.schemaname in ('public', 'app_private')
                                and t.tablename = a.tbl and not t.rowsecurity)),
          '', 'ST-RLS-01: every allow-list entry is a real table without RLS (no stale entries)');

-- ST-RLS-02: tables with a user_id column and no policy that references auth.uid() are exactly the two
-- documented exceptions: jobs (admin-only policy via is_admin()) and idempotency_keys (no policy).
select is((select coalesce(array_agg(c.table_name::text order by c.table_name::text), '{}')
             from information_schema.columns c
             join pg_tables t on t.schemaname = c.table_schema and t.tablename = c.table_name
            where c.table_schema = 'public' and c.column_name = 'user_id'
              and not exists (select 1 from pg_policies p
                               where p.schemaname = 'public' and p.tablename = c.table_name
                                 and coalesce(p.qual, '') || coalesce(p.with_check, '') like '%auth.uid()%')),
          array['idempotency_keys', 'jobs'],
          'ST-RLS-02: user_id tables without an auth.uid() policy are exactly jobs and idempotency_keys');

-- ST-RLS-17: SECURITY DEFINER functions pin their search_path.
select is((select coalesce(string_agg(p.proname, ', '), '') from pg_proc p
            where p.pronamespace in ('public'::regnamespace, 'app_private'::regnamespace) and p.prosecdef
              and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
          '', 'ST-RLS-17: every SECURITY DEFINER function has a fixed search_path');

-- ST-RLS-19 (local part): explicit privileges for every table, function and sequence of public and app_private.
select is((select coalesce(string_agg(c.relname, ', '), '') from pg_class c
            where c.relnamespace in ('public'::regnamespace, 'app_private'::regnamespace) and c.relkind in ('r', 'p')
              and not exists (select 1 from aclexplode(coalesce(c.relacl, '{}')) a
                               where a.grantee = 'service_role'::regrole and a.privilege_type = 'SELECT')),
          '', 'ST-RLS-19: every table carries an explicit grant to service_role (none left on defaults)');
select is((select coalesce(string_agg(p.proname, ', '), '') from pg_proc p
            where p.pronamespace in ('public'::regnamespace, 'app_private'::regnamespace) and p.prokind = 'f'
              and (p.proacl is null
                   or exists (select 1 from aclexplode(p.proacl) a
                               where a.privilege_type = 'EXECUTE' and (a.grantee = 0 or a.grantee = 'anon'::regrole)))),
          '', 'ST-RLS-19: no function is executable by PUBLIC or anon (explicit revoke on every function)');
select is((select count(*) from pg_class c
            where c.relnamespace in ('public'::regnamespace, 'app_private'::regnamespace) and c.relkind = 'S'
              and (has_sequence_privilege('anon', c.oid, 'usage') or has_sequence_privilege('authenticated', c.oid, 'usage'))),
          0::bigint, 'ST-RLS-19: no sequence is usable by anon or authenticated without a grant');

-- ST-RLS-19: a new table and function created with no grant are denied (the local stand-in for the
-- staging check; the default privileges of the baseline revoke from anon and authenticated).
create table public.rls_test_ungranted (id int);
create function public.rls_test_ungranted_fn() returns int language sql as 'select 1';
select rls_test.act_as(rls_test.user_a());
select throws_ok($$select * from public.rls_test_ungranted$$, '42501', null,
                 'ST-RLS-19: a new public table with no grant is denied to authenticated (42501)');
-- KNOWN BASELINE DEFECT (reported, schema not changed): `alter default privileges in schema public
-- revoke ... on functions from ... public` cannot remove the built-in PUBLIC EXECUTE default, so a
-- function created WITHOUT its own explicit REVOKE is callable by authenticated and anon. The baseline
-- is safe today only because it revokes on every existing function (checked above); a future migration
-- that forgets the REVOKE would expose its function. Fix: a migration with
-- `alter default privileges for role postgres revoke execute on functions from public` (no IN SCHEMA).
select todo('baseline defect: default privileges do not revoke PUBLIC EXECUTE on new functions', 1);
select throws_ok($$select public.rls_test_ungranted_fn()$$, '42501', null,
                 'ST-RLS-19: a new public function with no grant is denied to authenticated (42501)');
reset role;
select rls_test.act_as_anon();
select throws_ok($$select * from public.rls_test_ungranted$$, '42501', null,
                 'ST-RLS-19: a new public table with no grant is denied to anon (42501)');
reset role;

select * from finish();
rollback;
