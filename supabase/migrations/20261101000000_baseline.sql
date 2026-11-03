-- =====================================================================
-- Polymath adaptive learning app - PostgreSQL 15+ baseline schema (revision 3: 00a C and D, plus G15: jobs.kind nightly_maintenance)
-- Target: Supabase (Postgres 17, auth + storage schemas provided by Supabase).
-- Source of truth for names: docs/00-contract.md section 6. Narrative: docs/04-data-model.md.
-- This file is the baseline migration (supabase/migrations/20261101000000_baseline.sql).
-- It is intended for a FRESH database. Later changes are new migrations (see 04, section 12).
-- =====================================================================

create schema if not exists app_private;
revoke all on schema app_private from public;

-- ---------------------------------------------------------------------
-- 1. Enumerations (contract section 5, exact spellings)
-- ---------------------------------------------------------------------
create type public.tier            as enum ('L0', 'L1', 'L2', 'L3');
create type public.session_type    as enum ('micro', 'focus', 'lab');
create type public.context         as enum ('phone', 'desktop', 'bench');
create type public.task_kind       as enum ('retrieval', 'worked_example', 'faded_problem', 'problem',
                                            'perceptual_drill', 'explain_back', 'debug_case', 'project_step',
                                            'diagnostic', 'checkpoint');
create type public.grader_type     as enum ('exact_numeric', 'symbolic_equivalence', 'multiple_choice',
                                            'code_tests', 'spice_compare', 'drc_erc', 'rubric_llm',
                                            'measurement_check', 'human_review');
create type public.mastery_state   as enum ('unseen', 'learning', 'reviewing', 'mastered', 'decayed');
create type public.edge_strength   as enum ('hard', 'soft');
create type public.content_status  as enum ('draft', 'verified', 'needs_human_review', 'retired');
create type public.evidence_kind   as enum ('photo', 'video', 'log', 'scope_capture', 'measurement', 'repo', 'note');
create type public.evidence_status as enum ('submitted', 'auto_verified', 'needs_review', 'accepted', 'rejected');
create type public.experiment_arm  as enum ('control', 'treatment');

-- hint_level is an enumeration of the integers 0..4 in the contract. A Postgres enum cannot have
-- numeric labels that behave as numbers, so it is a smallint domain with a range check.
create domain public.hint_level as smallint
  constraint hint_level_range check (value between 0 and 4);

-- Node codes (contract section 4).
create domain public.node_code as text
  constraint node_code_values check (value in
    ('math','phys','sw','ml','elec','sig','ctl','mech','sens','net','matl','sys','sec','econ','prof',
     'def','rf','robo','cv','pwr'));

-- Supporting enumerations added by this document (not in the contract; no contract name is changed).
create type public.session_status      as enum ('planned', 'active', 'completed', 'abandoned');
create type public.session_task_status as enum ('pending', 'in_progress', 'done', 'skipped');
-- grade_status mirrors attempts.grade ->> 'status' (00a D2); 'pending' = no grade yet (queued).
create type public.grade_status        as enum ('pending', 'graded', 'invalid_input', 'pending_review', 'error');
create type public.skill_status        as enum ('stub', 'draft', 'verified', 'needs_human_review', 'retired');  -- 00a C
create type public.experiment_status   as enum ('draft', 'running', 'paused', 'ended');
create type public.weekly_plan_status  as enum ('active', 'skipped', 'paused', 'superseded');
create type public.plan_slot_status    as enum ('planned', 'done', 'missed', 'moved');
create type public.challenge_status    as enum ('open', 'consumed', 'expired');
create type public.grant_status        as enum ('pending', 'applied', 'suspended');
create type public.report_status       as enum ('open', 'confirmed', 'dismissed');
create type public.user_project_status as enum ('active', 'paused', 'completed', 'abandoned');
create type public.tutor_role          as enum ('user', 'assistant', 'system');
create type public.job_status          as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
create type public.checkpoint_status   as enum ('due', 'in_progress', 'completed', 'expired');
create type public.privacy_request_kind   as enum ('export', 'delete');
create type public.privacy_request_status as enum ('requested', 'processing', 'completed', 'failed');
create type public.sync_run_status     as enum ('running', 'succeeded', 'failed');

-- ---------------------------------------------------------------------
-- 2. Generic helpers
-- ---------------------------------------------------------------------
create or replace function app_private.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 3. Identity: cohorts, profiles, admin_users
-- ---------------------------------------------------------------------
create table public.cohorts (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z0-9-]{2,40}$'),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  display_name           text not null default '' check (char_length(display_name) <= 80),
  timezone               text not null default 'UTC',
  weekly_minutes_target  integer not null default 480 check (weekly_minutes_target between 0 and 5000),
  created_at             timestamptz not null default now(),
  -- additions
  updated_at             timestamptz not null default now(),
  cohort_id              uuid references public.cohorts (id) on delete set null,
  locale                 text not null default 'en',
  target_retention       real not null default 0.90 check (target_retention between 0.70 and 0.97),
  reminder_time_local    time,
  adult_attested_at      timestamptz,          -- adults-only attestation (v1); no birth date stored
  terms_accepted_at      timestamptz,
  settings               jsonb not null default '{}'::jsonb check (pg_column_size(settings) < 16384),
  -- 00a C additions
  consents               jsonb not null default '{}'::jsonb check (pg_column_size(consents) < 8192),       -- {research:{version,at}, ...}
  bedtime_local          time,                                                                              -- planning aid for quiet hours only
  reminder_prefs         jsonb not null default '{}'::jsonb check (pg_column_size(reminder_prefs) < 8192), -- replaces a notification_prefs table (rejected in 00a C)
  onboarded_at           timestamptz
);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function app_private.set_updated_at();

-- Admin role: membership in this table. Not a profile column, so a learner cannot self-promote
-- through the profile update policy.
create table public.admin_users (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  granted_at  timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.admin_users a where a.user_id = auth.uid());
$$;

-- True for the Supabase service role and for migration/superuser sessions.
create or replace function public.is_service_role()
returns boolean language sql stable as $$
  -- current_user, not only auth.role(): an sb_secret_ key is not a JWT, so a claim may be absent (03 OA-9).
  select current_user = 'service_role' or coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin');
$$;

-- Create a profile row whenever a Supabase auth user is created.
create or replace function app_private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function app_private.handle_new_user();

-- Learners may not change cohort_id or id through the profile update path.
create or replace function app_private.guard_profile_update()
returns trigger language plpgsql as $$
begin
  if not (public.is_service_role() or public.is_admin()) then
    if new.id is distinct from old.id
       or new.cohort_id is distinct from old.cohort_id
       or new.created_at is distinct from old.created_at then
      raise exception 'profile column is not writable by the owner' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger profiles_guard_update before update on public.profiles
  for each row execute function app_private.guard_profile_update();

-- ---------------------------------------------------------------------
-- 4. Content tables (loaded from git by content:sync; readable by authenticated users)
-- ---------------------------------------------------------------------
-- Modules (00a C): ordered groups of skills inside a node; the unit of the unaided checkpoint.
-- key = '{node}.{module}'. content:sync also upserts a module row (is_stub = true) for every
-- (node, module) pair that only stub skills use, because skills.(node, module) references this table.
create table public.modules (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique check (key ~ '^[a-z]+\.[a-z0-9-]+$'),
  node         public.node_code not null,
  module       text not null check (module ~ '^[a-z0-9-]+$'),
  title        text not null,
  order_index  integer not null check (order_index >= 0),
  description  text not null default '',
  is_stub      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint modules_node_module_unique unique (node, module),
  constraint modules_key_matches check (key = node::text || '.' || module)
);
create index modules_order_idx on public.modules (order_index);
create trigger modules_set_updated_at before update on public.modules
  for each row execute function app_private.set_updated_at();

create table public.skills (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique check (key ~ '^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$'),
  node          public.node_code not null,
  module        text not null check (module ~ '^[a-z0-9-]+$'),
  title         text not null,
  description   text not null default '',
  tier_target   public.tier not null,
  est_minutes   integer not null check (est_minutes between 0 and 600),
  license       text not null,
  source        text not null,
  status        public.skill_status not null default 'draft',
  -- additions
  task_kinds      public.task_kind[] not null default '{}',     -- per-skill kinds; diagnostic and checkpoint are session-level (00a A2)
  grader_types    public.grader_type[] not null default '{}',
  phone_suitable  boolean not null default false,
  confusable_set  text check (confusable_set is null or confusable_set ~ '^[a-z0-9-]+(\.[a-z0-9-]+)*$'),
  version       integer not null default 1,
  content_hash  text,
  retired_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- the node part of the key must equal the node column
  constraint skills_key_node_matches check (split_part(key, '.', 1) = node::text),
  constraint skills_key_module_matches check (split_part(key, '.', 2) = module),
  constraint skills_module_fk foreign key (node, module) references public.modules (node, module) on update cascade,
  -- stubs: est_minutes 0, no task kinds or graders, never phone suitable; real skills: est_minutes >= 1 with the
  -- mandatory learning-loop kinds (doc 05 section 5.3). diagnostic/checkpoint are not per-skill kinds (00a A2).
  constraint skills_stub_shape check (
    (status = 'stub' and est_minutes = 0 and task_kinds = '{}' and grader_types = '{}' and not phone_suitable)
    or (status <> 'stub' and est_minutes >= 1
        and task_kinds @> array['worked_example', 'retrieval']::public.task_kind[]
        and cardinality(grader_types) >= 1)),
  constraint skills_no_session_level_kinds check (not (task_kinds && array['diagnostic', 'checkpoint']::public.task_kind[]))
);
create index skills_node_module_idx on public.skills (node, module);
create index skills_status_idx on public.skills (status);
create index skills_confusable_idx on public.skills (confusable_set) where confusable_set is not null;
create trigger skills_set_updated_at before update on public.skills
  for each row execute function app_private.set_updated_at();

