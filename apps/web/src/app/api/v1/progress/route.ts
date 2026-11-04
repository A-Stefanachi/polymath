import { defineRoute } from "@/lib/api/route";
import { getProgress } from "@/lib/progress/progress";

export const dynamic = "force-dynamic";

// getProgress: aggregated counts for screen S15, from the caller's own rows only (BL-0190).
export const GET = defineRoute("getProgress", (ctx) => getProgress(ctx));
