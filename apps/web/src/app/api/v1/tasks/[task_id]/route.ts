import { defineRoute } from "@/lib/api/route";
import { readTask } from "@/lib/items/serve";

export const dynamic = "force-dynamic";

// getTask: an owned session task with its learner-visible item, behind the serve gate (FR-060).
export const GET = defineRoute("getTask", (ctx) => readTask(ctx));