create table public.skill_edges (
  id              uuid primary key default gen_random_uuid(),
  from_skill_key  text not null references public.skills (key) on update cascade on delete cascade, -- prerequisite
  to_skill_key    text not null references public.skills (key) on update cascade on delete cascade,
  strength        public.edge_strength not null default 'hard',
  min_tier        public.tier not null default 'L0',
  created_at      timestamptz not null default now(),
  constraint skill_edges_no_self_loop check (from_skill_key <> to_skill_key),
  constraint skill_edges_unique unique (from_skill_key, to_skill_key)
);
create index skill_edges_to_idx on public.skill_edges (to_skill_key);

-- DAG guard: reject an edge that would create a cycle (applies to hard and soft edges alike).
create or replace function app_private.skill_edge_acyclic()
returns trigger language plpgsql as $$
begin
  if exists (
    with recursive downstream(k) as (
      select e.to_skill_key from public.skill_edges e where e.from_skill_key = new.to_skill_key
      union
      select e.to_skill_key from public.skill_edges e join downstream d on e.from_skill_key = d.k
    )
    select 1 from downstream where k = new.from_skill_key
  ) then
    raise exception 'skill_edges would create a cycle: % -> %', new.from_skill_key, new.to_skill_key
      using errcode = '23514';
  end if;
  return new;
end $$;
create trigger skill_edges_acyclic before insert or update on public.skill_edges
  for each row execute function app_private.skill_edge_acyclic();

create table public.item_templates (
  id                uuid primary key default gen_random_uuid(),
  key               text not null check (key ~ '^tpl\.[a-z]+\.[a-z0-9-]+$'),   -- one row per (key, version), 00a C
  skill_key         text not null references public.skills (key) on update cascade on delete restrict,
  task_kind         public.task_kind not null,
  grader_type       public.grader_type not null,
  difficulty_prior  double precision not null default 0.5 check (difficulty_prior > 0 and difficulty_prior < 1), -- 00a D3; Elo conversion owned by 06
  version           integer not null default 1 check (version >= 1),
  status            public.content_status not null default 'draft',
  body              jsonb not null,                        -- includes solution generators: NEVER exposed to learners
  -- additions
  phone_suitable    boolean not null default false,
  est_seconds       integer not null default 60 check (est_seconds between 5 and 14400),
  license           text not null,
  source            text not null,
  content_hash      text,
  retired_at        timestamptz,
  retired_reason    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- 06 section 2 / 00a C additions
  difficulty_est    double precision,                      -- live calibrated difficulty (nightly job); not learner-visible
  n_obs             integer not null default 0 check (n_obs >= 0),
  tier              public.tier,                           -- tier band of the item; null = the skill's tier_target
  pool              text not null default 'practice' check (pool in ('practice', 'assessment', 'transfer')),
  interleave        boolean not null default false,
  reference_time_s  integer check (reference_time_s is null or reference_time_s between 1 and 14400),
  mastery_eligible  boolean not null default true,         -- false for rubric_llm templates until the rubric is calibrated (00a B4)
  constraint item_templates_key_version_unique unique (key, version)
);
create index item_templates_skill_idx on public.item_templates (skill_key, status);
create index item_templates_grader_idx on public.item_templates (grader_type);
create trigger item_templates_set_updated_at before update on public.item_templates
  for each row execute function app_private.set_updated_at();

-- Items: one concrete, seeded instance of a template. Generated per learner (user_id set) or
-- pre-generated into a shared pool (user_id null).
create table public.items (
  id                   uuid primary key default gen_random_uuid(),
  template_key         text not null,
  seed                 bigint not null,
  params               jsonb not null default '{}'::jsonb,
  rendered             jsonb not null,                    -- learner-visible: prompt, figures, response schema
  verification_report  jsonb not null default '{}'::jsonb, -- includes recomputed answers: not learner-visible
  status               public.content_status not null default 'draft',
  difficulty_est       double precision,
  -- additions
  template_version     integer not null,
  user_id              uuid references public.profiles (id) on delete cascade,
  created_at           timestamptz not null default now(),
  retired_at           timestamptz,
  retired_reason       text,
  constraint items_verified_has_report check
    (status not in ('verified') or (verification_report ? 'verifier' and verification_report ? 'agreed')),
  constraint items_unique_instance unique (template_key, template_version, seed, user_id),
  constraint items_template_fk foreign key (template_key, template_version)
    references public.item_templates (key, version) on update cascade
);
create index items_template_status_idx on public.items (template_key, status);
create index items_user_status_idx on public.items (user_id, status) where user_id is not null;
create index items_pool_idx on public.items (template_key) where user_id is null and status = 'verified';

-- Answer keys, reference solutions and hidden tests. No learner policy exists: service role only.
create table public.item_secrets (
  item_id      uuid primary key references public.items (id) on delete cascade,
  answer_key   jsonb not null,
  solution     jsonb,
  hidden_tests jsonb,
  created_at   timestamptz not null default now()
);

create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique check (key ~ '^prj\.L[0-9]\.[a-z0-9-]+$'),
  title         text not null,
  ladder_level  smallint not null check (ladder_level between 0 and 9),
  tier_gate     public.tier not null default 'L0',
  est_hours     numeric(6,1) not null check (est_hours > 0),
  bom           jsonb not null default '[]'::jsonb,
  status        public.content_status not null default 'draft',
  -- additions
  description   text not null default '',
  license       text not null,
  source        text not null,
  content_hash  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- 00a C: learning_goals, prerequisite_skill_keys, grants_tier, time_split_min, tools, safety_notes,
  -- expected_measurements, failure_modes (doc 10 section 3). Not selectable by clients (expected values).
  spec          jsonb not null default '{}'::jsonb check (pg_column_size(spec) < 262144),
  constraint projects_key_level_matches check (substring(key from '^prj\.L([0-9])\.')::smallint = ladder_level)
);
create trigger projects_set_updated_at before update on public.projects
  for each row execute function app_private.set_updated_at();

create table public.project_steps (
  id                 uuid primary key default gen_random_uuid(),
  key                text not null unique check (key ~ '^prj\.L[0-9]\.[a-z0-9-]+#s[0-9]{2}$'),
  project_key        text not null references public.projects (key) on update cascade on delete cascade,
  position           integer not null check (position >= 1),
  title              text not null,
  est_min            integer not null check (est_min between 1 and 480),
  session_type       public.session_type not null,
  skill_keys         text[] not null default '{}',
  evidence_required  public.evidence_kind[] not null default '{}',  -- empty array = no evidence needed
  -- additions
  instructions       jsonb not null default '{}'::jsonb,
  verification_spec  jsonb not null default '{}'::jsonb,           -- e.g. {"nonce": true, "grader": "measurement_check", ...}
  status             public.content_status not null default 'draft',
  created_at         timestamptz not null default now(),
  constraint project_steps_position_unique unique (project_key, position),
  constraint project_steps_key_prefix check (split_part(key, '#', 1) = project_key),
  -- 00a A1: no 21-44 minute session type exists, so steps cannot be authored in that range.
  constraint project_steps_est_by_type check (
    (session_type = 'micro' and est_min <= 20)
    or (session_type = 'focus' and est_min between 45 and 120)
    or (session_type = 'lab' and est_min between 120 and 240))
);

-- ---------------------------------------------------------------------
-- 4b. Weekly plans (docs 06 section 7.8-7.9 and 09 S16). Slots only; contents are chosen at session start.
-- ---------------------------------------------------------------------
create table public.weekly_plans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  week_start       date not null,                          -- local Monday of the learner's timezone
  status           public.weekly_plan_status not null default 'active',
  target_minutes   integer not null check (target_minutes between 0 and 5000),   -- snapshot of profiles.weekly_minutes_target
  planned_minutes  integer not null default 0 check (planned_minutes >= 0),     -- sum of non-missed slots, maintained by the server
  slack_minutes    integer not null default 0,
  paused_until     date,
  carry            jsonb not null default '{}'::jsonb,      -- minutes carried in from the previous week (focus 50% rule, lab)
  forecast         jsonb not null default '{}'::jsonb,      -- estimate only: {reviews_due, new_skills}
  params_version   text,
  generated_by     text not null default 'weekly_plan_slots' check (generated_by in ('weekly_plan_slots', 'rebalance', 'manual')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint weekly_plans_monday check (extract(isodow from week_start) = 1),
  constraint weekly_plans_user_week_unique unique (user_id, week_start),
  constraint weekly_plans_id_user_unique unique (id, user_id)
);
create trigger weekly_plans_set_updated_at before update on public.weekly_plans
  for each row execute function app_private.set_updated_at();

