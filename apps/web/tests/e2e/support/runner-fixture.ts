import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { localSupabase } from "./local-supabase";

// BL-0060 fixture, inserted into the LOCAL database (localSupabase refuses any other host). Six learned skills are
// due for review, so the builder plans retrieval tasks of the three inline answer types the runner supports
// (numeric, multiple choice, symbolic); a seventh skill is new, so its session opens with a worked example. Items
// carry answer keys shaped like the worker's item_writer output; only submitAttempt reads them.
export const NUMERIC_REFERENCE = 5;
type Grader = "exact_numeric" | "multiple_choice" | "symbolic_equivalence";
const DUE: Grader[] = ["exact_numeric", "exact_numeric", "exact_numeric", "multiple_choice", "multiple_choice", "symbolic_equivalence"];
const NEW_KINDS: Record<string, Grader> = { worked_example: "exact_numeric", faded_problem: "exact_numeric", retrieval: "multiple_choice", problem: "symbolic_equivalence" };

export type RunnerFixture = { cleanup: () => Promise<void> };

function renderedFor(grader: Grader) {
  if (grader === "multiple_choice")
    return {
      stem_md: "Two $1\\,\\mathrm{k\\Omega}$ resistors are in series. Which statement about the current is true?",
      alt_text: "Two one kilohm resistors in series. Which statement about the current is true?",
      options: [
        { id: "a", text_md: "The same current flows through both" },
        { id: "b", text_md: "The current halves at the second one" },
      ],
    };
  if (grader === "symbolic_equivalence")
    return { stem_md: "Simplify $x + x$ and type the result as an expression in $x$.", alt_text: "Simplify x plus x.", answer_prompt: "Type an expression in x, for example x**2." };
  return {
    stem_md: "A $10\\,\\mathrm{V}$ supply feeds two equal resistors in series. What is the voltage across one?",
    alt_text: "Ten volts across two equal resistors in series. Find the voltage across one.",
    answer_prompt: "Enter the voltage with a unit, for example 2.5 V.",
  };
}

function keyFor(grader: Grader) {
  if (grader === "multiple_choice") return { grader_type: grader, reference: { correct_option: "a", option_ids: ["a", "b"] } };
  if (grader === "symbolic_equivalence") return { grader_type: grader, answer_spec: { variables: ["x"], sample_domain: { x: [0.3, 2.5] } }, reference: "2*x" };
  return { grader_type: grader, answer_spec: { kind: "numeric", unit: "V", tolerance: { rel: 0.01 } }, reference: NUMERIC_REFERENCE };
}

