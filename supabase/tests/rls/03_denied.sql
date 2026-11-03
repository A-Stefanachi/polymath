-- BL-0012: privileges and policies that must refuse. ST-RLS-05, 06, 08, 09, 10, 11 (doc 12 section 13.2).
begin;
\ir _helpers.psql

select plan(22);

-- ST-RLS-05: a learner has no insert/update/delete on server-written tables (42501 for each operation).
select rls_test.act_as(rls_test.user_a());
select is((select coalesce(string_agg(rls_test.writes_not_denied(t), ''), '')
             from unnest(array['attempts', 'skill_state', 'review_log', 'sessions', 'session_tasks', 'tutor_threads',
                               'tutor_messages', 'project_evidence', 'user_projects', 'checkpoints']) t),
          '', 'ST-RLS-05: A gets permission denied on insert, update and delete for every server-written table');

-- ST-RLS-06: hidden columns and tables.
select throws_ok($$select body from public.item_templates$$, '42501', null, 'ST-RLS-06: A cannot select item_templates.body');
select throws_ok($$select * from public.item_templates$$, '42501', null, 'ST-RLS-06: A cannot select * from item_templates');
select throws_ok($$select params from public.items$$, '42501', null, 'ST-RLS-06: A cannot select items.params');
select throws_ok($$select verification_report from public.items$$, '42501', null, 'ST-RLS-06: A cannot select items.verification_report');
select throws_ok($$select * from public.item_secrets$$, '42501', null, 'ST-RLS-06: A cannot select item_secrets');

-- ST-RLS-08: profile columns the owner may not change.
select throws_ok(format($$update public.profiles set cohort_id = null where id = %L$$, rls_test.user_a()), '42501', null, 'ST-RLS-08: A cannot update profiles.cohort_id');
select throws_ok(format($$update public.profiles set id = gen_random_uuid() where id = %L$$, rls_test.user_a()), '42501', null, 'ST-RLS-08: A cannot update profiles.id');
select throws_ok(format($$update public.profiles set created_at = now() where id = %L$$, rls_test.user_a()), '42501', null, 'ST-RLS-08: A cannot update profiles.created_at');
select lives_ok(format($$update public.profiles set display_name = 'rls' where id = %L$$, rls_test.user_a()), 'ST-RLS-08: A can update display_name (control)');

-- ST-RLS-09: nobody self-promotes.
select throws_ok(format($$insert into public.admin_users (user_id) values (%L)$$, rls_test.user_a()), '42501', null, 'ST-RLS-09: A cannot insert into admin_users');
select is(public.is_admin(), false, 'ST-RLS-09: is_admin() is false for A');

-- ST-RLS-10: queue and maintenance functions are not callable by a learner.
select throws_ok($$select * from public.claim_jobs('w')$$, '42501', null, 'ST-RLS-10: A cannot call claim_jobs');
select throws_ok($$select public.enqueue_job('nightly_maintenance')$$, '42501', null, 'ST-RLS-10: A cannot call enqueue_job');
select throws_ok($$select public.complete_job(gen_random_uuid(), 'w')$$, '42501', null, 'ST-RLS-10: A cannot call complete_job');
select throws_ok($$select public.fail_job(gen_random_uuid(), 'w', 'e')$$, '42501', null, 'ST-RLS-10: A cannot call fail_job');
select throws_ok($$select public.requeue_stale_jobs()$$, '42501', null, 'ST-RLS-10: A cannot call requeue_stale_jobs');
select throws_ok($$select app_private.prune_expired()$$, '42501', null, 'ST-RLS-10: A cannot call app_private.prune_expired');
reset role;

-- ST-RLS-11: anon reads no table and calls no function (is_admin is granted to authenticated only).
select rls_test.act_as_anon();
select is(rls_test.readable_tables('public'), '', 'ST-RLS-11: anon is denied every public table');
select is(rls_test.readable_tables('app_private'), '', 'ST-RLS-11: anon is denied every app_private table');
select is((select count(*) from pg_proc p where p.pronamespace in ('public'::regnamespace, 'app_private'::regnamespace)
             and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute')), 0::bigint,
          'ST-RLS-11: anon can execute no function of public or app_private');
select throws_ok($$select public.is_admin()$$, '42501', null, 'ST-RLS-11: anon calling is_admin() is denied');
reset role;

select * from finish();
rollback;