create table public.plan_slots (
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid not null,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  day              date not null,
  position         smallint not null default 1 check (position >= 1),   -- order inside the day
  session_type     public.session_type not null,
  planned_min      integer not null check (planned_min > 0),
  context          public.context not null,
  status           public.plan_slot_status not null default 'planned',
  start_time_local time,
  moved_from_day   date,                                   -- set when status = 'moved' or after a move
  carried_min      integer not null default 0 check (carried_min >= 0),
  note             text check (char_length(note) <= 500),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint plan_slots_plan_fk foreign key (plan_id, user_id) references public.weekly_plans (id, user_id) on delete cascade,
  constraint plan_slots_planned_min_by_type check (
    (session_type = 'micro' and planned_min <= 20)
    or (session_type = 'focus' and planned_min between 45 and 120)
    or (session_type = 'lab' and planned_min between 120 and 240)),
  constraint plan_slots_micro_not_bench check (not (session_type = 'micro' and context = 'bench')),
  constraint plan_slots_moved_has_origin check (status <> 'moved' or moved_from_day is not null)
);
create index plan_slots_plan_idx on public.plan_slots (plan_id, day, position);
create index plan_slots_user_day_idx on public.plan_slots (user_id, day);
create trigger plan_slots_set_updated_at before update on public.plan_slots
  for each row execute function app_private.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. Sessions, tasks, attempts
-- ---------------------------------------------------------------------
create table public.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  session_type  public.session_type not null,
  context       public.context not null,
  planned_min   integer not null check (planned_min > 0),
  actual_min    integer check (actual_min >= 0),
  started_at    timestamptz,
  ended_at      timestamptz,
  -- additions
  status             public.session_status not null default 'planned',
  available_minutes  integer not null check (available_minutes > 0),
  builder_version    text not null default 'v1',
  plan               jsonb not null default '{}'::jsonb,   -- rationale per task (why chosen), for explainability
  created_at         timestamptz not null default now(),
  -- 06 section 2 / 00a C additions
  plan_slot_id         uuid references public.plan_slots (id) on delete set null,   -- weekly slot this session fulfils
  experiment_snapshot  jsonb not null default '{}'::jsonb,                          -- parameter values and arms in force
  graph_version        text,                                                        -- skill-graph version used by the builder
  constraint sessions_planned_min_by_type check (
    (session_type = 'micro' and planned_min <= 20)
    or (session_type = 'focus' and planned_min between 45 and 120)
    or (session_type = 'lab' and planned_min between 120 and 240)),
  constraint sessions_micro_not_bench check (not (session_type = 'micro' and context = 'bench')),
  constraint sessions_time_order check (ended_at is null or started_at is null or ended_at >= started_at)
);
create index sessions_user_created_idx on public.sessions (user_id, created_at desc);
create index sessions_user_active_idx on public.sessions (user_id) where status in ('planned', 'active');
create index sessions_plan_slot_idx on public.sessions (plan_slot_id) where plan_slot_id is not null;

create table public.session_tasks (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.sessions (id) on delete cascade,
  position          integer not null check (position >= 1),
  task_kind         public.task_kind not null,
  skill_key         text references public.skills (key) on update cascade,
  item_id           uuid references public.items (id),
  status            public.session_task_status not null default 'pending',
  -- additions
  user_id           uuid not null references public.profiles (id) on delete cascade,
  project_step_key  text references public.project_steps (key) on update cascade,
  est_seconds       integer not null default 60 check (est_seconds > 0),
  reason            text,                                   -- selection rule: due_review | continue | frontier | interleave | checkpoint | project
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  assessment_kind   text check (assessment_kind in ('diagnostic', 'module_end', 'periodic', 'delayed', 'transfer')),  -- null = ordinary practice
  constraint session_tasks_position_unique unique (session_id, position),
  constraint session_tasks_content_ref check (
    (task_kind = 'project_step' and project_step_key is not null)
    or (task_kind <> 'project_step' and (skill_key is not null or task_kind = 'checkpoint')))
);
create index session_tasks_user_idx on public.session_tasks (user_id, created_at desc);
create index session_tasks_item_idx on public.session_tasks (item_id);

create table public.attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  item_id          uuid not null references public.items (id),
  session_id       uuid references public.sessions (id) on delete set null,
  started_at       timestamptz not null,
  submitted_at     timestamptz not null,
  response         jsonb not null,
  grade            jsonb,                                   -- {score, correct, graders:[...], feedback?}
  hints_used       integer not null default 0 check (hints_used >= 0),
  max_hint_level   public.hint_level not null default 0,
  latency_ms       integer check (latency_ms >= 0),
  confidence       smallint check (confidence between 1 and 5),
  unaided          boolean not null default true,
  -- additions
  session_task_id    uuid references public.session_tasks (id) on delete set null,
  client_attempt_id  uuid not null,                         -- idempotency key from the client / offline queue
  grade_status       public.grade_status not null default 'pending',
  graded_at          timestamptz,
  grader_version     text,
  offline            boolean not null default false,        -- answered while offline
  client_grade       jsonb,                                 -- provisional client-side grade, never trusted
  server_verified_at timestamptz,
  created_at         timestamptz not null default now(),
  -- 06 section 2 / 00a C additions
  expected_ms        integer check (expected_ms >= 0),      -- latency expectation used for rating
  flags              text[] not null default '{}',          -- e.g. rapid_guess, slow
  assessment_kind    text check (assessment_kind in ('diagnostic', 'module_end', 'periodic', 'delayed', 'transfer')),
  active_ms          integer check (active_ms >= 0),        -- active time; latency_ms is wall time
  -- 00a H15: set by compare-and-set in the state transaction; the idempotency guard for Elo and mastery updates
  state_applied_at   timestamptz,
  constraint attempts_client_unique unique (user_id, client_attempt_id),
  constraint attempts_time_order check (submitted_at >= started_at),
  -- 00a B1: unaided is TRUE iff max_hint_level <= 1 (level 4, reveal, is therefore never unaided). Strict-unaided
  -- (level 0 and no tutor panel opened) is the view app_private.v_attempts_strict_unaided.
  constraint attempts_unaided_rule check (unaided = (max_hint_level <= 1)),
  constraint attempts_hints_vs_level check (max_hint_level = 0 or hints_used > 0),
  -- checkpoints expose no hint UI at all (00a B1)
  constraint attempts_checkpoint_no_hints check (
    assessment_kind is null or assessment_kind not in ('module_end', 'periodic', 'delayed') or (max_hint_level = 0 and hints_used = 0)),
  -- 00a D2: grade.status mirrors grade_status; score and correct are JSON null unless status = graded.
  constraint attempts_grade_shape check (
    grade is null
    or (grade ? 'status' and grade ? 'score' and grade ? 'correct' and grade ? 'graders'
        and grade ->> 'status' = grade_status::text
        and case when grade_status = 'graded'
                 then jsonb_typeof(grade -> 'score') = 'number'
                      and case when jsonb_typeof(grade -> 'score') = 'number'
                               then (grade ->> 'score')::numeric between 0 and 1 else false end
                      and jsonb_typeof(grade -> 'correct') = 'boolean'
                 else jsonb_typeof(grade -> 'score') = 'null' and jsonb_typeof(grade -> 'correct') = 'null'
            end)),
  constraint attempts_pending_has_no_grade check (grade_status <> 'pending' or grade is null),
  constraint attempts_graded_has_grade check (grade_status not in ('graded', 'invalid_input') or grade is not null),
  constraint attempts_state_applied_when_graded check (state_applied_at is null or grade_status = 'graded')
);
create index attempts_user_submitted_idx on public.attempts (user_id, submitted_at desc);
create index attempts_item_idx on public.attempts (item_id);
create index attempts_session_idx on public.attempts (session_id);
create index attempts_pending_idx on public.attempts (created_at) where grade_status = 'pending';
create index attempts_state_unapplied_idx on public.attempts (graded_at) where grade_status = 'graded' and state_applied_at is null;

-- ---------------------------------------------------------------------
-- 6. Learner state: skill_state (FSRS card + Elo + mastery) and review_log
-- ---------------------------------------------------------------------
create table public.skill_state (
  user_id         uuid not null references public.profiles (id) on delete cascade,
  skill_key       text not null references public.skills (key) on update cascade,
  mastery_state   public.mastery_state not null default 'unseen',
  elo             double precision not null default 1000,
  -- FSRS card fields (ts-fsrs Card)
  stability       double precision not null default 0 check (stability >= 0),
  difficulty      double precision not null default 0 check (difficulty >= 0),
  due             timestamptz,
  last_review     timestamptz,
  reps            integer not null default 0 check (reps >= 0),
  lapses          integer not null default 0 check (lapses >= 0),
  fsrs_state      smallint not null default 0 check (fsrs_state between 0 and 3), -- 0 New,1 Learning,2 Review,3 Relearning
  tier_attained   public.tier,
  -- additions
  elapsed_days    double precision not null default 0,
  scheduled_days  double precision not null default 0,
  learning_steps  integer not null default 0,
  mastery_evidence jsonb not null default '{}'::jsonb,      -- counters for the mastery rule; canonical rule in 06
  first_seen_at   timestamptz,
  mastered_at     timestamptz,
  updated_at      timestamptz not null default now(),
  -- 00a B6/B7 and 06 section 2 additions
  fsrs_model      text not null default 'fsrs-6',           -- pinned model behind one adapter file (00a B7)
  fsrs_extra      jsonb not null default '{}'::jsonb,       -- card fields beyond the contract set
  source          text not null default 'learned' check (source in ('learned', 'placement')),
  n_attempts      integer not null default 0 check (n_attempts >= 0),   -- graded attempts counted for the K-factor
  epoch_start     timestamptz,                              -- start of the current mastery epoch (06 4.4)
  ever_mastered   boolean not null default false,
  loop_step       text check (loop_step in ('worked_example', 'faded_problem', 'retrieval_same_day', 'practice', 'verify', 'done')),
  blocked_by      text[] not null default '{}',             -- prerequisite keys found faulty by trace-back
  interleave_stage smallint not null default 0 check (interleave_stage between 0 and 3),
  diag_credit     boolean not null default false,           -- credited by diagnostic inference, needs verification
  primary key (user_id, skill_key),
  constraint skill_state_placement_never_mastered check (not (source = 'placement' and mastery_state = 'mastered'))
);
create index skill_state_due_idx on public.skill_state (user_id, due)
  where mastery_state in ('learning', 'reviewing', 'mastered', 'decayed');
