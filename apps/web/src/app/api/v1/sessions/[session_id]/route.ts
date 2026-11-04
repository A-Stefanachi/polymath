import { defineRoute } from "@/lib/api/route";
import { getSession } from "@/lib/sessions/sessions";

export const dynamic = "force-dynamic";

// getSession: an owned session with its tasks; another user's id is a 404 (ST-API-01).
export const GET = defineRoute("getSession", (ctx) => getSession(ctx));
