// submitAttempt for exact_numeric and multiple_choice items (BL-0026; FR-061, FR-110, ADR-016,
// doc 08 sections 2 and 6). Order: ownership of the session task, the BL-0025 serve gate again,
// answer key through the privileged module, grading-core, one transaction for the attempt and its
// event. Replays of a client_attempt_id return the stored result (ST-API-07, ST-API-08).
//
// skill_state, review_log, Elo and mastery: lib/state/apply-attempt.ts (BL-0042), called after the insert.
// Not here: asynchronous graders (202 path).
// The server grade always wins: `client_grade` is stored for audit and nothing else (ST-API-06).
import {
  gradeExactNumeric,
  gradeMultipleChoice,
  type Grade,
  type NumericSpec,
} from "@polymath/grading-core";
import type { components } from "@polymath/shared-types";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { json, type ApiContext } from "@/lib/api/route";
import { checkEvent } from "@/lib/events/emit.ts";
import { canServe } from "@/lib/items/serve.ts";
import { applyGradedAttempt, defaultStateDeps, type SkillUpdate, type StateDeps } from "@/lib/state/apply-attempt.ts";
import { gradeSymbolicAttempt, SYMBOLIC_GRADER_VERSION } from "@/lib/attempts/symbolic";
import { createSymbolicClient, type SymbolicGrader } from "@/lib/attempts/symbolic-client";
import { createAttemptStore, type AttemptRow, type AttemptStore } from "@/server/privileged/attempt-store";
import { privilegedDb } from "@/server/privileged/db";
import { createServeStore, type ServeStore } from "@/server/privileged/item-store";

type SubmitAttemptRequest = components["schemas"]["SubmitAttemptRequest"];
type AttemptResult = components["schemas"]["AttemptResult"];

export const GRADER_VERSION = "grading-core-ts/1";

/** Answer key shape written by the worker (item_writer.build_answer_key). */
const numericKey = z.object({
  grader_type: z.literal("exact_numeric"),
  answer_spec: z.object({
    kind: z.enum(["numeric", "complex"]),
    unit: z.string().optional(),
    tolerance: z.object({ abs: z.number().optional(), rel: z.number().optional() }),
    bare_number_means: z.string().nullable().optional(),
  }),
  reference: z.union([z.number(), z.object({ re: z.number(), im: z.number() })]),
});
const choiceKey = z.object({
  grader_type: z.literal("multiple_choice"),
  reference: z.object({ correct_option: z.string(), option_ids: z.array(z.string()) }),
});
const answerKey = z.discriminatedUnion("grader_type", [numericKey, choiceKey]);

/** Grader detail keys that may be stored and returned; the reference value is never one of them. */
const SAFE_DETAIL = ["parsed", "unit", "bare_number", "typed_unit", "option_id", "late", "parse_error"];

/** `state` applies a graded attempt to skill_state (BL-0042); tests that do not exercise it omit it. */
type Stores = { serve: ServeStore; attempts: AttemptStore; state?: () => Promise<StateDeps>; symbolic?: SymbolicGrader };
const defaultStores = (): Stores => {
  const sql = privilegedDb();
  return { serve: createServeStore(sql), attempts: createAttemptStore(sql), state: defaultStateDeps, symbolic: createSymbolicClient() };
};

/**
 * Learner-state update after the attempt is stored (06 section 3.3 step 1). Idempotent per attempt, so a
 * replay also calls it: that heals a crash between the insert and this call. A session attempt returns
 * rating null until its review unit commits.
 */
async function applyState(stores: Stores, row: AttemptRow, now: Date): Promise<SkillUpdate | undefined> {
  if (!stores.state || row.grade_status !== "graded") return undefined;
  const result = await applyGradedAttempt(row.id, now, await stores.state());
  return result.applied ? result.skillUpdate : undefined;
}

function bad(field: string, message: string): ApiError {
  return new ApiError("validation_failed", { errors: [{ field, message }] });
}

