// getItem / getTask domain code (BL-0025; FR-060, AR-DM-4, ST-API-04). The route handlers only call these.
//
// Gate (mirrors the database trigger session_task_pool_guard, 00a H4):
//   learner: item.status = verified AND template.status = verified, and the item is the learner's own
//            or a shared pool item; assessment-pool items only through a task with an assessment_kind.
//   admin:   additionally draft and needs_human_review (the founder's review view).
//   nobody:  retired items. Every refusal is a 404, so a status cannot be probed.
// The response is built by an allow-list: only named fields are copied, at every level.
import type { components } from "@polymath/shared-types";
import { ApiError } from "@/lib/api/errors";
import { json, type ApiContext } from "@/lib/api/route";
import { privilegedDb } from "@/server/privileged/db";
import { createServeStore, type ServeItemRow, type ServeStore, type ServeTaskRow } from "@/server/privileged/item-store";
import { createLessonStore, type LessonSource } from "@/server/privileged/lesson-store";
import { toLessonView, type LessonView } from "@/lib/lessons/view";
import { workedStepsFor } from "./worked-steps.ts";

type LearnerItem = components["schemas"]["LearnerItem"];
type SessionTask = components["schemas"]["SessionTask"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADMIN_VISIBLE = ["draft", "needs_human_review"];

const defaultStore = (): ServeStore => createServeStore(privilegedDb());

function userId(ctx: ApiContext): string {
  if (!ctx.caller) throw new ApiError("unauthenticated");
  return ctx.caller.userId;
}

function idParam(ctx: ApiContext, name: string): string {
  const value = ctx.params[name] ?? "";
  if (!UUID.test(value)) throw new ApiError("not_found");
  return value;
}

/** Pure serve rule. `viaAssessmentTask`: the item is reached through a task whose assessment_kind is set. */
export function canServe(item: ServeItemRow, viewer: { userId: string; admin: boolean }, viaAssessmentTask = false): boolean {
  if (item.status === "retired") return false;
  if (viewer.admin && ADMIN_VISIBLE.includes(item.status)) return true;
  if (item.status !== "verified" || item.template_status !== "verified") return false;
  if (viewer.admin) return true; // the founder's review view sees every verified item
  if (item.owner_id !== null && item.owner_id !== viewer.userId) return false;
  if (item.pool === "assessment" && !viaAssessmentTask) return false;
  return true;
}

const text = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Allow-list of `items.rendered`. The stored shape (doc 07, stem_md / options / reading_table) is
 * mapped to the API shape (prompt_md / response_schema, doc 05 LearnerItem); nothing else is copied.
 */
export function toRendered(raw: unknown, graderType: string): LearnerItem["rendered"] {
  const r = isRecord(raw) ? raw : {};
  const rendered: LearnerItem["rendered"] = {
    prompt_md: text(r["prompt_md"]) ?? text(r["stem_md"]) ?? "",
    response_schema: isRecord(r["response_schema"]) ? { ...r["response_schema"] } : { type: graderType },
  };
  const alt = text(r["alt_text"]);
  if (alt !== undefined) rendered.alt_text = alt;
  if (Array.isArray(r["figures"])) {
    rendered.figures = r["figures"].filter(isRecord).flatMap((f) => {
      const type = text(f["type"]);
      const url = text(f["url"]);
      if (!type || url === undefined || !["svg", "png", "schematic", "waveform"].includes(type)) return [];
      const alt = text(f["alt"]);
      return [{ type: type as "svg", url, ...(alt === undefined ? {} : { alt }) }];
    });
  }
  const answerPrompt = text(r["answer_prompt"]);
  if (answerPrompt) rendered["answer_prompt"] = answerPrompt;
  if (Array.isArray(r["reading_table"])) {
    rendered["reading_table"] = r["reading_table"].filter(isRecord).map((row) => ({ label: text(row["label"]) ?? "", text: text(row["text"]) ?? "" }));
  }
  if (Array.isArray(r["options"])) {
    rendered["options"] = r["options"].filter(isRecord).map((o) => ({ id: text(o["id"]) ?? "", text_md: text(o["text_md"]) ?? "" }));
  }
  if (Array.isArray(r["hint_levels_available"])) {
    rendered.hint_levels_available = r["hint_levels_available"].filter((n): n is 1 | 2 | 3 | 4 => n === 1 || n === 2 || n === 3 || n === 4);
  }
  return rendered;
}

export function toLearnerItem(row: ServeItemRow): LearnerItem {
  const item: LearnerItem = {
    id: row.id,
    template_key: row.template_key,
    skill_key: row.skill_key,
    task_kind: row.task_kind as LearnerItem["task_kind"],
    grader_type: row.grader_type as LearnerItem["grader_type"],
    rendered: toRendered(row.rendered, row.grader_type),
    difficulty_est: row.difficulty_est,
    status: row.status as LearnerItem["status"],
  };
  if (row.est_seconds !== null) item.est_seconds = row.est_seconds;
  return item;
}

function toTask(row: ServeTaskRow): SessionTask {
  return {
    id: row.id,
    position: row.position,
    task_kind: row.task_kind as SessionTask["task_kind"],
    skill_key: row.skill_key,
    project_step_key: row.project_step_key,
    item_id: row.item_id,
    status: row.status as SessionTask["status"],
    est_seconds: row.est_seconds,
    reason: row.reason as Exclude<SessionTask["reason"], undefined>,
    assessment_kind: row.assessment_kind as Exclude<SessionTask["assessment_kind"], undefined>,
  };
}

export async function readItem(ctx: ApiContext, store: ServeStore = defaultStore()): Promise<Response> {
  const id = userId(ctx);
  const item = await store.findItem(idParam(ctx, "item_id"));
  if (!item || !canServe(item, { userId: id, admin: await store.isAdmin(id) })) throw new ApiError("not_found");
  return json(toLearnerItem(item));
}

/**
 * 00a K8: the skill's newest verified concept primer on a worked_example task. `full` until the caller has a graded
 * attempt on the skill, then `recap`. Null when the skill has none, or when the stored body is not a usable lesson.
 */
async function lessonFor(userId: string, skillKey: string, source: LessonSource): Promise<LessonView | null> {
  const stored = await source.newestVerified(skillKey);
  if (!stored) return null;
  const variant = (await source.hasGradedAttempt(userId, skillKey)) ? "recap" : "full";
  return toLessonView(skillKey, stored.version, stored.body, variant);
}

export async function readTask(ctx: ApiContext, store: ServeStore = defaultStore(), lessons?: LessonSource): Promise<Response> {
  const id = userId(ctx);
  const task = await store.findTask(id, idParam(ctx, "task_id"));
  const item = task?.item_id ? await store.findItem(task.item_id) : null;
  if (!task || !item || !canServe(item, { userId: id, admin: await store.isAdmin(id) }, task.assessment_kind !== null)) {
    throw new ApiError("not_found");
  }
  // The audit event is written after the gate passed and before the item leaves (SM-06).
  await store.recordShown(id, {
    session_id: task.session_id,
    session_task_id: task.id,
    item_id: item.id,
    task_kind: task.task_kind,
    skill_key: task.skill_key,
    template_key: item.template_key,
    pool: item.pool,
    assessment_kind: task.assessment_kind,
    offline: false,
  });
  const learnerItem = toLearnerItem(item);
  // 00a K2: steps only for the caller's own worked_example / faded_problem task on a practice-pool item.
  if (item.pool === "practice" && task.assessment_kind === null && (task.task_kind === "worked_example" || task.task_kind === "faded_problem")) {
    const faded = task.task_kind === "faded_problem" ? await store.countEarlierFaded(task) : 0;
    const steps = workedStepsFor(await store.findSolution(item.id), task.task_kind, faded);
    if (steps) Object.assign(learnerItem.rendered, steps);
  }
  // The primer rides on the caller's own practice-pool worked_example only, like the steps (00a K8).
  const lesson =
    item.pool === "practice" && task.assessment_kind === null && task.task_kind === "worked_example" && task.skill_key
      ? await lessonFor(id, task.skill_key, lessons ?? createLessonStore(privilegedDb()))
      : null;
  return json({ task: toTask(task), item: learnerItem, ...(lesson ? { lesson } : {}) });
}
