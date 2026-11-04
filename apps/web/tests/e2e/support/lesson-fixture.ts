import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { parse } from "yaml";
import { localSupabase } from "./local-supabase";

// BL-0201 and BL-0202 fixture, inserted into the LOCAL database only (localSupabase refuses any other host): a
// throwaway skill and lesson versions whose body is the real sample lesson (content/lessons/elec.dc.ohms-law.yaml,
// read, never copied), so the tests exercise the real figure, checks and mix-up. Names carry a random tag.
const SAMPLE = path.resolve(import.meta.dirname, "../../../../../polymath-app-spec/content/lessons/elec.dc.ohms-law.yaml");

export type LessonBody = {
  skill_key: string;
  screens: { id: string; title: string; body_md: string; figure?: { svg: string; alt: string } }[];
  misconception: { tag: string; wrong_idea_md: string; why_tempting_md: string; correct_idea_md: string };
  checks: { id: string; stem_md: string; options: { id: string; text_md: string; correct: boolean; feedback_md: string }[] }[];
  recap_md: string;
  [key: string]: unknown;
};

/** The sample lesson file as a body for `skillKey`; `edit` may change it before it is stored. */
export function sampleLesson(skillKey: string, edit?: (body: LessonBody) => void): LessonBody {
  const body = parse(readFileSync(SAMPLE, "utf8"), { schema: "core" }) as LessonBody;
  body.skill_key = skillKey;
  edit?.(body);
  return body;
}

export type LessonFixture = {
  skillKey: string;
  moduleKey: string;
  /** Inserts a version; `verified` also sets the reviewer, which the table requires (K9). */
  addVersion: (version: number, status: "needs_human_review" | "verified", reviewer: string | null, edit?: (body: LessonBody) => void) => Promise<void>;
  cleanup: () => Promise<void>;
};

export async function createLessonFixture(): Promise<LessonFixture> {
  const sql = postgres(localSupabase().dbUrl, { max: 1, onnotice: () => undefined });
  const tag = randomUUID().slice(0, 8);
  const moduleName = `bl201${tag}`;
  const moduleKey = `math.${moduleName}`;
  const skillKey = `${moduleKey}.s1`;
  await sql`insert into public.modules (key, node, module, title, order_index) values (${moduleKey}, 'math', ${moduleName}, 'BL-0201 test', 0)`;
  await sql`insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status)
    values (${skillKey}, 'math', ${moduleName}, 'BL-0201 test', 'L1', 0, 'CC0-1.0', 'bl0201-test', 'stub')`;
  return {
    skillKey,
    moduleKey,
    addVersion: async (version, status, reviewer, edit) => {
      const body = sampleLesson(skillKey, edit);
      await sql`insert into public.skill_lessons (skill_key, version, status, body, content_hash, license, source, reviewed_by, reviewed_at)
        values (${skillKey}, ${version}, ${status}::public.content_status, ${sql.json(body as never)}, ${`hash-${tag}-${String(version)}`}, 'original', 'bl0201-test',
                ${status === "verified" ? reviewer : null}, ${status === "verified" ? new Date() : null})`;
    },
    cleanup: async () => {
      await sql`delete from public.events where props->>'skill_key' = ${skillKey}`;
      await sql`delete from public.skill_lessons where skill_key = ${skillKey}`;
      await sql`delete from public.skills where key = ${skillKey}`;
      await sql`delete from public.modules where key = ${moduleKey}`;
      await sql.end();
    },
  };
}
