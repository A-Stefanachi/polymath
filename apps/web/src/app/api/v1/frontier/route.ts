import { defineRoute } from "@/lib/api/route";
import { getFrontier } from "@/lib/graph/graph";

export const dynamic = "force-dynamic";

// getFrontier: skills available now (contract 7.1) and those in progress.
export const GET = defineRoute("getFrontier", (ctx) => getFrontier(ctx));
