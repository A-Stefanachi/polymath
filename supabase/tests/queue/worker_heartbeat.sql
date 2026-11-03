-- 00a I3: the worker heartbeat (doc 03 sections 8.4 and 8.6). One row, overwritten; age read by
-- GET /health through the service role only. Runs in a transaction that rolls back.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

select is(app_private.worker_heartbeat_age_s(), null::integer, 'age is null before any worker has reported');

select app_private.record_worker_heartbeat('worker-a', 'sha-a');
select app_private.record_worker_heartbeat('worker-b', 'sha-b');
select is((select count(*)::int from app_private.worker_heartbeat), 1, 'two beats leave exactly one row');
select is((select worker_id from app_private.worker_heartbeat), 'worker-b', 'the latest beat overwrites the row');

update app_private.worker_heartbeat set beat_at = now() - interval '7 minutes';
select ok(app_private.worker_heartbeat_age_s() between 419 and 421,
  'age_s reports seconds since the last beat (7 minutes ago: about 420)');

select throws_ok($$insert into app_private.worker_heartbeat (id, worker_id) values (false, 'x')$$, '23514', null,
  'a second row is impossible (id must be true)');

set local role authenticated;
select throws_ok($$select app_private.worker_heartbeat_age_s()$$, '42501', null,
  'authenticated cannot read the heartbeat');
reset role;
set local role anon;
select throws_ok($$select app_private.record_worker_heartbeat('evil', null)$$, '42501', null,
  'anon cannot write a heartbeat');
reset role;
set local role service_role;
select lives_ok($$select app_private.record_worker_heartbeat('worker-c', null)$$,
  'the service role (worker) records a heartbeat');
reset role;

select * from finish();
rollback;
