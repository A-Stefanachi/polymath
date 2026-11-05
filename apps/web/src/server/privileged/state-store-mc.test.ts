// The guessing correction of the Elo update (06 section 5.4) needs the number of options shown. The worker
// stores a multiple-choice key's option_ids as a map (served id -> template option, reference tplkit.py);
// counting only arrays left the correction off for every real item. Integration test, local database;
// skipped without one unless REQUIRE_DB=1.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, dbReachable, deleteTestUser, testSql } from "@/lib/api/test-db";
import { createStateStore } from "./state-store.ts";

const sql = testSql();
const reachable = await dbReachable(sql);
if (process.env["REQUIRE_DB"] === "1" && !reachable) throw new Error("REQUIRE_DB=1 but no database is reachable");

const tag = randomUUID().slice(0, 8);
const moduleName = `mc${tag}`;
const skill = `math.${moduleName}.s1`;
const template = `tpl.math.mc-${tag}`;
let user = "";

async function attemptWith(optionIds: unknown, seed: number): Promise<string> {
  const item = (await sql<{ id: string }[]>`insert into public.items (template_key, template_version, seed, rendered, verification_report, status, user_id)
    values (${template}, 1, ${seed}, ${sql.json({ stem_md: "q" })}, ${sql.json({ verifier: "x", agreed: true })}, 'verified', ${user}) returning id`)[0]?.id ?? "";
  await sql`insert into public.item_secrets (item_id, answer_key) values (${item},
    ${sql.json({ grader_type: "multiple_choice", reference: { correct_option: "a", option_ids: optionIds } } as Parameters<typeof sql.json>[0])})`;
  const grade = { status: "graded", score: 1, correct: true, graders: [], mastery_eligible: true };
  return (await sql<{ id: string }[]>`insert into public.attempts (user_id, item_id, started_at, submitted_at, response, grade, grade_status, graded_at, client_attempt_id)
    values (${user}, ${item}, now() - interval '30 seconds', now(), ${sql.json({ kind: "choice", choice_ids: ["a"] })}, ${sql.json(grade)}, 'graded', now(), ${randomUUID()})
    returning id`)[0]?.id ?? "";
}

describe.skipIf(!reachable)("state store: options counted for the guessing correction (database)", () => {
  beforeAll(async () => {
    user = await createTestUser(sql);
    await sql`insert into public.modules (key, node, module, title, order_index) values (${`math.${moduleName}`}, 'math', ${moduleName}, 'MC test', 0)`;
    await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status, task_kinds, grader_types, phone_suitable)
      values (${skill}, 'math', ${moduleName}, 'MC test', 'L1', 10, 'CC0-1.0', 'mc-test', 'verified',
              ${sql.array(["worked_example", "retrieval", "problem"])}::public.task_kind[], ${sql.array(["multiple_choice"])}::public.grader_type[], true)`;
    await sql`insert into public.item_templates (key, skill_key, task_kind, grader_type, status, body, license, source)
      values (${template}, ${skill}, 'problem', 'multiple_choice', 'verified', ${sql.json({})}, 'CC0-1.0', 'mc-test')`;
  });

  afterAll(async () => {
    await sql`delete from public.attempts where user_id = ${user}`;
    await sql`delete from public.items where template_key = ${template}`;
    await sql`delete from public.item_templates where key = ${template}`;
    await sql`delete from public.skills where key = ${skill}`;
    await sql`delete from public.modules where key = ${`math.${moduleName}`}`;
    await deleteTestUser(sql, user);
    await sql.end();
  });

  it("counts the options of the worker's map shape and of the legacy array shape", async () => {
    const store = createStateStore(sql);
    const now = new Date();
    for (const [ids, seed] of [[{ a: "correct", b: "x", c: "y", d: "z" }, 1], [["a", "b", "c", "d"], 2]] as const) {
      const id = await attemptWith(ids, seed);
      const claim = await store.run((tx) => tx.claim(id, now));
      expect(claim.kind).toBe("claimed");
      expect(claim.kind === "claimed" ? claim.attempt.mcOptions : null).toBe(4);
    }
  });
});