create index skill_state_mastery_idx on public.skill_state (user_id, mastery_state);
create trigger skill_state_set_updated_at before update on public.skill_state
  for each row execute function app_private.set_updated_at();

create table public.review_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  skill_key       text not null references public.skills (key) on update cascade,
  attempt_id      uuid references public.attempts (id) on delete set null,
  rating          smallint not null check (rating between 1 and 4),   -- 1 Again, 2 Hard, 3 Good, 4 Easy
  reviewed_at     timestamptz not null default now(),
  elapsed_days    double precision not null default 0,
  scheduled_days  double precision not null default 0,
  -- additions: enough to replay or re-fit FSRS parameters
  state_before    smallint check (state_before between 0 and 3),
  stability_after double precision,
  difficulty_after double precision,
  due_after       timestamptz,
  fsrs_params_version text,
  -- 06 section 2 / 00a C additions
  flags           text[] not null default '{}',             -- rating flags
  attempt_ids     uuid[] not null default '{}',             -- every attempt aggregated into this review (attempt_id is the anchor)
  session_id      uuid references public.sessions (id) on delete set null   -- one review row per skill per session (00a B3)
);
create index review_log_user_time_idx on public.review_log (user_id, reviewed_at desc);
create index review_log_user_skill_idx on public.review_log (user_id, skill_key, reviewed_at);
-- One review per attempt: makes the scheduler update idempotent.
create unique index review_log_attempt_unique on public.review_log (attempt_id) where attempt_id is not null;
create unique index review_log_session_skill_unique on public.review_log (session_id, skill_key) where session_id is not null;

-- ---------------------------------------------------------------------
-- 7. Projects and evidence
-- ---------------------------------------------------------------------
create table public.user_projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  project_key   text not null references public.projects (key) on update cascade,
  status        public.user_project_status not null default 'active',
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  -- additions
  current_step_key text references public.project_steps (key) on update cascade,
  variation     jsonb not null default '{}'::jsonb,         -- per-learner parameters (resistor values, sample rate...)
  created_at    timestamptz not null default now(),
  -- 00a C: structured pause/resume state (doc 10 section 5.7)
  bench_state   jsonb not null default '{}'::jsonb check (pg_column_size(bench_state) < 32768),
  updated_at    timestamptz not null default now(),
  constraint user_projects_completed_when_done check ((status = 'completed') = (completed_at is not null)),
  constraint user_projects_id_user_unique unique (id, user_id)
);
create trigger user_projects_set_updated_at before update on public.user_projects
  for each row execute function app_private.set_updated_at();
create unique index user_projects_one_open on public.user_projects (user_id, project_key)
  where status in ('active', 'paused');
create index user_projects_user_idx on public.user_projects (user_id, started_at desc);

-- Nonce challenges (doc 10 section 7.4). A challenge is a freshness token, not an identity proof.
create table public.evidence_challenges (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  user_project_id  uuid not null,
  step_key         text not null references public.project_steps (key) on update cascade,
  attempt_no       integer not null default 1 check (attempt_no >= 1),
  code             text not null check (code ~ '^PM-[2-9A-HJKMNPQ-TV-Z]{4}-[2-9A-HJKMNPQ-TV-Z]{4}$'),
  digits           text check (digits is null or digits ~ '^[0-9]{6}$'),
  params           jsonb not null default '{}'::jsonb,     -- attempt-scope parameters, e.g. {"period_ms": 800}
  issued_at        timestamptz not null default now(),
  expires_at       timestamptz not null,
  bound_to         uuid references public.evidence_challenges (id) on delete set null,   -- reuse of an earlier challenge (doc 10 7.4.5)
  consumed_at      timestamptz,
  status           public.challenge_status not null default 'open',
  created_at       timestamptz not null default now(),
  constraint evidence_challenges_up_fk foreign key (user_project_id, user_id)
    references public.user_projects (id, user_id) on delete cascade,
  constraint evidence_challenges_step_attempt_unique unique (user_project_id, step_key, attempt_no),
  constraint evidence_challenges_code_unique unique (code),
  constraint evidence_challenges_time_order check (expires_at > issued_at),
  constraint evidence_challenges_consumed_shape check ((status = 'consumed') = (consumed_at is not null))
);
create index evidence_challenges_user_idx on public.evidence_challenges (user_id, issued_at desc);
create index evidence_challenges_open_idx on public.evidence_challenges (user_project_id, step_key) where status = 'open';

create table public.project_evidence (
  id               uuid primary key default gen_random_uuid(),
  user_project_id  uuid not null references public.user_projects (id) on delete cascade,
  step_key         text not null references public.project_steps (key) on update cascade,
  evidence_kind    public.evidence_kind not null,
  storage_path     text,
  verification     jsonb not null default '{}'::jsonb,
  evidence_status  public.evidence_status not null default 'submitted',
  -- additions
  user_id          uuid not null references public.profiles (id) on delete cascade,
  challenge_nonce  text,                                    -- nonce the board/video must show (assurance rung 1-3)
  mime_type        text,
  size_bytes       bigint check (size_bytes between 0 and 524288000),
  sha256           text check (sha256 ~ '^[0-9a-f]{64}$'),
  content          jsonb not null default '{}'::jsonb check (pg_column_size(content) < 65536), -- measurement values, repo URL, note text
  reviewed_by      uuid references public.profiles (id) on delete set null,
  reviewed_at      timestamptz,
  review_note      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  challenge_id     uuid references public.evidence_challenges (id) on delete set null,   -- challenge this evidence answers
  constraint project_evidence_up_fk foreign key (user_project_id, user_id)
    references public.user_projects (id, user_id) on delete cascade,
  constraint project_evidence_file_kinds_have_path check
    (evidence_kind not in ('photo', 'video', 'log', 'scope_capture') or storage_path is not null),
  constraint project_evidence_path_prefix check
    (storage_path is null or storage_path like (user_id::text || '/%'))
);
create index project_evidence_up_step_idx on public.project_evidence (user_project_id, step_key);
create index project_evidence_review_idx on public.project_evidence (created_at) where evidence_status = 'needs_review';
create index project_evidence_user_idx on public.project_evidence (user_id, created_at desc);
create trigger project_evidence_set_updated_at before update on public.project_evidence
  for each row execute function app_private.set_updated_at();

-- Evidence status machine (00a C, doc 10 section 7.7). rejected is terminal; a new row supersedes it.
--   submitted -> auto_verified | needs_review | rejected
--   auto_verified -> accepted
--   needs_review -> accepted | rejected
-- When a row reaches 'accepted' its challenge is consumed.
create or replace function app_private.evidence_status_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' and new.evidence_status is distinct from old.evidence_status then
    if not (
         (old.evidence_status = 'submitted'     and new.evidence_status in ('auto_verified', 'needs_review', 'rejected'))
      or (old.evidence_status = 'auto_verified' and new.evidence_status = 'accepted')
      or (old.evidence_status = 'needs_review'  and new.evidence_status in ('accepted', 'rejected'))) then
      raise exception 'illegal evidence_status transition % -> %', old.evidence_status, new.evidence_status
        using errcode = '23514';
    end if;
  end if;
  if new.evidence_status = 'accepted' and new.challenge_id is not null
     and (tg_op = 'INSERT' or old.evidence_status is distinct from 'accepted') then
    update public.evidence_challenges
       set status = 'consumed', consumed_at = now()
     where id = new.challenge_id and status <> 'consumed';
  end if;
  return new;
end $$;
create trigger project_evidence_status_guard before insert or update of evidence_status on public.project_evidence
  for each row execute function app_private.evidence_status_guard();

-- Project credit ledger (doc 10 section 8.2, 00a B5): L0 credit is applied at once, L1+ credit starts pending and
-- counts only toward the "applied" condition of the mastery rule. No project grants L2 or L3.
create table public.project_grants (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  user_project_id  uuid not null,
  project_key      text not null references public.projects (key) on update cascade,
  skill_key        text not null references public.skills (key) on update cascade,
  tier             public.tier not null check (tier in ('L0', 'L1')),
  status           public.grant_status not null default 'pending',
  granted_at       timestamptz not null default now(),
  applied_at       timestamptz,
  assisted         boolean not null default false,          -- tutor reached level 4 on two or more steps
  constraint project_grants_up_fk foreign key (user_project_id, user_id)
    references public.user_projects (id, user_id) on delete cascade,
  constraint project_grants_unique unique (user_project_id, skill_key),
  constraint project_grants_l0_applied check (tier <> 'L0' or status <> 'pending'),
  constraint project_grants_applied_at check (status <> 'applied' or applied_at is not null)
);
create index project_grants_user_skill_idx on public.project_grants (user_id, skill_key);

-- ---------------------------------------------------------------------
-- 8. Tutor
-- ---------------------------------------------------------------------
create table public.tutor_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  item_id     uuid references public.items (id),
  skill_key   text references public.skills (key) on update cascade,
  -- additions
  session_id  uuid references public.sessions (id) on delete set null,
  attempts_seen integer not null default 0,                 -- attempts (or stated attempts) before first hint
  max_hint_level public.hint_level not null default 0,
  closed_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index tutor_threads_user_idx on public.tutor_threads (user_id, created_at desc);
