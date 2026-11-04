import { defineRoute } from "@/lib/api/route";
import { listSessions } from "@/lib/sessions/sessions";

export const dynamic = "force-dynamic";

// listSessions: the caller's recent sessions, newest first.
export const GET = defineRoute("listSessions", (ctx) => listSessions(ctx));
