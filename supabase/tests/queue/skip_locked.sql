-- BL-0009: job queue and rate-limit functions of the baseline (doc 03 section 8, OA-8, ADR-004).
-- Run with `pnpm test:db` (supabase test db). The concurrency case opens two real sessions through
-- dblink, because two transactions are needed to prove FOR UPDATE SKIP LOCKED: rows a dblink
-- session commits are not undone by this file's rollback, so they are tagged and deleted at the end.
begin;
create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
set search_path = public, extensions;

select plan(9);

-- ---------------------------------------------------------------------------------------------
-- 1. Two concurrent claim_jobs calls never return the same job id.
-- ---------------------------------------------------------------------------------------------
-- dblink only lets a non-superuser connect with a password the server actually checks. Loopback is
-- `trust` in the Supabase image, so connect to the server's own network address (scram) instead.
-- These are the fixed local-development credentials of the Supabase CLI, never a real secret.
create temp table conn as
  select format('host=%s port=5432 dbname=postgres user=postgres password=postgres',
                coalesce(host(inet_server_addr()), '127.0.0.1')) as s;
select dblink_connect('setup', (select s from conn));
select dblink_connect('wa', (select s from conn));
select dblink_connect('wb', (select s from conn));

-- Leftovers of an interrupted earlier run would be claimable too: remove them first.
select dblink_exec('setup', $$delete from public.jobs where payload ->> 't' = 'bl0009-skip-locked'$$);
select dblink_exec('setup', $$
  do $d$ begin
    perform public.enqueue_job('content_postprocess', jsonb_build_object('t', 'bl0009-skip-locked', 'n', g))
      from generate_series(1, 10) g;
  end $d$
$$);

-- Worker A claims 5 inside an open transaction, so its row locks are held while worker B claims.
select dblink_exec('wa', 'begin');
create temp table claimed_a as
  select id from dblink('wa', $$
    select id from public.claim_jobs('bl0009-a', array['content_postprocess'], 5)
     where payload ->> 't' = 'bl0009-skip-locked'
  $$) as t(id uuid);
create temp table claimed_b as
  select id from dblink('wb', $$
    select id from public.claim_jobs('bl0009-b', array['content_postprocess'], 10)
     where payload ->> 't' = 'bl0009-skip-locked'
  $$) as t(id uuid);
select dblink_exec('wa', 'commit');

select is((select count(*)::int from claimed_a), 5, 'worker A claims 5 of the 10 queued jobs');
select is((select count(*)::int from claimed_b), 5, 'worker B, claiming while A holds its locks, gets the other 5');
select is((select count(*)::int from claimed_a a join claimed_b b using (id)), 0,
  'no job id is returned to both workers (SKIP LOCKED)');

select dblink_exec('setup', $$delete from public.jobs where payload ->> 't' = 'bl0009-skip-locked'$$);
select dblink_disconnect('setup');
select dblink_disconnect('wa');
select dblink_disconnect('wb');

-- ---------------------------------------------------------------------------------------------
-- 2. fail_job: retry with backoff below max_attempts, terminal failure at it.
-- ---------------------------------------------------------------------------------------------
select public.enqueue_job('content_postprocess', '{"t":"bl0009-retry"}'::jsonb, p_max_attempts => 3);
select id from public.claim_jobs('bl0009-w', array['content_postprocess'], 1);
select is(
  public.fail_job((select id from public.jobs where payload ->> 't' = 'bl0009-retry'), 'bl0009-w', 'boom', true),
  'queued'::public.job_status,
  'fail_job, retryable, attempts 1 of 3: queued again');
select ok(
  (select run_after > now() from public.jobs where payload ->> 't' = 'bl0009-retry'),
  'a retried job waits (exponential backoff) before it can be claimed again');

select public.enqueue_job('content_postprocess', '{"t":"bl0009-max"}'::jsonb, p_max_attempts => 1);
select id from public.claim_jobs('bl0009-w', array['content_postprocess'], 1);
select is(
  public.fail_job((select id from public.jobs where payload ->> 't' = 'bl0009-max'), 'bl0009-w', 'boom', true),
  'failed'::public.job_status,
  'fail_job, retryable, attempts at max_attempts: failed');
select is(
  (select error from public.jobs where payload ->> 't' = 'bl0009-max'),
  'boom',
  'the failed job keeps the error text');

-- ---------------------------------------------------------------------------------------------
-- 3. Token bucket (OA-8): the function in the baseline is app_private.rate_limit_take, which returns
--    0 when a call is allowed and the seconds to wait otherwise ("take_token" in the task text).
-- ---------------------------------------------------------------------------------------------
insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000b0009', 'bl0009@example.test');
create temp table takes as
  select g as n,
         app_private.rate_limit_take('00000000-0000-4000-8000-0000000b0009', 'api', 5, 0.001) as wait_s
  from generate_series(1, 20) g;
select is((select count(*)::int from takes where wait_s = 0), 5,
  'a burst capacity of 5: exactly 5 of 20 back-to-back calls are allowed');
select ok((select bool_and(wait_s > 0) from takes where n > 5),
  'every call after the burst is refused with a positive wait');

select * from finish();
rollback;
