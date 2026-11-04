import { defineRoute } from "@/lib/api/route";
import { completeTask } from "@/lib/tasks/complete";

export const dynamic = "force-dynamic";

// completeTask: closes a worked example (or skips a task) that has no graded attempt (00a J9).
export const POST = defineRoute("completeTask", (ctx) => completeTask(ctx));
