import { healthResponse } from "@/lib/api/health";
import { defineRoute } from "@/lib/api/route";

export const dynamic = "force-dynamic";

// getHealth: unauthenticated by contract (`security: []`).
export const GET = defineRoute("getHealth", () => healthResponse());
