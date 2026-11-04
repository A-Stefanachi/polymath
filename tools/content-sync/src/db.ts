// Database side of content:sync (doc 07 section 10 steps 4 to 6). Connects with
// DATABASE_URL_PRIVILEGED, a server-only secret (doc 03 section 9.1). The connection string is never
// logged or put into an error message.
import postgres from "postgres";

import type { Plan, Existing } from "./plan.ts";

export type Sql = postgres.Sql;
export type RunTrigger = "ci" | "manual" | "local";

export function connect(url: string): Sql {
  return postgres(url, { max: 1, onnotice: () => undefined, connection: { application_name: "polymath-content-sync" } });
}

export async function readExisting(sql: Sql): Promise<Existing> {
  const modules = await sql<{ key: string; title: string; order_index: number; is_stub: boolean }[]>`
    select key, title, order_index, is_stub from public.modules`;
  const skills = await sql<{ key: string; content_hash: string | null; status: string }[]>`
    select key, content_hash, case when retired_at is not null then 'retired' else status::text end as status from public.skills`;
  const edges = await sql<{ from_skill_key: string; to_skill_key: string; strength: string; min_tier: string }[]>`
    select from_skill_key, to_skill_key, strength::text as strength, min_tier::text as min_tier from public.skill_edges`;
  // fuzzPassed: the G2 job recorded for this row finished successfully with result {"passed": true}.
  // console_review_sha256: the hash the review console signed off after a hand-solve with 0 disagreements (BL-0057).
  const templates = await sql<{ key: string; version: number; status: string; sha256: string | null; fuzz_passed: boolean; console_review_sha256: string | null }[]>`
    select t.key, t.version, t.status::text as status, t.body->'_sync'->>'sha256' as sha256,
           case when t.body #>> '{_review,hand_solve}' = 'done' and t.body #>> '{_review,disagreements}' = '0'
                then t.body #>> '{_review,template_sha256}' end as console_review_sha256,
           exists (select 1 from public.jobs j
                    where j.id::text = t.body->'_sync'->>'fuzz_job_id'
                      and j.status = 'succeeded' and j.result->>'passed' = 'true') as fuzz_passed
      from public.item_templates t`;
  const lessons = await sql<{ skill_key: string; version: number; status: string; content_hash: string }[]>`
    select skill_key, version, status::text as status, content_hash from public.skill_lessons`;
  return {
    lessons: lessons.map((l) => ({ skill_key: l.skill_key, version: l.version, status: l.status, hash: l.content_hash })),
    modules: new Map(modules.map((m) => [m.key, { title: m.title, order_index: m.order_index, is_stub: m.is_stub }])),
    skills: new Map(skills.map((r) => [r.key, { content_hash: r.content_hash, status: r.status }])),
    edges: [...edges],
    templates: templates.map((t) => ({ key: t.key, version: t.version, status: t.status, sha256: t.sha256, fuzzPassed: t.fuzz_passed, consoleReviewSha256: t.console_review_sha256 })),
  };
}

/** Of the given skill keys, those that at least one learner holds a skill_state row for (doc 07 section 10). */
export async function skillsHeldByLearners(sql: Sql, keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];
  const rows = await sql<{ skill_key: string }[]>`
    select distinct skill_key from public.skill_state where skill_key in ${sql(keys)} order by skill_key`;
  return rows.map((r) => r.skill_key);
}

export async function startRun(sql: Sql, gitSha: string, gitRef: string | null, trigger: RunTrigger): Promise<string> {
  const rows = await sql<{ id: string }[]>`
    insert into public.content_sync_runs (git_sha, git_ref, trigger) values (${gitSha}, ${gitRef}, ${trigger}) returning id`;
  const id = rows[0]?.id;
  if (!id) throw new Error("content_sync_runs insert returned no id");
  return id;
}

export async function failRun(sql: Sql, runId: string, message: string): Promise<void> {
  const errors = sql.json([{ code: "database_error", message }]);
  await sql`update public.content_sync_runs set status = 'failed', finished_at = now(), errors = ${errors} where id = ${runId}`;
}

