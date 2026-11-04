import { defineRoute } from "@/lib/api/route";
import { getAttempt } from "@/lib/attempts/get-attempt";

export const dynamic = "force-dynamic";

// getAttempt: poll for a queued grade; another user's id is a 404 (ST-API-01).
export const GET = defineRoute("getAttempt", (ctx) => getAttempt(ctx));
