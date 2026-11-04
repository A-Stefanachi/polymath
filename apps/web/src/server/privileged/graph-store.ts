// Read-only privileged access for the graph endpoints (BL-0048; doc 06 section 6, doc 05). One snapshot of
// the content graph plus the caller's own skill_state rows. Only graph fields are selected: no template,
// item, key or verification columns are touched here (CLAUDE.md rule 2.6).
import type { Sql } from "./db.ts";

export type GraphSkillRow = {
  key: string;
  node: string;
  module: string;
  title: string;
  description: string;
  tierTarget: string;
  estMinutes: number;
  license: string;
  source: string;
  status: string;
  taskKinds: string[];
  graderTypes: string[];
  phoneSuitable: boolean;
  confusableSet: string | null;
};

export type GraphEdgeRow = { from: string; to: string; strength: string; minTier: string };

export type GraphStateRow = {
  skillKey: string;
  masteryState: string;
  elo: number;
  stability: number;
  difficulty: number;
  due: Date | null;
  lastReview: Date | null;
  reps: number;
  lapses: number;
  fsrsState: number;
  scheduledDays: number;
  learningSteps: number;
  fsrsExtra: Record<string, unknown>;
  tierAttained: string | null;
  source: string;
  loopStep: string | null;
  firstSeenAt: Date | null;
};

export type GraphSnapshot = { skills: GraphSkillRow[]; edges: GraphEdgeRow[]; states: GraphStateRow[] };

export type GraphStore = { snapshot(userId: string): Promise<GraphSnapshot> };

type Row = Record<string, unknown>;
const str = (v: unknown): string => String(v);
const optStr = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const optDate = (v: unknown): Date | null => (v === null || v === undefined ? null : new Date(v as string | Date));
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export function createGraphStore(sql: Sql): GraphStore {
  return {
    async snapshot(userId) {
      const [skills, edges, states] = await Promise.all([
        sql<Row[]>`
          select key, node::text as node, module, title, description, tier_target::text as tier_target, est_minutes,
                 license, source, status::text as status, task_kinds::text[] as task_kinds,
                 grader_types::text[] as grader_types, phone_suitable, confusable_set
            from public.skills where retired_at is null and status <> 'retired' order by key`,
        sql<Row[]>`
          select e.from_skill_key, e.to_skill_key, e.strength::text as strength, e.min_tier::text as min_tier
            from public.skill_edges e
            join public.skills f on f.key = e.from_skill_key and f.retired_at is null and f.status <> 'retired'
            join public.skills t on t.key = e.to_skill_key and t.retired_at is null and t.status <> 'retired'
           order by e.from_skill_key, e.to_skill_key`,
        sql<Row[]>`
          select skill_key, mastery_state::text as mastery_state, elo, stability, difficulty, due, last_review, reps, lapses,
                 fsrs_state, scheduled_days, learning_steps, fsrs_extra, tier_attained::text as tier_attained, source,
                 loop_step, first_seen_at
            from public.skill_state where user_id = ${userId}`,
      ]);
      return {
        skills: skills.map((r) => ({
          key: str(r["key"]),
          node: str(r["node"]),
          module: str(r["module"]),
          title: str(r["title"]),
          description: str(r["description"]),
          tierTarget: str(r["tier_target"]),
          estMinutes: Number(r["est_minutes"]),
          license: str(r["license"]),
          source: str(r["source"]),
          status: str(r["status"]),
          taskKinds: strs(r["task_kinds"]),
          graderTypes: strs(r["grader_types"]),
          phoneSuitable: r["phone_suitable"] === true,
          confusableSet: optStr(r["confusable_set"]),
        })),
        edges: edges.map((r) => ({
          from: str(r["from_skill_key"]),
          to: str(r["to_skill_key"]),
          strength: str(r["strength"]),
          minTier: str(r["min_tier"]),
        })),
        states: states.map((r) => ({
          skillKey: str(r["skill_key"]),
          masteryState: str(r["mastery_state"]),
          elo: Number(r["elo"]),
          stability: Number(r["stability"]),
          difficulty: Number(r["difficulty"]),
          due: optDate(r["due"]),
          lastReview: optDate(r["last_review"]),
          reps: Number(r["reps"]),
          lapses: Number(r["lapses"]),
          fsrsState: Number(r["fsrs_state"]),
          scheduledDays: Number(r["scheduled_days"]),
          learningSteps: Number(r["learning_steps"]),
          fsrsExtra: (r["fsrs_extra"] ?? {}) as Record<string, unknown>,
          tierAttained: optStr(r["tier_attained"]),
          source: str(r["source"]),
          loopStep: optStr(r["loop_step"]),
          firstSeenAt: optDate(r["first_seen_at"]),
        })),
      };
    },
  };
}