create index tutor_threads_item_idx on public.tutor_threads (item_id);

create table public.tutor_messages (
  id            uuid primary key default gen_random_uuid(),
  thread_id     uuid not null references public.tutor_threads (id) on delete cascade,
  role          public.tutor_role not null,
  content       text not null check (char_length(content) <= 20000),
  hint_level    public.hint_level not null default 0,
  policy_flags  jsonb not null default '{}'::jsonb,         -- e.g. {"attempt_first_ok":true,"leak_filter":"pass","injection_suspected":false}
  -- additions
  user_id       uuid not null references public.profiles (id) on delete cascade,
  llm_call_id   uuid,                                       -- soft reference to llm_calls.id (llm_calls rows outlive users)
  prompt_version text,
  created_at    timestamptz not null default now()
);
create index tutor_messages_thread_idx on public.tutor_messages (thread_id, created_at);
create index tutor_messages_user_idx on public.tutor_messages (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 9. Experiments, checkpoints, events
-- ---------------------------------------------------------------------
create table public.experiments (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique check (key ~ '^[a-z0-9][a-z0-9.-]{1,60}$'),
  description  text not null,
  started_at   timestamptz,
  -- additions
  ended_at     timestamptz,
  allocation_treatment_pct smallint not null default 50 check (allocation_treatment_pct between 0 and 100),
  pre_registration jsonb not null default '{}'::jsonb,      -- hypothesis, primary metric, stopping rule (see evaluation plan)
  created_at   timestamptz not null default now(),
  -- 00a C additions (doc 11 CCR-01, CCR-13)
  design       jsonb not null default '{}'::jsonb,          -- {unit_type, arm_labels:{control,treatment}, allocation:'hash'|'external', pairing:{...}}
  status       public.experiment_status not null default 'draft',
  preregistration_ref text,                                 -- git tag and SHA-256 of experiments/<id>/prereg.md, set before the first assignment
  constraint experiments_time_order check (ended_at is null or started_at is null or ended_at >= started_at),
  constraint experiments_design_unit check (not (design ? 'unit_type') or design ->> 'unit_type' in ('user', 'skill', 'module', 'confusable_set'))
);

-- Unit-level assignment (00a C): the unit is a user, a skill, a module or a confusable set. Sticky: unique per unit.
create table public.experiment_assignments (
  id             uuid primary key default gen_random_uuid(),
  experiment_key text not null references public.experiments (key) on update cascade on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  arm            public.experiment_arm not null,
  assigned_at    timestamptz not null default now(),
  unit_type      text not null default 'user' check (unit_type in ('user', 'skill', 'module', 'confusable_set')),
  unit_key       text not null,                             -- user id text, skill key, module key or confusable_set name
  block_index    integer check (block_index >= 0),
  rng_seed       text,                                      -- seed of the pseudo-random allocation; hidden from learners
  constraint experiment_assignments_unit_unique unique (experiment_key, user_id, unit_type, unit_key),
  constraint experiment_assignments_user_unit_is_user check (unit_type <> 'user' or unit_key = user_id::text)
);
create index experiment_assignments_user_idx on public.experiment_assignments (user_id);
create index experiment_assignments_exp_idx on public.experiment_assignments (experiment_key, unit_type, unit_key);

-- Reproducible analysis exclusions (doc 11 section 11.4). Admin only; append-only for admins.
create table public.analysis_exclusions (
  id              uuid primary key default gen_random_uuid(),
  experiment_key  text references public.experiments (key) on update cascade on delete cascade,   -- null = applies to every analysis
  user_id         uuid references public.profiles (id) on delete cascade,
  unit_key        text,                                     -- skill key, item id, attempt id, module key ...
  reason          text not null check (char_length(reason) between 3 and 1000),
  decided_by      uuid references public.profiles (id) on delete set null,
  decided_at      timestamptz not null default now(),
  constraint analysis_exclusions_target check (user_id is not null or unit_key is not null)
);
create index analysis_exclusions_exp_idx on public.analysis_exclusions (experiment_key, user_id);

create table public.checkpoints (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  scope_node    public.node_code not null,
  scope_module  text,                                       -- null = node-wide
  reason        text not null check (reason in ('module_end', 'every_14_days', 'manual')),
  status        public.checkpoint_status not null default 'due',
  due_at        timestamptz not null default now(),
  session_id    uuid references public.sessions (id) on delete set null,
  score         double precision check (score between 0 and 1),
  started_at    timestamptz,
  completed_at  timestamptz,
  details       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index checkpoints_user_status_idx on public.checkpoints (user_id, status, due_at);

create table public.events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  name             text not null check (name ~ '^[a-z0-9_.]{1,64}$'),
  props            jsonb not null default '{}'::jsonb check (pg_column_size(props) < 8192),
  at               timestamptz not null default now(),
  -- additions
  client_event_id  uuid,
  session_id       uuid references public.sessions (id) on delete set null,
  graph_version    text                                    -- 00a C: skill-graph version in force
);
create index events_user_at_idx on public.events (user_id, at desc);
create index events_name_at_idx on public.events (name, at desc);
create unique index events_client_unique on public.events (user_id, client_event_id) where client_event_id is not null;

-- ---------------------------------------------------------------------
-- 10. Infrastructure tables: jobs, idempotency, content sync, LLM usage, push, privacy, reports
-- ---------------------------------------------------------------------
create table public.jobs (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in (
                'grade_attempt', 'pregenerate_items', 'verify_evidence', 'content_postprocess',
                'export_user_data', 'delete_user_data', 'send_push', 'prune_expired', 'sweep_storage',
                'nightly_maintenance')),                    -- G15: calibration monitor, decay evaluation, tutor audit sampling
  payload     jsonb not null default '{}'::jsonb,
  status      public.job_status not null default 'queued',
  attempts    integer not null default 0,
  locked_at   timestamptz,
  result      jsonb,
  error       text,
  created_at  timestamptz not null default now(),
  -- additions
  updated_at  timestamptz not null default now(),
  finished_at timestamptz,
  run_after   timestamptz not null default now(),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  priority    smallint not null default 0,                  -- higher is claimed first
  timeout_s   integer not null default 120 check (timeout_s between 5 and 3600),
  locked_by   text,
  dedupe_key  text,
  user_id     uuid,                                         -- informational, deliberately NOT a foreign key (see 04 section 10)
  constraint jobs_running_has_lock check (status <> 'running' or (locked_at is not null and locked_by is not null))
);
create index jobs_claim_idx on public.jobs (priority desc, run_after, created_at) where status = 'queued';
create index jobs_running_idx on public.jobs (locked_at) where status = 'running';
create index jobs_finished_idx on public.jobs (finished_at) where status in ('succeeded', 'failed', 'cancelled');
create unique index jobs_dedupe_idx on public.jobs (dedupe_key) where dedupe_key is not null and status in ('queued', 'running');

create table public.idempotency_keys (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  key           text not null check (char_length(key) between 8 and 128),
  method        text not null,
  path          text not null,
  request_hash  text not null,
  status_code   integer,
  response      jsonb,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '48 hours',
  primary key (user_id, key)
);
create index idempotency_expires_idx on public.idempotency_keys (expires_at);

create table public.content_sync_runs (
  id           uuid primary key default gen_random_uuid(),
  git_sha      text not null,
  git_ref      text,
  trigger      text not null default 'ci' check (trigger in ('ci', 'manual', 'local')),
  status       public.sync_run_status not null default 'running',
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  stats        jsonb not null default '{}'::jsonb,         -- {skills:{added,changed,retired}, edges:{...}, templates:{...}, projects:{...}}
  errors       jsonb not null default '[]'::jsonb
);
create index content_sync_runs_started_idx on public.content_sync_runs (started_at desc);

create table public.llm_calls (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles (id) on delete set null,   -- survives user deletion, anonymised
  purpose         text not null check (purpose in ('tutor', 'rubric_grade', 'tagging', 'drafting', 'safety_check')),
  provider        text not null,
  model           text not null,
  prompt_version  text not null,
  input_tokens    integer not null default 0,
  output_tokens   integer not null default 0,
  cost_usd_micro  bigint not null default 0,               -- millionths of a US dollar, computed from llm/pricing.json
  latency_ms      integer,
  outcome         text not null default 'ok' check (outcome in ('ok', 'error', 'blocked', 'budget_denied', 'timeout')),
  at              timestamptz not null default now()
);
create index llm_calls_user_at_idx on public.llm_calls (user_id, at desc);
create index llm_calls_at_idx on public.llm_calls (at desc);

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- Privacy requests keep a pseudonymous trace after account deletion, so user_id is not a foreign key.
create table public.privacy_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  kind          public.privacy_request_kind not null,
  status        public.privacy_request_status not null default 'requested',
  requested_at  timestamptz not null default now(),
  completed_at  timestamptz,
  export_path   text,                                       -- storage path of the export archive (expires)
  export_expires_at timestamptz,
  error         text
);
create index privacy_requests_user_idx on public.privacy_requests (user_id, requested_at desc);