export type ApplyContext = { runId: string; gitSha: string; stats: Record<string, unknown> };

/** Writes the plan in one transaction and marks the run succeeded. Returns the job id, if any. */
export async function applyPlan(sql: Sql, plan: Plan, ctx: ApplyContext): Promise<string | null> {
  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('polymath.content_sync'))`;

    for (const { row: m } of plan.modules) {
      await tx`
        insert into public.modules (key, node, module, title, order_index, is_stub)
        values (${m.key}, ${m.node}::public.node_code, ${m.module}, ${m.title}, ${m.order_index}, ${m.is_stub})
        on conflict (key) do update set title = excluded.title, order_index = excluded.order_index,
          is_stub = excluded.is_stub, updated_at = now()`;
    }

    for (const { row: k } of plan.skills.changes) {
      await tx`
        insert into public.skills (key, node, module, title, description, tier_target, est_minutes, license, source,
                                   status, task_kinds, grader_types, phone_suitable, confusable_set, content_hash)
        values (${k.key}, ${k.node}::public.node_code, ${k.module}, ${k.title}, ${k.description},
                ${k.tier_target}::public.tier, ${k.est_minutes}, ${k.license}, ${k.source},
                ${k.status}::public.skill_status, ${tx.array(k.task_kinds)}::text[]::public.task_kind[],
                ${tx.array(k.grader_types)}::text[]::public.grader_type[], ${k.phone_suitable}, ${k.confusable_set}, ${k.content_hash})
        on conflict (key) do update set title = excluded.title, description = excluded.description,
          tier_target = excluded.tier_target, est_minutes = excluded.est_minutes, license = excluded.license,
          source = excluded.source, status = excluded.status, task_kinds = excluded.task_kinds,
          grader_types = excluded.grader_types, phone_suitable = excluded.phone_suitable,
          confusable_set = excluded.confusable_set, content_hash = excluded.content_hash,
          retired_at = null, updated_at = now()`;
    }
    for (const key of plan.skills.retire) {
      // A stub keeps its status: skills_stub_shape allows 'retired' only with a real skill's est_minutes and
      // task kinds. retired_at is what marks the retirement for every row.
      await tx`update public.skills set status = case when status = 'stub' then status else 'retired'::public.skill_status end,
                                         retired_at = now(), updated_at = now() where key = ${key}`;
    }

    // Edges are replaced inside this one transaction (doc 03 section 8.3); the prerequisite graph was
    // checked for cycles before anything was written.
    for (const e of plan.edges.remove) {
      await tx`delete from public.skill_edges where from_skill_key = ${e.from_skill_key} and to_skill_key = ${e.to_skill_key}`;
    }
    for (const e of plan.edges.insert) {
      await tx`
        insert into public.skill_edges (from_skill_key, to_skill_key, strength, min_tier)
        values (${e.from_skill_key}, ${e.to_skill_key}, ${e.strength}::public.edge_strength, ${e.min_tier}::public.tier)`;
    }
    for (const e of plan.edges.update) {
      await tx`
        update public.skill_edges set strength = ${e.strength}::public.edge_strength, min_tier = ${e.min_tier}::public.tier
         where from_skill_key = ${e.from_skill_key} and to_skill_key = ${e.to_skill_key}`;
    }

    // One content_postprocess job per run; it finds its templates by body._sync.fuzz_job_id.
    let jobId: string | null = null;
    if (plan.templates.needsJob.length > 0) {
      const payload = tx.json({ sync_run_id: ctx.runId });
      const rows = await tx<{ id: string }[]>`
        select public.enqueue_job('content_postprocess', ${payload}, null, ${`content_postprocess:${ctx.runId}`}) as id`;
      jobId = rows[0]?.id ?? null;
    }
    const jobKeys = new Set(plan.templates.needsJob);

    for (const { row: t } of plan.templates.changes) {
      const sync: Record<string, unknown> = { sha256: t.content_hash, git_commit: ctx.gitSha, synced_at: new Date().toISOString(), sync_run_id: ctx.runId };
      if (jobId && jobKeys.has(t.key)) sync["fuzz_job_id"] = jobId;
      const body = tx.json({ ...t.body, _sync: sync } as postgres.JSONValue);
      await tx`
        insert into public.item_templates (key, skill_key, task_kind, grader_type, difficulty_prior, version, status, body,
            phone_suitable, est_seconds, license, source, content_hash, tier, pool, interleave, reference_time_s,
            mastery_eligible, retired_at, retired_reason)
        values (${t.key}, ${t.skill_key}, ${t.task_kind}::public.task_kind, ${t.grader_type}::public.grader_type,
            ${t.difficulty_prior}, ${t.version}, ${t.status}::public.content_status, ${body},
            ${t.phone_suitable}, ${t.est_seconds}, ${t.license}, ${t.source}, ${t.content_hash}, ${t.tier}::public.tier,
            ${t.pool}, ${t.interleave}, ${t.reference_time_s}, ${t.mastery_eligible},
            ${t.status === "retired" ? new Date() : null}, ${t.retired_reason})
        on conflict (key, version) do update set
          skill_key = excluded.skill_key, task_kind = excluded.task_kind, grader_type = excluded.grader_type,
          difficulty_prior = excluded.difficulty_prior, status = excluded.status,
          -- A console sign-off (body._review, BL-0057) survives only for the hash it names; any other hash drops it.
          body = case when item_templates.body #>> '{_review,template_sha256}' = excluded.body #>> '{_sync,sha256}'
                      then jsonb_set(
                             jsonb_set(excluded.body, '{_sync,fuzz_job_id}',
                               coalesce(excluded.body #> '{_sync,fuzz_job_id}', item_templates.body #> '{_sync,fuzz_job_id}', 'null'::jsonb)),
                             '{_review}', item_templates.body -> '_review')
                      else jsonb_set(excluded.body, '{_sync,fuzz_job_id}',
                             coalesce(excluded.body #> '{_sync,fuzz_job_id}', item_templates.body #> '{_sync,fuzz_job_id}', 'null'::jsonb))
                 end,
          phone_suitable = excluded.phone_suitable, est_seconds = excluded.est_seconds, license = excluded.license,
          source = excluded.source, content_hash = excluded.content_hash, tier = excluded.tier, pool = excluded.pool,
          interleave = excluded.interleave, reference_time_s = excluded.reference_time_s,
          mastery_eligible = excluded.mastery_eligible,
          retired_at = case when excluded.status = 'retired' then coalesce(item_templates.retired_at, now()) end,
          retired_reason = excluded.retired_reason, updated_at = now()`;
    }
    for (const r of plan.templates.retire) {
      await tx`
        update public.item_templates set status = 'retired', retired_at = now(), retired_reason = ${r.reason}, updated_at = now()
         where key = ${r.key} and version = ${r.version}`;
    }

    // Lessons (00a K9): a new version always waits for review; this tool never writes 'verified'. The skills
    // above are already in this transaction, so the foreign key holds for a skill added in the same run.
    for (const { row: l } of plan.lessons.changes) {
      await tx`
        insert into public.skill_lessons (skill_key, version, status, body, content_hash, license, source)
        values (${l.skill_key}, ${l.version}, ${l.status}::public.content_status, ${tx.json(l.body as postgres.JSONValue)},
                ${l.content_hash}, ${l.license}, ${l.source})`;
    }
    for (const r of plan.lessons.retire) {
      await tx`
        update public.skill_lessons set status = 'retired', retired_at = now()
         where skill_key = ${r.skill_key} and version = ${r.version}`;
    }

    const stats = tx.json({ ...ctx.stats, job_id: jobId } as postgres.JSONValue);
    await tx`
      update public.content_sync_runs set status = 'succeeded', finished_at = now(), stats = ${stats}
       where id = ${ctx.runId}`;
    return jobId;
  });
}