/** Option ids stored in `items.rendered.options`: the set the learner was shown (doc 08 section 2.3, G3). */
export function shownOptionIds(rendered: unknown): string[] {
  const options = typeof rendered === "object" && rendered !== null ? (rendered as { options?: unknown }).options : undefined;
  if (!Array.isArray(options)) return [];
  return options.flatMap((o: unknown) => {
    const id = typeof o === "object" && o !== null ? (o as { id?: unknown }).id : undefined;
    return typeof id === "string" ? [id] : [];
  });
}

function gradeResponse(body: SubmitAttemptRequest, keyRaw: unknown, graderType: string, shown: string[]): Grade {
  const parsedKey = answerKey.safeParse(keyRaw);
  if (!parsedKey.success || parsedKey.data.grader_type !== graderType) {
    throw new Error("answer key missing or malformed"); // a data fault, mapped to 500 without detail
  }
  const key = parsedKey.data;
  const r = body.response as { kind: string; value?: number; unit?: string; choice_ids?: string[] };
  if (key.grader_type === "exact_numeric") {
    if (r.kind !== "numeric" || typeof r.value !== "number") throw bad("response.kind", "expected a numeric response");
    const text = r.unit ? `${String(r.value)} ${r.unit}` : String(r.value);
    const ref = typeof key.reference === "number" ? key.reference : ([key.reference.re, key.reference.im] as [number, number]);
    const spec = key.answer_spec;
    const numeric: NumericSpec = {
      kind: spec.kind,
      tolerance: {
        ...(spec.tolerance.abs === undefined ? {} : { abs: spec.tolerance.abs }),
        ...(spec.tolerance.rel === undefined ? {} : { rel: spec.tolerance.rel }),
      },
      ...(spec.unit === undefined ? {} : { unit: spec.unit }),
      ...(spec.bare_number_means === undefined ? {} : { bare_number_means: spec.bare_number_means }),
    };
    return gradeExactNumeric(text, numeric, ref);
  }
  if (r.kind !== "choice" || r.choice_ids?.length !== 1) throw bad("response", "expected exactly one choice");
  // Only an option in the rendered item counts as shown; the key's own list is not enough (G3).
  const chosen = r.choice_ids[0] ?? "";
  if (!shown.includes(chosen)) throw bad("response.choice_ids", "that option was not shown for this question");
  const grade = gradeMultipleChoice(chosen, {
    options: key.reference.option_ids.map((id) => ({ id })),
    correct_option_id: key.reference.correct_option,
  });
  // An option that was never shown is a client error and stores no attempt (doc 08 section 2.3).
  if (grade.status === "invalid_input") throw bad("response.choice_ids", "that option was not shown for this question");
  return grade;
}

/** The stored and returned grade (api Grade, 00a D2). Reference values are dropped. */
function toStoredGrade(grade: Grade): Record<string, unknown> {
  const status = grade.status === "invalid_input" ? "invalid_input" : "graded";
  const graded = status === "graded";
  return {
    status,
    score: graded ? grade.score : null,
    correct: graded ? grade.correct : null,
    mastery_eligible: graded,
    graders: grade.graders.map((g) => ({
      type: g.type,
      score: graded ? g.score : 0,
      detail: Object.fromEntries(Object.entries(g.detail).filter(([k]) => SAFE_DETAIL.includes(k))),
    })),
    feedback: grade.feedback,
    misconception_tags: [...grade.misconception_tags],
  };
}

export const toResult = (row: AttemptRow, skillUpdate?: SkillUpdate): AttemptResult => ({
  ...(skillUpdate ? { skill_update: skillUpdate as NonNullable<AttemptResult["skill_update"]> } : {}),
  id: row.id,
  client_attempt_id: row.client_attempt_id,
  item_id: row.item_id,
  grade_status: row.grade_status as AttemptResult["grade_status"],
  grade: row.grade as AttemptResult["grade"],
  hints_used: row.hints_used,
  max_hint_level: row.max_hint_level as AttemptResult["max_hint_level"],
  unaided: row.unaided,
});

