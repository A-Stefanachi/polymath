import { defineRoute } from "@/lib/api/route";
import { listItemReports } from "@/lib/items/report";

export const dynamic = "force-dynamic";

// listItemReports: the admin triage queue (00a D5).
export const GET = defineRoute("listItemReports", (ctx) => listItemReports(ctx));
