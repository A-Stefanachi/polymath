-- BL-0012: database constraints that guard the learner model. ST-RLS-18 (doc 12 section 13.2).
begin;
\ir _helpers.psql

select plan(7);

select throws_ok(format($$insert into public.sessions (user_id, session_type, context, planned_min, available_minutes)
                          values (%L, 'micro', 'phone', 30, 30)$$, rls_test.user_a()),
                 '23514', null, 'ST-RLS-18: a 30-minute micro session is rejected');
select throws_ok(format($$insert into public.sessions (user_id, session_type, context, planned_min, available_minutes)
                          values (%L, 'micro', 'bench', 10, 10)$$, rls_test.user_a()),
                 '23514', null, 'ST-RLS-18: a micro session on the bench is rejected');
select lives_ok(format($$insert into public.sessions (user_id, session_type, context, planned_min, available_minutes)
                         values (%L, 'micro', 'phone', 20, 20)$$, rls_test.user_a()),
                'ST-RLS-18: a 20-minute micro session on the phone is accepted (limit value)');
select throws_ok(format($$insert into public.attempts (user_id, item_id, started_at, submitted_at, response, client_attempt_id, unaided, max_hint_level, hints_used)
                          values (%L, '0000a011-0000-4000-8000-000000000001', now(), now(), '{}', gen_random_uuid(), true, 3, 3)$$, rls_test.user_a()),
                 '23514', null, 'ST-RLS-18: an unaided attempt with hint level 3 is rejected');
select throws_ok(format($$insert into public.attempts (user_id, item_id, started_at, submitted_at, response, client_attempt_id, grade, grade_status)
                          values (%L, '0000a011-0000-4000-8000-000000000001', now(), now(), '{}', gen_random_uuid(),
                                  '{"status":"graded","score":1.5,"correct":true,"graders":[]}', 'graded')$$, rls_test.user_a()),
                 '23514', null, 'ST-RLS-18: a graded attempt with score 1.5 is rejected');
select lives_ok(format($$insert into public.attempts (user_id, item_id, started_at, submitted_at, response, client_attempt_id, grade, grade_status)
                         values (%L, '0000a011-0000-4000-8000-000000000001', now(), now(), '{}', gen_random_uuid(),
                                 '{"status":"graded","score":1,"correct":true,"graders":[]}', 'graded')$$, rls_test.user_a()),
                'ST-RLS-18: a graded attempt with score 1 is accepted (limit value)');
insert into public.skill_edges (from_skill_key, to_skill_key) values ('math.rlstest.pub', 'math.rlstest.draft');
select throws_ok($$insert into public.skill_edges (from_skill_key, to_skill_key) values ('math.rlstest.draft', 'math.rlstest.pub')$$,
                 '23514', null, 'ST-RLS-18: an edge that closes a cycle is rejected');

select * from finish();
rollback;
