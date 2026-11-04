import { defineRoute } from "@/lib/api/route";
import { listSkills } from "@/lib/graph/graph";

export const dynamic = "force-dynamic";

// listSkills: skills with the caller's own state, paged by key.
export const GET = defineRoute("listSkills", (ctx) => listSkills(ctx));
