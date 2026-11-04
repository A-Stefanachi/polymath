import { defineRoute } from "@/lib/api/route";
import { getSkill } from "@/lib/graph/graph";

export const dynamic = "force-dynamic";

// getSkill: one skill with prerequisites, dependants, the caller's state and why it is locked (FR-013).
export const GET = defineRoute("getSkill", (ctx) => getSkill(ctx));
