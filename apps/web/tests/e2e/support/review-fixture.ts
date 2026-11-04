import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { localSupabase } from "./local-supabase";

// BL-0057 fixture, inserted into the LOCAL database only (localSupabase refuses any other host): a
// template waiting for review whose `_sync` block carries a given hash and a passed G2 job, two generated
// items with their secrets, and (separately) an admin_users row. Every name is namespaced by a random tag.
export const STEM_REFERENCE = 7.3125;

export type ReviewFixture = {
  templateKey: string;
  itemIds: string[];
  fuzzJobId: string;
  cleanup: () => Promise<void>;
};

export async function createReviewFixture(sha256: string): Promise<ReviewFixture> {
  const sql = postgres(localSupabase().dbUrl, { max: 1, onnotice: () => undefined });
  const tag = randomUUID().slice(0, 8);
  const moduleName = `bl57${tag}`;
  const skillKey = `math.${moduleName}.s1`;
  const templateKey = `tpl.math.bl57-${tag}`;
  const job = (
    await sql<{ id: string }[]>`insert into public.jobs (kind, payload, status, result)
      values ('content_postprocess', ${sql.json({ sync_run_id: randomUUID() })}, 'succeeded', ${sql.json({ passed: true })}) returning id`
  )[0];
  const fuzzJobId = job?.id ?? "";
  await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0057 test', 0)`;
  await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
    values (${skillKey}, 'math', ${moduleName}, 'BL-0057 test', 'L1', 0, 'CC0-1.0', 'bl0057-test', 'stub')`;
  const body = { title: "BL-0057 review fixture", _sync: { sha256, fuzz_job_id: fuzzJobId } };
  await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, content_hash)
    values (${templateKey}, ${skillKey}, 'retrieval', 'exact_numeric', 'needs_human_review', ${sql.json(body)}, 'CC0-1.0', 'bl0057-test', ${sha256})`;
  const itemIds: string[] = [];
  for (const seed of [1, 2]) {
    const rendered = {
      stem_md: `A divider has $R_1 = ${seed}\\,\\mathrm{k\\Omega}$ on top. What is the output voltage?`,
      alt_text: `A divider with R1 of ${seed} kilohms on top; find the output voltage.`,
    };
    const item = (
      await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, params, rendered, verification_report, status)
        values (${templateKey}, 1, ${seed}, ${sql.json({})}, ${sql.json(rendered)}, ${sql.json({ verifier: "closed_form", agreed: true })}, 'needs_human_review') returning id`
    )[0];
    const id = item?.id ?? "";
    itemIds.push(id);
    await sql`insert into public.item_secrets (item_id, answer_key, solution)
      values (${id}, ${sql.json({ grader_type: "exact_numeric", reference: STEM_REFERENCE })}, ${sql.json({ steps: [{ id: "s1", text_md: "Apply the divider rule." }] })})`;
  }
  return {
    templateKey,
    itemIds,
    fuzzJobId,
    cleanup: async () => {
      await sql`delete from public.events where props->>'template_key' = ${templateKey}`;
      await sql`delete from public.items where template_key = ${templateKey}`;
      await sql`delete from public.item_templates where key = ${templateKey}`;
      await sql`delete from public.skills where key = ${skillKey}`;
      await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
      await sql`delete from public.jobs where id = ${fuzzJobId}`;
      await sql.end();
    },
  };
}

export async function withLocalSql<T>(fn: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(localSupabase().dbUrl, { max: 1, onnotice: () => undefined });
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}