create table public.item_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  item_id     uuid references public.items (id),               -- null only for a tutor report on a thread with no item
  reason      text not null check (reason in ('wrong_answer', 'ambiguous', 'unsolvable', 'offensive', 'other')),
  note        text check (char_length(note) <= 2000),
  created_at  timestamptz not null default now(),
  -- review workflow (doc 07 CCR-08 columns): admin triage
  attempt_id  uuid references public.attempts (id) on delete set null,
  status      public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  -- 00a H16: FR-056 also covers tutor replies
  target_type text not null default 'item' check (target_type in ('item', 'tutor_message')),
  tutor_message_id uuid references public.tutor_messages (id) on delete cascade,
  unique (user_id, item_id, reason),
  constraint item_reports_target_check check (
    (target_type = 'item' and item_id is not null and tutor_message_id is null)
    or (target_type = 'tutor_message' and tutor_message_id is not null))
);
create unique index item_reports_tutor_unique on public.item_reports (user_id, tutor_message_id, reason)
  where tutor_message_id is not null;
create index item_reports_item_idx on public.item_reports (item_id);
create index item_reports_open_idx on public.item_reports (created_at) where status = 'open';

-- ---------------------------------------------------------------------
-- 10b. app_private: rate limits (token bucket, doc 03 ER-8) and the strict-unaided evaluation view (00a B1)
-- ---------------------------------------------------------------------
create table app_private.rate_limits (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  bucket      text not null check (char_length(bucket) between 1 and 64),   -- e.g. api, tutor, upload, attempt
  tokens      double precision not null check (tokens >= 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, bucket)
);
create index rate_limits_updated_idx on app_private.rate_limits (updated_at);
alter table app_private.rate_limits enable row level security;   -- no policies: deny-all for every non-owner role

-- Take p_cost tokens from the (user, bucket) bucket. Returns 0 when allowed, otherwise the seconds to wait.
-- Capacity and refill are passed by the caller so limits live in application config.
create or replace function app_private.rate_limit_take(
  p_user uuid, p_bucket text, p_capacity double precision, p_refill_per_s double precision, p_cost double precision default 1)
returns double precision language plpgsql security definer set search_path = public, pg_temp as $$
declare v_tokens double precision; v_now timestamptz := clock_timestamp();
begin
  if p_capacity <= 0 or p_refill_per_s <= 0 or p_cost <= 0 or p_cost > p_capacity then
    raise exception 'invalid rate limit parameters' using errcode = '22023';
  end if;
  insert into app_private.rate_limits as r (user_id, bucket, tokens, updated_at)
  values (p_user, p_bucket, p_capacity, v_now)
  on conflict (user_id, bucket) do update
    set tokens = least(p_capacity, r.tokens + extract(epoch from (v_now - r.updated_at)) * p_refill_per_s),
        updated_at = v_now
  returning tokens into v_tokens;
  if v_tokens >= p_cost then
    update app_private.rate_limits set tokens = v_tokens - p_cost where user_id = p_user and bucket = p_bucket;
    return 0;
  end if;
  return (p_cost - v_tokens) / p_refill_per_s;
end $$;

-- Strict-unaided attempts (00a B1, doc 11): graded, max_hint_level = 0 and no tutor panel opened for the item
-- before the attempt was submitted. A tutor_threads row is created when the panel is first opened (even if no
-- message is sent), so thread existence is the panel-opened signal. Internal only: not exposed by the API,
-- readable by the service role. Analysis exclusions (analysis_exclusions) are applied by the analysis package.
create or replace view app_private.v_attempts_strict_unaided as
select a.id as attempt_id, a.user_id, a.item_id, a.session_id, a.session_task_id,
       t.skill_key, t.key as template_key, t.version as template_version, t.pool, t.task_kind, t.grader_type,
       coalesce(a.assessment_kind, st.assessment_kind) as assessment_kind,
       (a.grade ->> 'score')::double precision as score,
       (a.grade ->> 'correct')::boolean as correct,
       a.confidence, a.latency_ms, a.active_ms, a.offline, a.server_verified_at, a.submitted_at
  from public.attempts a
  join public.items i on i.id = a.item_id
  join public.item_templates t on t.key = i.template_key and t.version = i.template_version
  left join public.session_tasks st on st.id = a.session_task_id
 where a.grade_status = 'graded'
   and a.max_hint_level = 0
   and a.hints_used = 0
   and not exists (
         select 1 from public.tutor_threads th
          where th.user_id = a.user_id and th.item_id = a.item_id and th.created_at <= a.submitted_at);


-- ---------------------------------------------------------------------
-- 11. Job queue functions (FOR UPDATE SKIP LOCKED); callable by service_role only
-- ---------------------------------------------------------------------
create or replace function public.enqueue_job(
  p_kind text, p_payload jsonb default '{}'::jsonb, p_user_id uuid default null,
  p_dedupe_key text default null, p_priority smallint default 0,
  p_run_after timestamptz default now(), p_max_attempts integer default 5, p_timeout_s integer default 120)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  insert into public.jobs (kind, payload, user_id, dedupe_key, priority, run_after, max_attempts, timeout_s)
  values (p_kind, p_payload, p_user_id, p_dedupe_key, p_priority, p_run_after, p_max_attempts, p_timeout_s)
  on conflict (dedupe_key) where dedupe_key is not null and status in ('queued', 'running') do nothing
  returning id into v_id;
  if v_id is null and p_dedupe_key is not null then
    select id into v_id from public.jobs
      where dedupe_key = p_dedupe_key and status in ('queued', 'running') limit 1;
  else
    perform pg_notify('jobs', p_kind);
  end if;
  return v_id;
end $$;

create or replace function public.claim_jobs(p_worker text, p_kinds text[] default null, p_limit integer default 1)
returns setof public.jobs language plpgsql security definer set search_path = public, pg_temp as $$
begin
  return query
  with candidate as (
    select j.id from public.jobs j
    where j.status = 'queued' and j.run_after <= now()
      and (p_kinds is null or j.kind = any (p_kinds))
    order by j.priority desc, j.run_after, j.created_at
    for update skip locked
    limit greatest(p_limit, 1)
  )
  update public.jobs j
     set status = 'running', locked_at = now(), locked_by = p_worker,
         attempts = j.attempts + 1, updated_at = now()
    from candidate c
   where j.id = c.id
  returning j.*;
end $$;

