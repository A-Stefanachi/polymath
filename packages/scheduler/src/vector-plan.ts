// Decides, for every vector, whether the runner executes it, reports it as skipped (function not
// implemented yet) or as pending (feature delivered by a later task). Pure; the test file does the I/O.
import type { VectorCase } from "./vector-registry.ts";

export type VectorStatus = "run" | "skipped" | "pending";

export interface VectorPlan {
  readonly byStatus: Readonly<Record<VectorStatus, readonly VectorCase[]>>;
  /** Number of vectors per function name that are skipped. */
  readonly skippedPerFunction: Readonly<Record<string, number>>;
  /** Configuration problems; the runner test fails when this is not empty. */
  readonly errors: readonly string[];
}

export function planVectors(
  vectors: readonly VectorCase[],
  implemented: readonly string[],
  skipped: Readonly<Record<string, string>>,
  pending: Readonly<Record<string, string>>,
): VectorPlan {
  const errors: string[] = [];
  const impl = new Set(implemented);
  const byStatus: Record<VectorStatus, VectorCase[]> = { run: [], skipped: [], pending: [] };
  const skippedPerFunction: Record<string, number> = {};
  const ids = new Set(vectors.map((v) => v.id));
  const fns = new Set(vectors.map((v) => v.fn));

  if (ids.size !== vectors.length) errors.push("duplicate vector ids in the vector file");
  for (const fn of Object.keys(skipped)) {
    if (impl.has(fn)) errors.push(`function ${fn} is implemented but still on the skip list`);
    else if (!fns.has(fn)) errors.push(`skip list names ${fn}, which no vector uses`);
  }
  for (const id of Object.keys(pending)) {
    if (!ids.has(id)) errors.push(`pending list names unknown vector id ${id}`);
  }

  for (const v of vectors) {
    if (v.id in pending) {
      if (!impl.has(v.fn)) errors.push(`pending vector ${v.id}: function ${v.fn} is not implemented (use the skip list)`);
      byStatus.pending.push(v);
    } else if (impl.has(v.fn)) {
      byStatus.run.push(v);
    } else if (v.fn in skipped) {
      byStatus.skipped.push(v);
      skippedPerFunction[v.fn] = (skippedPerFunction[v.fn] ?? 0) + 1;
    } else {
      errors.push(`vector ${v.id} names function ${v.fn}, which is neither implemented nor on the skip list`);
    }
  }
  return { byStatus, skippedPerFunction, errors };
}
