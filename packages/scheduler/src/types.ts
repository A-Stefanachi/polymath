// Snapshot types: the scheduler functions take plain data and a time argument, never a clock or a
// database (CLAUDE.md rule 9). Field names follow the vector file and the contract's enums.
import type { Tier } from "./params.ts";

export interface AttemptSnapshot {
  readonly item_id?: string;
  readonly item_tier?: Tier;
  readonly template_key?: string;
  readonly task_kind: string;
  readonly grader_type?: string;
  readonly score: number;
  readonly max_hint_level: number;
  readonly unaided?: boolean;
  readonly submitted_at?: string;
  readonly confidence?: number;
  readonly latency_ms?: number;
  readonly expected_ms?: number;
  readonly template_n_obs?: number;
}

export interface SkillStateSnapshot {
  readonly mastery_state?: string;
  readonly tier_attained?: Tier;
  readonly retrievability?: number;
  readonly elo?: number;
  readonly source?: string;
  readonly placement_age_days?: number;
}

export interface GraphSkill {
  readonly node: string;
  readonly module: string;
  readonly est_minutes: number;
  readonly tier_target: Tier;
  readonly confusable_set?: string;
}

export type EdgeStrength = "hard" | "soft";

export interface GraphEdge {
  readonly from: string;
  readonly to: string;
  readonly strength: EdgeStrength;
  readonly min_tier: Tier | null;
}

export interface SkillGraph {
  readonly skills: Readonly<Record<string, GraphSkill>>;
  readonly edges: readonly GraphEdge[];
}
