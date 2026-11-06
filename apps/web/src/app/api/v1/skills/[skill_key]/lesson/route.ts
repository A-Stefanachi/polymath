import { defineRoute } from "@/lib/api/route";
import { getSkillLesson } from "@/lib/lessons/reread";

export const dynamic = "force-dynamic";

// getSkillLesson: re-read the concept primer of a skill the caller has started (00a M3). Read-only.
export const GET = defineRoute("getSkillLesson", (ctx) => getSkillLesson(ctx));
