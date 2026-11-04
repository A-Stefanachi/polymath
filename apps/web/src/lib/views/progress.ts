// View model of the progress screen (S15, doc 09). Pure: every figure is read or composed from the counts of
// getProgress; the only arithmetic here is the percentage of the two gap-line comparisons (00a J8) and the
// choice of the next competence artifact.
import type { components } from "@polymath/shared-types";
import { lists, progressScreen as t } from "@/copy/strings";
import { nodeName, projectName } from "@/lib/views/names";

type Progress = components["schemas"]["Progress"];
type NodeProgress = components["schemas"]["NodeProgress"];

export type NextArtifact = { heading: string; remaining: string[] };

/** Node to work towards: the one nearest working level among those that have skills in scope. Ties go to the lower code. */
function nextNode(nodes: readonly NodeProgress[]): NodeProgress | undefined {
  const open = nodes.filter((n) => n.l1_scope_skills > 0 && !n.l1_working);
  // Share compared by cross-multiplication (no division, no rounding).
  return open.sort((a, b) => b.l1_scope_at_l1 * a.l1_scope_skills - a.l1_scope_at_l1 * b.l1_scope_skills || (a.node < b.node ? -1 : 1))[0];
}

export function nextArtifact(p: Progress): NextArtifact {
  const node = nextNode(p.nodes);
  if (!node) {
    const anyScope = p.nodes.some((n) => n.l1_scope_skills > 0);
    return anyScope ? { heading: t.allWorking, remaining: [] } : { heading: t.nextArtifactNone, remaining: [] };
  }
  const gate = node.l1_gate_project;
  let heading = t.nextArtifactAreas(nodeName(node.node), node.l1_scope_at_l1, node.l1_scope_skills);
  const remaining = [t.remainingSkills(node.l1_scope_skills - node.l1_scope_at_l1)];
  if (gate) {
    const name = projectName(gate.project_key);
    heading += `; ${gate.evidence_accepted === 0 ? t.nextArtifactProjectNoEvidence(name) : t.nextArtifactProject(name, gate.evidence_accepted, gate.evidence_required)}`;
    if (gate.evidence_required > gate.evidence_accepted) remaining.push(t.remainingEvidence(gate.evidence_required - gate.evidence_accepted));
    remaining.push(t.remainingSteps(gate.steps_done, gate.steps_total));
  }
  return { heading, remaining };
}

/** Whole percentage of a count pair, for the gap line only. */
export function percentOf(c: { correct: number; total: number }): number {
  return c.total === 0 ? 0 : Math.round((100 * c.correct) / c.total);
}

/** True when nothing has happened yet: all skills unseen, no minutes, no unaided check, no project. */
export function isEmpty(p: Progress): boolean {
  const s = p.totals.by_mastery_state;
  return s.unseen === p.totals.skills && p.week.history.every((w) => w.minutes_done === 0) && p.checkpoints.completed_count === 0 && p.projects.length === 0;
}

export type StateRow = { label: string; count: number; sub?: true };

export function stateRows(p: Progress): StateRow[] {
  const c = p.totals.by_mastery_state;
  const rows: StateRow[] = [
    { label: lists.stateMastered, count: c.mastered },
    { label: lists.stateReviewing, count: c.reviewing },
  ];
  if (p.totals.needs_applied > 0) rows.push({ label: t.appliedSubRow, count: p.totals.needs_applied, sub: true });
  rows.push(
    { label: lists.stateLearning, count: c.learning },
    { label: lists.stateRefresher, count: c.decayed },
    { label: lists.stateNotStarted, count: c.unseen },
  );
  return rows;
}