/** `onlyNewSkill`: no reviews are due, so the session is the first step of a new skill's loop (a worked example). */
export async function createRunnerFixture(userId: string, onlyNewSkill = false): Promise<RunnerFixture> {
  const sql = postgres(localSupabase().dbUrl, { max: 1, onnotice: () => undefined });
  const tag = randomUUID().slice(0, 8);
  const moduleName = `bl60${tag}`;
  const templates: string[] = [];
  const skills: string[] = [];
  let seed = Math.floor(Math.random() * 1e6) * 100;
  await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'BL-0060 test', 0)`;

  async function addSkill(n: number, kinds: Record<string, Grader>, due: boolean) {
    const skillKey = `math.${moduleName}.s${n}`;
    skills.push(skillKey);
    await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status, task_kinds, grader_types, phone_suitable)
      values (${skillKey}, 'math', ${moduleName}, ${`Series resistors ${n} ${tag}`}, 'L1', 10, 'CC0-1.0', 'bl0060-test', 'verified',
              ${sql.array([...new Set(["worked_example", "retrieval", ...Object.keys(kinds)])])}::public.task_kind[], ${sql.array([...new Set(Object.values(kinds))])}::public.grader_type[], true)`;
    for (const [kind, grader] of Object.entries(kinds)) {
      const key = `tpl.math.bl60-s${n}-${kind.replaceAll("_", "")}-${tag}`;
      templates.push(key);
      await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source, phone_suitable)
        values (${key}, ${skillKey}, ${kind}, ${grader}::public.grader_type, 'verified', ${sql.json({})}, 'CC0-1.0', 'bl0060-test', true)`;
      for (let i = 0; i < 4; i += 1) {
        seed += 1;
        const item = (
          await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, rendered, verification_report, status, user_id)
            values (${key}, 1, ${seed}, ${sql.json(renderedFor(grader))}, ${sql.json({ verifier: "x", agreed: true })}, 'verified', ${userId}) returning id`
        )[0];
        await sql`insert into public.item_secrets (item_id, answer_key) values (${item?.id ?? ""}, ${sql.json(keyFor(grader))})`;
      }
    }
    if (due) {
      await sql`insert into public.skill_state (user_id, skill_key, mastery_state, stability, difficulty, due, last_review, reps, fsrs_state, elapsed_days, scheduled_days, first_seen_at, loop_step)
        values (${userId}, ${skillKey}, 'reviewing', 5, 5, now() - interval '1 day', now() - interval '6 days', 3, 2, 6, 5, now() - interval '20 days', 'done')`;
    }
  }

  if (!onlyNewSkill) for (const [i, grader] of DUE.entries()) await addSkill(i + 1, { retrieval: grader }, true);
  await addSkill(DUE.length + 1, NEW_KINDS, false);

  return {
    cleanup: async () => {
      await sql`delete from public.jobs where user_id = ${userId}`;
      await sql`delete from public.events where user_id = ${userId}`;
      await sql`delete from public.attempts where user_id = ${userId}`;
      await sql`delete from public.sessions where user_id = ${userId}`;
      await sql`delete from public.review_log where user_id = ${userId}`;
      await sql`delete from public.skill_state where user_id = ${userId}`;
      await sql`delete from public.item_reports where user_id = ${userId}`;
      await sql`delete from public.items where template_key in ${sql(templates)}`;
      await sql`delete from public.item_templates where key in ${sql(templates)}`;
      await sql`delete from public.skills where key in ${sql(skills)}`;
      await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
      await sql.end();
    },
  };
}

export type AttemptCounts = { attempts: number; correct: number; tasksDone: number; sessionStatus: string };

/** Counts straight from the tables, for the SQL cross-check of the summary numbers. */
export async function sessionCounts(sessionId: string): Promise<AttemptCounts> {
  const sql = postgres(localSupabase().dbUrl, { max: 1, onnotice: () => undefined });
  try {
    const rows = await sql<{ attempts: number; correct: number; done: number; status: string }[]>`
      select (select count(*)::int from public.attempts where session_id = ${sessionId}) as attempts,
             (select count(*)::int from public.attempts where session_id = ${sessionId} and (grade->>'correct')::boolean) as correct,
             (select count(*)::int from public.session_tasks where session_id = ${sessionId} and status = 'done') as done,
             (select status::text from public.sessions where id = ${sessionId}) as status`;
    const r = rows[0];
    return { attempts: r?.attempts ?? -1, correct: r?.correct ?? -1, tasksDone: r?.done ?? -1, sessionStatus: r?.status ?? "" };
  } finally {
    await sql.end();
  }
}

/** Stores a symbolic grade the way the worker does before its callback: the attempt row gets the grade and the status. */
export async function applyWorkerGrade(userId: string, correct: boolean): Promise<number> {
  const sql = postgres(localSupabase().dbUrl, { max: 1, onnotice: () => undefined });
  try {
    const grade = {
      status: "graded",
      score: correct ? 1 : 0,
      correct,
      mastery_eligible: true,
      graders: [{ type: "symbolic_equivalence", score: correct ? 1 : 0, detail: { method: "symbolic" } }],
      feedback: correct ? "Correct." : "Not quite.",
      misconception_tags: [],
    };
    const rows = await sql`update public.attempts set grade = ${sql.json(grade)}, grade_status = 'graded'
      where user_id = ${userId} and grade_status = 'pending' returning id`;
    return rows.length;
  } finally {
    await sql.end();
  }
}