create or replace function public.complete_job(p_id uuid, p_worker text, p_result jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer;
begin
  update public.jobs
     set status = 'succeeded', result = p_result, error = null, finished_at = now(), updated_at = now(),
         locked_at = null, locked_by = null
   where id = p_id and status = 'running' and locked_by = p_worker;
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- Retry with exponential backoff (5 s * 2^attempts, capped at 15 min) plus jitter, or fail terminally.
create or replace function public.fail_job(p_id uuid, p_worker text, p_error text, p_retryable boolean default true)
returns public.job_status language plpgsql security definer set search_path = public, pg_temp as $$
declare j public.jobs; v_status public.job_status;
begin
  select * into j from public.jobs where id = p_id and status = 'running' and locked_by = p_worker for update;
  if not found then return null; end if;
  if p_retryable and j.attempts < j.max_attempts then
    v_status := 'queued';
    update public.jobs
       set status = 'queued', error = left(p_error, 4000), locked_at = null, locked_by = null, updated_at = now(),
           run_after = now() + make_interval(secs => least(5 * power(2, j.attempts), 900) * (0.8 + random() * 0.4))
     where id = p_id;
  else
    v_status := 'failed';
    update public.jobs
       set status = 'failed', error = left(p_error, 4000), locked_at = null, locked_by = null,
           finished_at = now(), updated_at = now()
     where id = p_id;
  end if;
  return v_status;
end $$;

-- Recover jobs whose worker died: lease expires after 2 * timeout_s + 30 s.
create or replace function public.requeue_stale_jobs()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer;
begin
  update public.jobs
     set status = case when attempts >= max_attempts then 'failed'::public.job_status else 'queued'::public.job_status end,
         error = 'lease expired (worker presumed dead)',
         finished_at = case when attempts >= max_attempts then now() else null end,
         locked_at = null, locked_by = null, updated_at = now(), run_after = now()
   where status = 'running' and locked_at < now() - make_interval(secs => 2 * timeout_s + 30);
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- 12. Other functions: experiments, template admin read, retention
-- ---------------------------------------------------------------------
-- Deterministic, sticky assignment at the level of a unit (00a C). The unit is the caller (unit_type 'user', the
-- default), a skill, a module or a confusable set. The bucket hashes experiment, unit type, unit key and user, so the
-- arm of a unit never changes between calls or releases and differs between experiments. Designs that use external
-- allocation (permuted blocks, matched pairs: design.allocation = 'external') are written by the service role; this
-- function then only returns an existing assignment.
create or replace function public.assign_experiment(
  p_experiment_key text, p_unit_type text default 'user', p_unit_key text default null)
returns public.experiment_arm language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_exp public.experiments;
  v_unit_key text;
  v_arm public.experiment_arm;
begin
  if v_user is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_exp from public.experiments where key = p_experiment_key;
  if not found then raise exception 'unknown experiment %', p_experiment_key using errcode = 'P0002'; end if;
  if p_unit_type not in ('user', 'skill', 'module', 'confusable_set') then
    raise exception 'unknown unit_type %', p_unit_type using errcode = '22023';
  end if;
  v_unit_key := case when p_unit_type = 'user' then v_user::text else p_unit_key end;
  if v_unit_key is null or (p_unit_type = 'user' and p_unit_key is not null and p_unit_key <> v_user::text) then
    raise exception 'invalid unit_key' using errcode = '22023';
  end if;
  if v_exp.design ? 'unit_type' and v_exp.design ->> 'unit_type' <> p_unit_type then
    raise exception 'experiment % assigns by %', p_experiment_key, v_exp.design ->> 'unit_type' using errcode = '22023';
  end if;
  if p_unit_type = 'skill' and not exists (select 1 from public.skills where key = v_unit_key) then
    raise exception 'unknown skill %', v_unit_key using errcode = 'P0002';
  end if;
  if p_unit_type = 'module' and not exists (select 1 from public.modules where key = v_unit_key) then
    raise exception 'unknown module %', v_unit_key using errcode = 'P0002';
  end if;
  -- an existing assignment always wins (sticky), even after the experiment ended
  select arm into v_arm from public.experiment_assignments
   where experiment_key = p_experiment_key and user_id = v_user and unit_type = p_unit_type and unit_key = v_unit_key;
  if found then return v_arm; end if;
  if v_exp.status <> 'running' or v_exp.started_at is null or v_exp.started_at > now()
     or (v_exp.ended_at is not null and v_exp.ended_at <= now()) then
    raise exception 'experiment % is not running', p_experiment_key using errcode = '55000';
  end if;
  if v_exp.design ->> 'allocation' = 'external' then
    raise exception 'experiment % uses external allocation', p_experiment_key using errcode = '55000';
  end if;
  v_arm := case when (abs(hashtextextended(v_user::text || ':' || p_experiment_key || ':' || p_unit_type || ':' || v_unit_key, 0)) % 100)
                      < v_exp.allocation_treatment_pct
                then 'treatment'::public.experiment_arm else 'control'::public.experiment_arm end;
  insert into public.experiment_assignments (experiment_key, user_id, arm, unit_type, unit_key)
  values (p_experiment_key, v_user, v_arm, p_unit_type, v_unit_key)
  on conflict (experiment_key, user_id, unit_type, unit_key) do nothing;
  select arm into v_arm from public.experiment_assignments
   where experiment_key = p_experiment_key and user_id = v_user and unit_type = p_unit_type and unit_key = v_unit_key;
  return v_arm;
end $$;

-- Admin-only read of a template including its body (the body holds solution generators). Latest version when
-- p_version is null.
create or replace function public.admin_get_template(p_key text, p_version integer default null)
returns public.item_templates language plpgsql stable security definer set search_path = public, pg_temp as $$
declare t public.item_templates;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  select * into t from public.item_templates
   where key = p_key and (p_version is null or version = p_version)
   order by version desc limit 1;
  return t;
end $$;

-- Check a nonce code against the challenge of a step (doc 10 section 7.4). Returns {valid, reason, challenge_id}
-- with reason in OK, NONCE_MISSING, NONCE_MISMATCH, NONCE_EXPIRED. A challenge with bound_to is validated against
-- the code and expiry of the challenge it reuses. Does not consume the challenge (that happens on acceptance).
create or replace function app_private.check_challenge_code(
  p_user uuid, p_user_project_id uuid, p_step_key text, p_code text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  c public.evidence_challenges;
  eff public.evidence_challenges;
  norm text;
  expect text;
begin
  norm := regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g');
  if norm like 'PM%' and char_length(norm) = 10 then norm := substr(norm, 3); end if;
  if char_length(norm) = 0 then
    return jsonb_build_object('valid', false, 'reason', 'NONCE_MISSING');
  end if;
  select * into c from public.evidence_challenges
   where user_id = p_user and user_project_id = p_user_project_id and step_key = p_step_key
   order by attempt_no desc limit 1;
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'NONCE_MISMATCH');
  end if;
  eff := c;
  if c.bound_to is not null then
    select * into eff from public.evidence_challenges where id = c.bound_to and user_id = p_user;
    if not found then eff := c; end if;
  end if;
  expect := substr(regexp_replace(eff.code, '[^A-Z0-9]', '', 'g'), 3);
  if norm <> expect then
    return jsonb_build_object('valid', false, 'reason', 'NONCE_MISMATCH', 'challenge_id', c.id);
  end if;
  if eff.expires_at <= now() then
    return jsonb_build_object('valid', false, 'reason', 'NONCE_EXPIRED', 'challenge_id', c.id);
  end if;
  return jsonb_build_object('valid', true, 'reason', 'OK', 'challenge_id', c.id);
end $$;

-- Caller-facing wrapper: always the authenticated user, never a user id from the client.
create or replace function public.verify_challenge_code(p_user_project_id uuid, p_step_key text, p_code text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  return app_private.check_challenge_code(auth.uid(), p_user_project_id, p_step_key, p_code);
end $$;

-- Assessment-pool templates may only be served as assessments, never as ordinary practice (doc 11 section 4).
create or replace function app_private.session_task_pool_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.item_id is not null and new.assessment_kind is null and exists (
       select 1 from public.items i join public.item_templates t on t.key = i.template_key and t.version = i.template_version
        where i.id = new.item_id and t.pool = 'assessment') then
    raise exception 'assessment-pool item cannot be a practice task' using errcode = '23514';
  end if;
  -- FR-060, 00a H4: the service-role session builder bypasses RLS, so the serve gate lives here
  if new.item_id is not null and (tg_op = 'INSERT' or new.item_id is distinct from old.item_id) and not exists (
       select 1 from public.items i join public.item_templates t on t.key = i.template_key and t.version = i.template_version
        where i.id = new.item_id and t.status = 'verified' and i.status = 'verified') and not exists (
       select 1 from public.items i
         join public.sessions s on s.id = new.session_id
         join public.admin_users a on a.user_id = s.user_id
        where i.id = new.item_id and i.status = 'needs_human_review') then
    raise exception 'unverified item cannot be served' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger session_tasks_pool_guard before insert or update of item_id, assessment_kind on public.session_tasks
  for each row execute function app_private.session_task_pool_guard();

-- Retention (defaults; see 04 section 11). Scheduled daily by the prune_expired job (or pg_cron).
create or replace function app_private.prune_expired()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare a integer; b integer; c integer; d integer; e integer;
begin
  delete from public.idempotency_keys where expires_at < now();                       get diagnostics a = row_count;
  delete from public.jobs where status in ('succeeded', 'cancelled') and finished_at < now() - interval '30 days';
                                                                                      get diagnostics b = row_count;
  delete from public.jobs where status = 'failed' and finished_at < now() - interval '90 days';
                                                                                      get diagnostics c = row_count;
  delete from public.events where at < now() - interval '13 months';                  get diagnostics d = row_count;
  delete from public.llm_calls where at < now() - interval '13 months';               get diagnostics e = row_count;
  delete from app_private.rate_limits where updated_at < now() - interval '1 day';
  delete from public.privacy_requests where completed_at < now() - interval '90 days' and kind = 'delete';
  update public.privacy_requests set export_path = null where export_expires_at < now() and export_path is not null;
  return jsonb_build_object('idempotency_keys', a, 'jobs_ok', b, 'jobs_failed', c, 'events', d, 'llm_calls', e);
end $$;

-- Daily LLM spend for one user in millionths of USD (used for budget checks by the app).
create or replace function public.llm_spend_today_micro(p_user uuid)
returns bigint language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(sum(cost_usd_micro), 0)::bigint from public.llm_calls
   where user_id = p_user and at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
$$;

-- ---------------------------------------------------------------------
-- 13. Row Level Security
-- Rule: learners READ only their own rows; learners WRITE only profiles (restricted columns), events,
-- push_subscriptions and item_reports. All other writes use the service role in server code.
-- ---------------------------------------------------------------------
alter table public.cohorts                enable row level security;
alter table public.profiles               enable row level security;
alter table public.admin_users            enable row level security;
alter table public.modules                enable row level security;
alter table public.skills                 enable row level security;
alter table public.skill_edges            enable row level security;
alter table public.item_templates         enable row level security;
alter table public.items                  enable row level security;
alter table public.item_secrets           enable row level security;
alter table public.projects               enable row level security;
alter table public.project_steps          enable row level security;
alter table public.weekly_plans           enable row level security;
alter table public.plan_slots             enable row level security;
alter table public.sessions               enable row level security;
alter table public.session_tasks          enable row level security;
alter table public.attempts               enable row level security;
alter table public.skill_state            enable row level security;
alter table public.review_log             enable row level security;
alter table public.user_projects          enable row level security;
alter table public.project_evidence       enable row level security;
alter table public.evidence_challenges    enable row level security;
alter table public.project_grants         enable row level security;
alter table public.tutor_threads          enable row level security;
alter table public.tutor_messages         enable row level security;
alter table public.experiments            enable row level security;
alter table public.experiment_assignments enable row level security;
alter table public.analysis_exclusions    enable row level security;
alter table public.checkpoints            enable row level security;
alter table public.events                 enable row level security;
alter table public.jobs                   enable row level security;
alter table public.idempotency_keys       enable row level security;
alter table public.content_sync_runs      enable row level security;
alter table public.llm_calls              enable row level security;
alter table public.push_subscriptions     enable row level security;
alter table public.privacy_requests       enable row level security;
alter table public.item_reports           enable row level security;

-- identity
create policy cohorts_select_member on public.cohorts for select to authenticated
  using (public.is_admin() or id = (select p.cohort_id from public.profiles p where p.id = (select auth.uid())));
create policy cohorts_admin_write on public.cohorts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy admin_users_select_self on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

-- content (verified/retired visible to all authenticated; draft and needs_human_review to admin only)
create policy modules_select on public.modules for select to authenticated using (true);
create policy modules_admin_write on public.modules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- stubs are visible so the map can show where other disciplines attach; they are never offered by the builder
create policy skills_select on public.skills for select to authenticated
  using (status in ('stub', 'verified', 'retired') or public.is_admin());
create policy skills_admin_write on public.skills for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy skill_edges_select on public.skill_edges for select to authenticated using (true);
create policy skill_edges_admin_write on public.skill_edges for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy item_templates_select on public.item_templates for select to authenticated
  using (status in ('verified', 'retired') or public.is_admin());

create policy items_select on public.items for select to authenticated
  using (
    public.is_admin()
    or ((user_id = (select auth.uid()) or user_id is null) and status = 'verified')
    or (status = 'retired' and exists (
          select 1 from public.attempts a where a.item_id = items.id and a.user_id = (select auth.uid())))
  );

-- item_secrets: intentionally no policy for authenticated/anon (default deny); service role bypasses RLS.

create policy projects_select on public.projects for select to authenticated
  using (status in ('verified', 'retired') or public.is_admin());
create policy projects_admin_write on public.projects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy project_steps_select on public.project_steps for select to authenticated
  using (status in ('verified', 'retired') or public.is_admin());
create policy project_steps_admin_write on public.project_steps for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- user-owned, read-only for learners
create policy weekly_plans_select_own    on public.weekly_plans    for select to authenticated using (user_id = (select auth.uid()));
create policy plan_slots_select_own      on public.plan_slots      for select to authenticated using (user_id = (select auth.uid()));
create policy evidence_challenges_select_own on public.evidence_challenges for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy project_grants_select_own  on public.project_grants  for select to authenticated using (user_id = (select auth.uid()));
create policy sessions_select_own        on public.sessions        for select to authenticated using (user_id = (select auth.uid()));
create policy session_tasks_select_own   on public.session_tasks   for select to authenticated using (user_id = (select auth.uid()));
create policy attempts_select_own        on public.attempts        for select to authenticated using (user_id = (select auth.uid()));
create policy skill_state_select_own     on public.skill_state     for select to authenticated using (user_id = (select auth.uid()));
create policy review_log_select_own      on public.review_log      for select to authenticated using (user_id = (select auth.uid()));
create policy user_projects_select_own   on public.user_projects   for select to authenticated using (user_id = (select auth.uid()));
create policy project_evidence_select_own on public.project_evidence for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy tutor_threads_select_own   on public.tutor_threads   for select to authenticated using (user_id = (select auth.uid()));
create policy tutor_messages_select_own  on public.tutor_messages  for select to authenticated using (user_id = (select auth.uid()));
create policy checkpoints_select_own     on public.checkpoints     for select to authenticated using (user_id = (select auth.uid()));
create policy privacy_requests_select_own on public.privacy_requests for select to authenticated using (user_id = (select auth.uid()));

-- experiments
create policy experiments_select on public.experiments for select to authenticated using (true);
create policy experiments_admin_write on public.experiments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy experiment_assignments_select_own on public.experiment_assignments for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
-- analysis_exclusions: admin read and insert only (append-only); learners have no policy
create policy analysis_exclusions_admin_select on public.analysis_exclusions for select to authenticated
  using (public.is_admin());
create policy analysis_exclusions_admin_insert on public.analysis_exclusions for insert to authenticated
  with check (public.is_admin() and decided_by = (select auth.uid()));

-- learner-writable
create policy events_select_own on public.events for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy events_insert_own on public.events for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy push_subscriptions_select_own on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_subscriptions_insert_own on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy push_subscriptions_delete_own on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));
create policy item_reports_select_own on public.item_reports for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy item_reports_insert_own on public.item_reports for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'open'
    and (tutor_message_id is null or exists (select 1 from public.tutor_messages m
         where m.id = tutor_message_id and m.user_id = (select auth.uid()))));