export async function submitAttempt(ctx: ApiContext, stores: Stores = defaultStores()): Promise<Response> {
  if (!ctx.caller) throw new ApiError("unauthenticated");
  const userId = ctx.caller.userId;
  const body = ctx.body as SubmitAttemptRequest;

  // Replay: the stored result wins, whatever the new body says.
  const prior = await stores.attempts.findByClientId(userId, body.client_attempt_id);
  if (prior) return respond(stores, prior);

  if (Date.parse(body.submitted_at) < Date.parse(body.started_at)) {
    throw bad("submitted_at", "must not be before started_at");
  }

  // 1. Ownership. Another user's task, or one for a different item or session, is a 404.
  const task = body.session_task_id ? await stores.serve.findTask(userId, body.session_task_id) : null;
  if (body.session_task_id && (!task || task.item_id !== body.item_id)) throw new ApiError("not_found");
  if (task && body.session_id && body.session_id !== task.session_id) throw new ApiError("not_found");
  if (!task && body.session_id && !(await stores.attempts.ownsSession(userId, body.session_id))) throw new ApiError("not_found");

  // 2. The serve gate again: an item that may not be served may not be answered.
  const item = await stores.serve.findItem(body.item_id);
  if (!item || !canServe(item, { userId, admin: await stores.serve.isAdmin(userId) }, (task?.assessment_kind ?? null) !== null)) {
    throw new ApiError("not_found");
  }
  const symbolic = item.grader_type === "symbolic_equivalence";
  if (item.grader_type !== "exact_numeric" && item.grader_type !== "multiple_choice" && !symbolic) {
    throw bad("item_id", "this item is not graded inline yet");
  }

  // 3-4. Key through the privileged module, grade with grading-core, or the worker for symbolic items. A symbolic
  // grade of null means the worker did not answer: the attempt is stored pending with a grade_attempt job (202).
  // Multiple choice is checked against the options actually shown (BL-0055, doc 08 section 2.3).
  const answerKeyRaw = await stores.attempts.loadAnswerKey(item.id);
  const grade: Record<string, unknown> | null = symbolic
    ? await gradeSymbolicAttempt(body.response, answerKeyRaw, stores.symbolic ?? createSymbolicClient())
    : toStoredGrade(gradeResponse(body, answerKeyRaw, item.grader_type, shownOptionIds(item.rendered)));
  const assessmentKind = task?.assessment_kind ?? null;
  const eventProps = {
    item_id: item.id,
    skill_key: task?.skill_key ?? item.skill_key,
    task_kind: item.task_kind,
    correct: grade?.["correct"] ?? null,
    score: grade?.["score"] ?? null,
    latency_ms: body.latency_ms ?? null,
    active_ms: body.active_ms ?? null,
    confidence: body.confidence ?? null,
    hints_used: 0,
    max_hint_level: 0,
    unaided: true,
    assessment_kind: assessmentKind,
  };
  checkEvent("attempt_submitted", { ...eventProps, attempt_id: body.client_attempt_id });

  // 5-6. One transaction: attempts row and attempt_submitted event.
  const { row } = await stores.attempts.insert({
    userId,
    itemId: item.id,
    sessionId: task?.session_id ?? body.session_id ?? null,
    sessionTaskId: task?.id ?? null,
    clientAttemptId: body.client_attempt_id,
    startedAt: body.started_at,
    submittedAt: body.submitted_at,
    response: body.response as Record<string, unknown>,
    grade,
    gradeStatus: grade === null ? "pending" : grade["status"] === "graded" ? "graded" : "invalid_input",
    graderVersion: symbolic ? SYMBOLIC_GRADER_VERSION : GRADER_VERSION,
    latencyMs: body.latency_ms ?? null,
    activeMs: body.active_ms ?? null,
    confidence: body.confidence ?? null,
    offline: body.offline ?? false,
    clientGrade: (body.client_grade as Record<string, unknown> | undefined) ?? null,
    assessmentKind,
    eventProps,
  });
  return respond(stores, row);
}

/** 200 with the grade, or 202 while a queued grade is pending (doc 03 section 7.2; the caller polls getAttempt). */
async function respond(stores: Stores, row: AttemptRow): Promise<Response> {
  if (row.grade_status === "pending") {
    return new Response(JSON.stringify(toResult(row)), {
      status: 202,
      headers: { "Content-Type": "application/json", Location: `/api/v1/attempts/${row.id}`, "Retry-After": "1" },
    });
  }
  return json(toResult(row, await applyState(stores, row, new Date())));
}
