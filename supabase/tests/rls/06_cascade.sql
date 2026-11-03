-- BL-0012: deleting an auth user cascades to everything user-owned. ST-RLS-15 (doc 12 section 13.2).
-- privacy_requests has no FK on purpose (pseudonymous trace, doc 04), so it is excluded from the cascade list.
begin;
\ir _helpers.psql

select plan(5);

insert into public.llm_calls (user_id, purpose, provider, model, prompt_version)
  values (rls_test.user_a(), 'tutor', 'fake', 'fake', 'rls-test-2');
create table rls_test.b_before as select * from rls_test.counts(rls_test.user_b(), rls_test.user_a());

delete from auth.users where id = rls_test.user_a();

select is((select coalesce(string_agg(c.tbl || '=' || c.own, ', '), '')
             from rls_test.counts(rls_test.user_a(), rls_test.user_b()) c
            where c.tbl not in ('privacy_requests', 'llm_calls') and c.own <> 0),
          '', 'ST-RLS-15: deleting auth user A removes every A-owned row (all counts 0)');
select is((select count(*) from public.item_secrets where item_id = '0000a011-0000-4000-8000-000000000001'), 0::bigint,
          'ST-RLS-15: A''s item_secrets are gone with A''s items');
select is((select count(*) from public.llm_calls where purpose = 'tutor' and prompt_version like 'rls-test%' and user_id is null), 2::bigint,
          'ST-RLS-15: A''s llm_calls rows survive with user_id set to null');
select is((select coalesce(string_agg(c.tbl, ', '), '') from rls_test.counts(rls_test.user_b(), rls_test.user_a()) c
            join rls_test.b_before b using (tbl) where c.own <> b.own),
          '', 'ST-RLS-15: B''s rows are untouched');
select is((select count(*) from public.profiles where id = rls_test.user_b()), 1::bigint, 'ST-RLS-15: B''s profile still exists');

select * from finish();
rollback;
