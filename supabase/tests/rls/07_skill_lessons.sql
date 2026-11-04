-- BL-0200: RLS on skill_lessons (00a K7, K9; doc 07 section 15). A learner reads verified versions only
-- and cannot write; an admin reads and writes every version; anon reads nothing.
begin;
\ir _helpers.psql

select plan(11);

-- One skill with three versions: 1 verified, 2 waiting for review, 3 retired.
insert into public.skill_lessons (id, skill_key, version, status, body, content_hash, license, source, reviewed_by, reviewed_at, retired_at) values
  ('0000a011-0000-4000-8000-0000000005a1', 'math.rlstest.pub', 1, 'verified',           '{"v":1}', 'h1', 'original', 'rls-test', rls_test.user_c(), now(), null),
  ('0000a011-0000-4000-8000-0000000005a2', 'math.rlstest.pub', 2, 'needs_human_review', '{"v":2}', 'h2', 'original', 'rls-test', null, null, null),
  ('0000a011-0000-4000-8000-0000000005a3', 'math.rlstest.pub', 3, 'retired',            '{"v":3}', 'h3', 'original', 'rls-test', null, null, now());

select rls_test.act_as(rls_test.user_a());
select is((select count(*) from public.skill_lessons), 1::bigint, 'BL-0200 skill_lessons:a learner sees one of three versions');
select is((select version from public.skill_lessons), 1, 'BL-0200 skill_lessons:the version a learner sees is the verified one');
select is((select count(*) from public.skill_lessons where status <> 'verified'), 0::bigint, 'BL-0200 skill_lessons:a learner sees no needs_human_review or retired version');
select throws_ok($$insert into public.skill_lessons (skill_key, version, status, body, content_hash, license, source)
                   values ('math.rlstest.pub', 9, 'draft', '{}', 'h9', 'original', 'rls-test')$$,
                 '42501', null, 'BL-0200 skill_lessons:a learner cannot insert a lesson version');
update public.skill_lessons set status = 'retired' where id = '0000a011-0000-4000-8000-0000000005a1';
delete from public.skill_lessons where id = '0000a011-0000-4000-8000-0000000005a1';
reset role;
select is((select status::text from public.skill_lessons where id = '0000a011-0000-4000-8000-0000000005a1'), 'verified',
          'BL-0200 skill_lessons:a learner update or delete changes nothing');

select rls_test.act_as(rls_test.user_c());
select is((select count(*) from public.skill_lessons), 3::bigint, 'BL-0200 skill_lessons:an admin sees every version');
select lives_ok($$update public.skill_lessons set status = 'verified', reviewed_by = auth.uid(), reviewed_at = now()
                  where id = '0000a011-0000-4000-8000-0000000005a2'$$, 'BL-0200 skill_lessons:an admin can approve a version');
select throws_ok($$update public.skill_lessons set status = 'verified' where id = '0000a011-0000-4000-8000-0000000005a3'$$,
                 '23514', null, 'BL-0200 skill_lessons:a verified version without reviewer and time is rejected (K9)');
reset role;

select rls_test.act_as(rls_test.user_b());
select is((select count(*) from public.skill_lessons), 2::bigint, 'BL-0200 skill_lessons:after the approval a learner sees both verified versions');
reset role;

select rls_test.act_as_anon();
select throws_ok($$select 1 from public.skill_lessons limit 1$$, '42501', null, 'BL-0200 skill_lessons:anon cannot read skill_lessons');
reset role;

select is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'skill_lessons'), 2::bigint,
          'BL-0200 skill_lessons:skill_lessons has exactly the select and the admin write policy');

select * from finish();
rollback;
