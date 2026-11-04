import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { localSupabase } from "./local-supabase";

// BL-0027 fixture. Sessions have no creation route until BL-0044 and the verification pipeline is
// the only real way to a verified item, so the test inserts a template, a verified item with its
// secrets and a session task straight into the LOCAL database (localSupabase refuses any other
// host). Shaped like the worker's voltage-divider output (item_writer / tplkit.generate_item).
export const REFERENCE = 7.3125; // 11.7 V * 5 k / (3 k + 5 k): must never appear on a wrong-answer screen
export const ALT_TEXT = "A supply of 11.7 volts feeds R1 of 3 kilohms in series with R2 of 5 kilohms to ground. The output is the junction between R1 and R2, unloaded. Find the output voltage.";

export type DemoFixture = { itemId: string; sessionId: string; taskId: string; cleanup: () => Promise<void> };

export async function createDemoItem(userId: string): Promise<DemoFixture> {
  const sql = postgres(localSupabase().dbUrl, { max: 1, onnotice: () => undefined });
  const tag = randomUUID().slice(0, 8);
  const moduleName = `bl27${tag}`;
  const skillKey = `math.${moduleName}.s1`;
  const templateKey = `tpl.math.bl27-${tag}`;
  await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0027 test', 0)`;
  await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
    values (${skillKey}, 'math', ${moduleName}, 'BL-0027 test', 'L1', 0, 'CC0-1.0', 'bl0027-test', 'stub')`;
  await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, pool)
    values (${templateKey}, ${skillKey}, 'retrieval', 'exact_numeric', 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0027-test', 'practice')`;
  const rendered = {
    stem_md: "A voltage divider is built from $R_1 = 3\\,\\mathrm{k\\Omega}$ (top) and $R_2 = 5\\,\\mathrm{k\\Omega}$ (bottom). The supply is $V_{in} = 11.7\\,\\mathrm{V}$. What is the output voltage?",
    alt_text: ALT_TEXT,
    answer_prompt: "Enter the voltage with a unit, for example 2.5 V. Three significant figures is enough.",
  };
  const item = (
    await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, params, rendered, verification_report, status)
      values (${templateKey}, 1, ${Math.floor(Math.random() * 1e9)}, ${sql.json({})}, ${sql.json(rendered)}, ${sql.json({ verifier: "x", agreed: true })}, 'verified') returning id`
  )[0];
  const itemId = item?.id ?? "";
  const key = { grader_type: "exact_numeric", answer_spec: { kind: "numeric", unit: "V", tolerance: { rel: 0.01 } }, reference: REFERENCE };
  await sql`insert into public.item_secrets (item_id, answer_key) values (${itemId}, ${sql.json(key)})`;
  const session = (
    await sql<{ id: string }[]>`insert into public.sessions (user_id, session_type, context, planned_min, available_minutes)
      values (${userId}, 'micro', 'desktop', 10, 10) returning id`
  )[0];
  const sessionId = session?.id ?? "";
  const task = (
    await sql<{ id: string }[]>`insert into public.session_tasks (session_id, position, task_kind, skill_key, item_id, user_id)
      values (${sessionId}, 1, 'retrieval', ${skillKey}, ${itemId}, ${userId}) returning id`
  )[0];
  return {
    itemId,
    sessionId,
    taskId: task?.id ?? "",
    cleanup: async () => {
      await sql`delete from public.events where user_id = ${userId}`;
      await sql`delete from public.attempts where user_id = ${userId}`;
      await sql`delete from public.sessions where user_id = ${userId}`;
      await sql`delete from public.items where id = ${itemId}`;
      await sql`delete from public.item_templates where key = ${templateKey}`;
      await sql`delete from public.skills where key = ${skillKey}`;
      await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
      await sql.end();
    },
  };
}

/** Rows of `attempts` for a learner, read with the test connection. */
export async function attemptRows(
  userId: string,
): Promise<{ item_id: string; grade_status: string; correct: boolean | null; confidence: number | null }[]> {
  const sql = postgres(localSupabase().dbUrl, { max: 1, onnotice: () => undefined });
  try {
    return await sql<{ item_id: string; grade_status: string; correct: boolean | null; confidence: number | null }[]>`
      select item_id, grade_status::text as grade_status, (grade->>'correct')::boolean as correct, confidence
      from public.attempts where user_id = ${userId}`;
  } finally {
    await sql.end();
  }
}

export async function eventNames(userId: string): Promise<string[]> {
  const sql = postgres(localSupabase().dbUrl, { max: 1, onnotice: () => undefined });
  try {
    return (await sql<{ name: string }[]>`select name from public.events where user_id = ${userId} order by at`).map((r) => r.name);
  } finally {
    await sql.end();
  }
}
