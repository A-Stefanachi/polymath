import { defineRoute } from "@/lib/api/route";
import { completeSession } from "@/lib/sessions/sessions";

export const dynamic = "force-dynamic";

// completeSession: closes (or abandons) the session, commits its review units, returns the summary.
export const POST = defineRoute("completeSession", (ctx) => completeSession(ctx));
