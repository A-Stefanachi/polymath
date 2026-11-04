import { defineRoute } from "@/lib/api/route";
import { buildSession } from "@/lib/sessions/sessions";

export const dynamic = "force-dynamic";

// buildSession: runs the session builder and persists a planned session (FR-020, doc 06 section 7).
export const POST = defineRoute("buildSession", (ctx) => buildSession(ctx));
