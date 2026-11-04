// symbolic_equivalence inside submitAttempt (BL-0054; FR-062, doc 03 section 5.2 step 4, doc 08 section 2.2).
// The worker decides correctness (SymPy plus numeric sampling); an LLM never does (CLAUDE.md rule 4). The answer
// key is read through the privileged module by the caller and goes to the worker, never into a response.
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import type { SymbolicGrader, SymbolicSpec, SymbolicWorkerGrade } from "./symbolic-client";

export const SYMBOLIC_GRADER_VERSION = "sympy-worker/1";

/** Answer key written by the worker (item_writer.build_answer_key): the template's answer block and the reference. */
const symbolicKey = z.object({
  grader_type: z.literal("symbolic_equivalence"),
  answer_spec: z.object({
    variables: z.array(z.string()).min(1),
    sample_domain: z.record(z.string(), z.tuple([z.number(), z.number()])),
    forbid_functions: z.array(z.string()).optional(),
    form: z.string().optional(),
    numeric_rel_tol: z.number().optional(),
  }),
  reference: z.string().min(1),
});

/** Grader detail keys that may be stored and returned; the reference is never one of them. */
const SAFE_DETAIL = ["method", "form", "parse_error"];

/** The stored and returned api Grade (00a D2): score and correct are null unless the status is `graded`. */
export function toStoredSymbolicGrade(g: SymbolicWorkerGrade): Record<string, unknown> {
  const graded = g.status === "graded";
  return {
    status: g.status,
    score: graded ? g.score : null,
    correct: graded ? g.correct : null,
    mastery_eligible: graded,
    graders: g.graders.map((x) => ({
      type: x.type,
      score: graded ? x.score : 0,
      detail: Object.fromEntries(Object.entries(x.detail).filter(([k]) => SAFE_DETAIL.includes(k))),
    })),
    feedback: g.feedback,
    misconception_tags: g.misconception_tags,
  };
}

/**
 * Grades a symbolic response with the worker. Returns the stored grade, or null when the worker could not answer
 * in time or at all: the caller then stores the attempt as `pending` and enqueues `grade_attempt` (202).
 */
export async function gradeSymbolicAttempt(
  response: unknown,
  keyRaw: unknown,
  grade: SymbolicGrader,
): Promise<Record<string, unknown> | null> {
  const r = response as { kind?: string; expression?: unknown };
  if (r.kind !== "symbolic" || typeof r.expression !== "string") {
    throw new ApiError("validation_failed", { errors: [{ field: "response.kind", message: "expected a symbolic response" }] });
  }
  const key = symbolicKey.safeParse(keyRaw);
  if (!key.success) throw new Error("answer key missing or malformed"); // a data fault, mapped to 500 without detail
  const spec: SymbolicSpec = {
    variables: key.data.answer_spec.variables,
    sample_domain: key.data.answer_spec.sample_domain,
    ...(key.data.answer_spec.forbid_functions === undefined ? {} : { forbid_functions: key.data.answer_spec.forbid_functions }),
    ...(key.data.answer_spec.form === undefined ? {} : { form: key.data.answer_spec.form }),
    ...(key.data.answer_spec.numeric_rel_tol === undefined ? {} : { numeric_rel_tol: key.data.answer_spec.numeric_rel_tol }),
  };
  const graded = await grade({ responseText: r.expression, reference: key.data.reference, spec });
  return graded ? toStoredSymbolicGrade(graded) : null;
}
