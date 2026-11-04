import { defineRoute } from "@/lib/api/route";
import { startSession } from "@/lib/sessions/sessions";

export const dynamic = "force-dynamic";

// startSession: planned to active; starting an active session returns it unchanged.
export const POST = defineRoute("startSession", (ctx) => startSession(ctx));
