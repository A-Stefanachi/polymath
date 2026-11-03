-- Worker heartbeat (doc 03 sections 8.4 and 8.6): the worker overwrites one row every 5 minutes;
-- GET /health reports its age as worker_heartbeat_age_s (api.openapi.yaml getHealth), and the
-- alert "Worker down: no heartbeat > 5 min" reads the same value (doc 03 section 10).
-- Internal only: app_private is not exposed through the Data API, and only the service role
-- (the worker and the web's privileged module) can call the two functions.
set lock_timeout = '5s';

create table app_private.worker_heartbeat (
  id          boolean primary key default true check (id),   -- exactly one row
  worker_id   text not null check (char_length(worker_id) between 1 and 128),
  git_sha     text check (git_sha is null or char_length(git_sha) <= 64),
  beat_at     timestamptz not null default now()
);
alter table app_private.worker_heartbeat enable row level security;   -- no policies: deny-all for every non-owner role
revoke all on app_private.worker_heartbeat from public, anon, authenticated, service_role;
-- Every table carries an explicit service_role grant (ST-RLS-19); writes go through the function only.
grant select on app_private.worker_heartbeat to service_role;

-- Overwrite the single row with this worker's beat (server time is authoritative).
create or replace function app_private.record_worker_heartbeat(p_worker_id text, p_git_sha text default null)
returns timestamptz language sql security definer set search_path = public, pg_temp as $$
  insert into app_private.worker_heartbeat as h (id, worker_id, git_sha, beat_at)
  values (true, p_worker_id, p_git_sha, now())
  on conflict (id) do update
    set worker_id = excluded.worker_id, git_sha = excluded.git_sha, beat_at = excluded.beat_at
  returning h.beat_at;
$$;

-- Seconds since the last heartbeat, or null when no worker has ever reported.
create or replace function app_private.worker_heartbeat_age_s()
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select floor(extract(epoch from (now() - beat_at)))::integer from app_private.worker_heartbeat where id;
$$;

revoke execute on function app_private.record_worker_heartbeat(text, text) from public, anon, authenticated;
revoke execute on function app_private.worker_heartbeat_age_s() from public, anon, authenticated;
grant execute on function app_private.record_worker_heartbeat(text, text) to service_role;
grant execute on function app_private.worker_heartbeat_age_s() to service_role;