create policy item_reports_admin_update on public.item_reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- admin read-only views of infrastructure tables (service role bypasses RLS for writes)
create policy jobs_admin_select on public.jobs for select to authenticated using (public.is_admin());
create policy content_sync_runs_admin_select on public.content_sync_runs for select to authenticated using (public.is_admin());
create policy llm_calls_select_own on public.llm_calls for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
-- idempotency_keys: no policy (service role only).

-- ---------------------------------------------------------------------
-- 14. Privileges (defence in depth beneath RLS)
-- ---------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;

revoke all on all tables in schema public from anon, authenticated;
-- authenticated is named because Supabase grants function EXECUTE to it directly, not through PUBLIC
revoke all on all functions in schema public from anon, authenticated, public;

grant usage on schema public to authenticated, anon;
grant usage on schema app_private to service_role;

-- reads for authenticated users (RLS still filters rows). Tables with hidden columns get column-level grants below.
grant select on public.cohorts, public.profiles, public.admin_users, public.modules, public.skills, public.skill_edges,
  public.sessions, public.session_tasks, public.attempts, public.weekly_plans, public.plan_slots,
  public.skill_state, public.review_log, public.user_projects, public.project_evidence,
  public.evidence_challenges, public.project_grants,
  public.tutor_threads, public.tutor_messages,
  public.checkpoints, public.events, public.push_subscriptions, public.privacy_requests,
  public.item_reports, public.jobs, public.content_sync_runs, public.llm_calls,
  public.analysis_exclusions            -- rows visible only through the admin policy
  to authenticated;

-- Column-level select: solution-bearing, key-bearing and research-blinded columns are never readable by clients.
-- Hidden: item_templates.body/difficulty_est/n_obs/content_hash/retired_*, items.params/verification_report,
-- item_secrets (no grant at all), projects.spec (expected measurements), project_steps.verification_spec
-- (check thresholds and pass criteria), experiments.design/pre_registration/preregistration_ref and
-- experiment_assignments.block_index/rng_seed (allocation internals).
grant select (id, key, skill_key, task_kind, grader_type, difficulty_prior, version, status, phone_suitable,
              est_seconds, license, source, created_at, updated_at,
              tier, pool, interleave, reference_time_s, mastery_eligible)
  on public.item_templates to authenticated;
grant select (id, template_key, seed, rendered, status, difficulty_est, template_version, user_id, created_at)
  on public.items to authenticated;
grant select (id, key, title, ladder_level, tier_gate, est_hours, bom, status, description, license, source,
              created_at, updated_at)
  on public.projects to authenticated;
grant select (id, key, project_key, position, title, est_min, session_type, skill_keys, evidence_required,
              instructions, status, created_at)
  on public.project_steps to authenticated;
grant select (id, key, description, started_at, ended_at, status, allocation_treatment_pct, created_at)
  on public.experiments to authenticated;
grant select (id, experiment_key, user_id, arm, assigned_at, unit_type, unit_key)
  on public.experiment_assignments to authenticated;

-- learner writes
grant update (display_name, timezone, weekly_minutes_target, target_retention, locale, reminder_time_local, settings,
              adult_attested_at, terms_accepted_at, consents, bedtime_local, reminder_prefs, onboarded_at)
  on public.profiles to authenticated;
grant insert on public.events to authenticated;
grant insert, delete on public.push_subscriptions to authenticated;
grant insert (user_id, item_id, reason, note, attempt_id, target_type, tutor_message_id) on public.item_reports to authenticated;

-- admin writes (still gated by is_admin() policies)
grant insert, update, delete on public.cohorts, public.modules, public.skills, public.skill_edges, public.projects,
  public.project_steps, public.experiments to authenticated;
grant update (status, resolved_by, resolved_at) on public.item_reports to authenticated;
grant insert on public.analysis_exclusions to authenticated;

-- service role: full access to tables, and execute on all functions
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- app_private: no access for anon, authenticated or PUBLIC; the service role gets the objects it needs
revoke all on all tables in schema app_private from public, anon, authenticated;
revoke all on all functions in schema app_private from public, anon, authenticated;
grant all on app_private.rate_limits to service_role;
grant select on app_private.v_attempts_strict_unaided to service_role;
grant execute on function app_private.rate_limit_take(uuid, text, double precision, double precision, double precision) to service_role;
grant execute on function app_private.check_challenge_code(uuid, uuid, text, text) to service_role;
grant execute on function app_private.prune_expired() to service_role;

-- functions callable by logged-in users
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_service_role() to authenticated;
grant execute on function public.assign_experiment(text, text, text) to authenticated;
grant execute on function public.admin_get_template(text, integer) to authenticated;
grant execute on function public.verify_challenge_code(uuid, text, text) to authenticated;
grant execute on function public.llm_spend_today_micro(uuid) to service_role;
-- job functions: service role only (the blanket revoke above removed PUBLIC execute)

-- ---------------------------------------------------------------------
-- 15. Storage: private evidence bucket (Supabase storage schema)
-- Path convention: {user_id}/{user_project_id}/{evidence_id}/{filename}
-- Uploads happen only through server-issued signed upload URLs; clients get read access to their own folder.
-- ---------------------------------------------------------------------
-- G14: the 500 MB bucket limit only applies on a plan whose global storage file limit is at least that high.
-- Supabase Free caps every object at 50 MB (verified 31 Oct 2026, docs/00e row 20 and 25): video evidence needs Pro with
-- the global limit raised. On Free, the effective limit is 50 MB whatever this value says; the application enforces the plan cap.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 524288000,
        array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'text/plain', 'text/csv',
              'application/json', 'application/octet-stream'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('exports', 'exports', false, 1073741824)
on conflict (id) do nothing;

create policy evidence_objects_select_own on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy exports_objects_select_own on storage.objects for select to authenticated
  using (bucket_id = 'exports' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- 16. Seed data (idempotent)
-- ---------------------------------------------------------------------
insert into public.cohorts (key, name) values
  ('founder', 'Founder'),
  ('beta-1', 'Beta cohort 1')
on conflict (key) do nothing;
