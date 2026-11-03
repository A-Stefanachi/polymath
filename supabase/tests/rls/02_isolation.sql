-- BL-0012: row isolation between learners. ST-RLS-03, 04, 07, 12, 16 (doc 12 section 13.2).
begin;
\ir _helpers.psql

-- Expected own-row counts, taken as the superuser before any role switch.
create table rls_test.expected as select tbl, own from rls_test.counts(rls_test.user_a(), rls_test.user_b());
grant select on rls_test.expected to public;

select plan(13);

select is((select count(*) from rls_test.expected where own < 1), 0::bigint,
          'fixture: every user-owned table has a row for A (so the isolation checks are not vacuous)');

-- ST-RLS-03: A (and B) select each user-owned table and see only their own rows, counts equal to the fixture.
select rls_test.act_as(rls_test.user_a());
select is((select coalesce(string_agg(c.tbl, ', '), '') from rls_test.counts(rls_test.user_a(), rls_test.user_b()) c
            join rls_test.expected e using (tbl) where c.own <> e.own or c.foreign_rows <> 0),
          '', 'ST-RLS-03: A selects only A''s rows in every user-owned table');
-- ST-RLS-04: explicit where user_id = B.
select is((select coalesce(string_agg(c.tbl, ', '), '') from rls_test.counts(rls_test.user_a(), rls_test.user_b()) c where c.other <> 0),
          '', 'ST-RLS-04: A selecting B''s rows by explicit user_id filter gets 0 rows in every table');
reset role;
select rls_test.act_as(rls_test.user_b());
select is((select coalesce(string_agg(c.tbl, ', '), '') from rls_test.counts(rls_test.user_b(), rls_test.user_a()) c
            join rls_test.expected e using (tbl) where c.own <> e.own or c.foreign_rows <> 0),
          '', 'ST-RLS-03: B selects only B''s rows in every user-owned table');
select is((select coalesce(string_agg(c.tbl, ', '), '') from rls_test.counts(rls_test.user_b(), rls_test.user_a()) c where c.other <> 0),
          '', 'ST-RLS-04: B selecting A''s rows by explicit user_id filter gets 0 rows in every table');
reset role;

-- ST-RLS-07: draft skills are hidden from learners, visible to the admin.
select rls_test.act_as(rls_test.user_a());
select is((select count(*) from public.skills where key = 'math.rlstest.draft'), 0::bigint, 'ST-RLS-07: A cannot see a draft skill');
select is((select count(*) from public.skills where key = 'math.rlstest.pub'), 1::bigint, 'ST-RLS-07: A sees the verified skill');
reset role;
select rls_test.act_as(rls_test.user_c());
select is((select count(*) from public.skills where key = 'math.rlstest.draft'), 1::bigint, 'ST-RLS-07: admin C sees the draft skill');
reset role;

-- ST-RLS-12: events can only be inserted for oneself.
select rls_test.act_as(rls_test.user_a());
select throws_ok(format($$insert into public.events (user_id, name) values (%L, 'rlstest.forged')$$, rls_test.user_b()),
                 '42501', null, 'ST-RLS-12: A inserting an events row for B violates RLS');
select lives_ok(format($$insert into public.events (user_id, name) values (%L, 'rlstest.own')$$, rls_test.user_a()),
                'ST-RLS-12: A inserting an events row for A is allowed');
reset role;

-- ST-RLS-16: admin reads jobs and content_sync_runs; a learner sees none.
select rls_test.act_as(rls_test.user_c());
select cmp_ok((select count(*) from public.jobs where payload ->> 't' = 'rlstest'), '>=', 1::bigint, 'ST-RLS-16: admin C sees jobs');
select is((select count(*) from public.content_sync_runs where git_sha = 'rlstest'), 1::bigint, 'ST-RLS-16: admin C sees content_sync_runs');
reset role;
select rls_test.act_as(rls_test.user_a());
select is((select count(*) from public.jobs) + (select count(*) from public.content_sync_runs), 0::bigint,
          'ST-RLS-16: learner A sees no jobs and no content_sync_runs');
reset role;

select * from finish();
rollback;
