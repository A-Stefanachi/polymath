-- Concept primers (00a K6, K7, K9): one row per (skill_key, version), synced from
-- polymath-app-spec/content/lessons/*.yaml by content:sync (BL-0200). Mirrors schemas/schema.sql.
-- Additive only: a new table that no running code reads yet, so it is safe while old code runs.
-- The body is learner-visible by design: primer checks are never graded, so it holds no answer key.
set lock_timeout = '5s';

create table public.skill_lessons (
  id            uuid primary key default gen_random_uuid(),
  skill_key     text not null references public.skills (key) on update cascade on delete restrict,
  version       integer not null default 1 check (version >= 1),
  status        public.content_status not null default 'draft',
  body          jsonb not null,                            -- the validated lesson file (schemas/lesson.schema.json)
  content_hash  text not null,
  license       text not null,
  source        text not null,
  reviewed_by   uuid references auth.users (id) on delete set null,
  reviewed_at   timestamptz,
  retired_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint skill_lessons_skill_version_unique unique (skill_key, version),
  -- K9: a verified version always records its reviewer and review time
  constraint skill_lessons_verified_reviewed check (status <> 'verified' or (reviewed_by is not null and reviewed_at is not null))
);
create index skill_lessons_serve_idx on public.skill_lessons (skill_key, version desc) where status = 'verified';
create trigger skill_lessons_set_updated_at before update on public.skill_lessons
  for each row execute function app_private.set_updated_at();

alter table public.skill_lessons enable row level security;

-- Learners read verified versions only; admins read and write every version (00a K7).
create policy skill_lessons_select on public.skill_lessons for select to authenticated
  using (status = 'verified' or public.is_admin());
create policy skill_lessons_admin_write on public.skill_lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Explicit grants (CLAUDE.md section 9): new public tables are not exposed automatically.
grant select, insert, update, delete on public.skill_lessons to authenticated;
grant all on public.skill_lessons to service_role;
