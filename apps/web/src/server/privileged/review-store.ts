// Privileged access for the content review console (BL-0057; FR-124, US-031, doc 07 sections 7 (G3) and 10,
// ADR-018). Reads templates waiting for a human and the generated items to hand-solve (answer keys included,
// so this module is admin-only by its callers), and records the reviewer's approval of a template.
//
// Where the approval lives: 00a H4 makes `reference/g3_review.py` the only writer of the file block
// `provenance.review`, and the web app never writes into git. The console therefore records its sign-off in
// the database only, as `item_templates.body._review` (same fields as the file block plus the hand-solve
// result), next to `_sync`. `content:sync` honours it only while `_review.template_sha256` equals the file's
// hash: an edited file has a new hash, so the template returns to `needs_human_review` (doc 07 T9).
import type { Sql } from "./db.ts";

export const CHECKLIST_VERSION = "g3_checklist_v1";

export type QueueTemplate = {
  key: string;
  version: number;
  skill_key: string;
  grader_type: string;
  difficulty_prior: number | null;
  sha256: string | null;
  fuzz_passed: boolean;
  item_count: number;
};

export type TemplateView = {
  key: string;
  version: number;
  status: string;
  skill_key: string;
  grader_type: string;
  sha256: string | null;
  fuzz_passed: boolean;
  review: Record<string, unknown> | null;
};

export type ReviewItem = {
  id: string;
  seed: string;
  status: string;
  rendered: Record<string, unknown>;
  verification_report: Record<string, unknown>;
  answer_key: Record<string, unknown> | null;
  solution: Record<string, unknown> | null;
};

export type ApproveTemplateInput = { key: string; version: number; adminId: string; notes: string | null; now?: Date };
export type ApproveTemplateResult =
  | { kind: "approved"; sha256: string; alreadyVerified: boolean }
  | { kind: "not_found" | "not_reviewable" | "no_hash" | "fuzz_not_passed" };

export type ReviewStore = {
  queue(): Promise<QueueTemplate[]>;
  template(key: string): Promise<TemplateView | null>;
  /** Up to `limit` shared-pool items of the template's version, lowest seeds first, with their secrets. */
  items(key: string, version: number, limit: number): Promise<ReviewItem[]>;
  approveTemplate(input: ApproveTemplateInput): Promise<ApproveTemplateResult>;
};

const FUZZ_PASSED = (db: Sql) => db`exists (select 1 from public.jobs j
  where j.id::text = t.body->'_sync'->>'fuzz_job_id' and j.status = 'succeeded' and j.result->>'passed' = 'true')`;

export function createReviewStore(sql: Sql): ReviewStore {
  const asSql = (tx: unknown) => tx as Sql;
  return {
    queue: async () =>
      sql<QueueTemplate[]>`
        select t.key, t.version, t.skill_key, t.grader_type::text as grader_type, t.difficulty_prior,
               t.body->'_sync'->>'sha256' as sha256, ${FUZZ_PASSED(sql)} as fuzz_passed,
               (select count(*)::int from public.items i
                 where i.template_key = t.key and i.template_version = t.version and i.user_id is null) as item_count
          from public.item_templates t
         where t.status = 'needs_human_review'
         order by t.updated_at, t.key`,

    template: async (key) =>
      (
        await sql<TemplateView[]>`
          select t.key, t.version, t.status::text as status, t.skill_key, t.grader_type::text as grader_type,
                 t.body->'_sync'->>'sha256' as sha256, ${FUZZ_PASSED(sql)} as fuzz_passed, t.body->'_review' as review
            from public.item_templates t where t.key = ${key} order by t.version desc limit 1`
      )[0] ?? null,

    items: (key, version, limit) =>
      sql<ReviewItem[]>`
        select i.id, i.seed::text as seed, i.status::text as status, i.rendered, i.verification_report,
               s.answer_key, s.solution
          from public.items i left join public.item_secrets s on s.item_id = i.id
         where i.template_key = ${key} and i.template_version = ${version} and i.user_id is null
         order by i.seed, i.id limit ${limit}`,

    approveTemplate: (input) =>
      sql.begin(async (t) => {
        const tx = asSql(t);
        const row = (
          await tx<{ status: string; sha256: string | null; fuzz_passed: boolean; review_sha: string | null }[]>`
            select t.status::text as status, t.body->'_sync'->>'sha256' as sha256, ${FUZZ_PASSED(tx)} as fuzz_passed,
                   t.body #>> '{_review,template_sha256}' as review_sha
              from public.item_templates t where t.key = ${input.key} and t.version = ${input.version} for update`
        )[0];
        if (!row) return { kind: "not_found" as const };
        if (row.status === "verified" && row.sha256 !== null && row.review_sha === row.sha256) {
          return { kind: "approved" as const, sha256: row.sha256, alreadyVerified: true };
        }
        if (row.status !== "needs_human_review") return { kind: "not_reviewable" as const };
        if (row.sha256 === null) return { kind: "no_hash" as const };
        // The pipeline's automatic checks come first; a human cannot approve past a failed or missing G2.
        if (!row.fuzz_passed) return { kind: "fuzz_not_passed" as const };
        const review = {
          reviewer: input.adminId,
          date: (input.now ?? new Date()).toISOString(),
          template_sha256: row.sha256,
          checklist_version: CHECKLIST_VERSION,
          hand_solve: "done",
          disagreements: 0,
          notes: input.notes,
          source: "console",
        };
        await tx`update public.item_templates
                    set status = 'verified', body = jsonb_set(body, '{_review}', ${tx.json(review)}), updated_at = now()
                  where key = ${input.key} and version = ${input.version}`;
        return { kind: "approved" as const, sha256: row.sha256, alreadyVerified: false };
      }),
  };
}
