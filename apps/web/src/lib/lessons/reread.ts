// getSkillLesson (00a M3): re-read the concept primer of a skill the caller has started, from the skill map.
// Read-only by design: no attempt, grade, state, session or event is written (not even lesson_viewed, K10),
// so re-reading never moves scheduling or the first-read analytics.
import { ApiError } from "@/lib/api/errors";
import { json, type ApiContext } from "@/lib/api/route";
import { createLessonStore, type LessonStore } from "@/server/privileged/lesson-store";
import { privilegedDb } from "@/server/privileged/db";
import { toLessonView } from "./view.ts";

const SKILL_KEY = /^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$/;

export type RereadSource = Pick<LessonStore, "newestVerified" | "hasStarted">;

export async function getSkillLesson(ctx: ApiContext, source: RereadSource = createLessonStore(privilegedDb())): Promise<Response> {
  if (!ctx.caller) throw new ApiError("unauthenticated");
  const user = ctx.caller.userId;
  const extra = [...new URL(ctx.request.url).searchParams.keys()][0];
  if (extra !== undefined) throw new ApiError("validation_failed", { errors: [{ field: extra, message: "is not a parameter of this operation" }] });
  const key = ctx.params["skill_key"] ?? "";
  // A skill not started, a skill with no verified lesson and an unknown key all look the same: 404.
  if (!SKILL_KEY.test(key) || !(await source.hasStarted(user, key))) throw new ApiError("not_found");
  const stored = await source.newestVerified(key);
  const lesson = stored ? toLessonView(key, stored.version, stored.body, "full") : null;
  if (!lesson) throw new ApiError("not_found");
  return json(lesson);
}
