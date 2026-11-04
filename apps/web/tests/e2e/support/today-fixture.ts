import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { localSupabase } from "./local-supabase";

// BL-0059 fixture: one root skill with items of the four kinds a new skill is taught with, owned by the
// learner, inserted into the LOCAL database (localSupabase refuses any other host). Shaped like the
// loop test of BL-0045 (src/lib/sessions/loop.test.ts).
const KINDS = ["worked_example", "faded_problem", "retrieval", "problem"];

export type TodayFixture = { skillKey: string; title: string; cleanup: () => Promise<void> };

export async function createTodayFixture(userId: string): Promise<TodayFixture> {
  const sql = postgres(localSupabase().dbUrl, { max: 1, onnotice: () => undefined });
  const tag = randomUUID().slice(0, 8);
  const moduleName = `bl59${tag}`;
  const skillKey = `math.${moduleName}.s1`;
  const title = `Series resistors ${tag}`;
  const tpl = (kind: string) => `tpl.math.bl59-${kind.replaceAll("_", "")}-${tag}`;
  await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0059 test', 0)`;
  await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status, task_kinds, grader_types, phone_suitable)
    values (${skillKey}, 'math', ${moduleName}, ${title}, 'L1', 10, 'CC0-1.0', 'bl0059-test', 'verified',
            ${sql.array(KINDS)}::public.task_kind[], ${sql.array(["exact_numeric"])}::public.grader_type[], true)`;
  let seed = Math.floor(Math.random() * 1e6) * 10;
  for (const kind of KINDS) {
    await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, phone_suitable)
      values (${tpl(kind)}, ${skillKey}, ${kind}, 'exact_numeric', 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0059-test', true)`;
    for (let i = 0; i < 4; i += 1) {
      seed += 1;
      await sql`insert into public.items (template_key, template_version, seed, rendered, verification_report, status, user_id)
        values (${tpl(kind)}, 1, ${seed}, ${sql.json({ stem_md: "q" })}, ${sql.json({ verifier: "x", agreed: true })}, 'verified', ${userId})`;
    }
  }
  return {
    skillKey,
    title,
    cleanup: async () => {
      await sql`delete from public.jobs where user_id = ${userId}`;
      await sql`delete from public.events where user_id = ${userId}`;
      await sql`delete from public.sessions where user_id = ${userId}`;
      await sql`delete from public.items where template_key in ${sql(KINDS.map(tpl))}`;
      await sql`delete from public.item_templates where key in ${sql(KINDS.map(tpl))}`;
      await sql`delete from public.skills where key = ${skillKey}`;
      await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
      await sql.end();
    },
  };
}

/** Sessions of a learner as stored, read with the test connection. */
export async function sessionRows(userId: string): Promise<{ id: string; status: string; context: string; session_type: string; planned_min: number; tasks: number }[]> {
  const sql = postgres(localSupabase().dbUrl, { max: 1, onnotice: () => undefined });
  try {
    return await sql<{ id: string; status: string; context: string; session_type: string; planned_min: number; tasks: number }[]>`
      select s.id, s.status::text as status, s.context::text as context, s.session_type::text as session_type, s.planned_min,
             (select count(*)::int from public.session_tasks t where t.session_id = s.id) as tasks
      from public.sessions s where s.user_id = ${userId} order by s.created_at`;
  } finally {
    await sql.end();
  }
}
