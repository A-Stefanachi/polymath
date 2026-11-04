import { defineRoute } from "@/lib/api/route";
import { resolveItemReport } from "@/lib/items/report";

export const dynamic = "force-dynamic";

// resolveItemReport: admin confirms or dismisses a report, optionally retiring the item.
export const POST = defineRoute("resolveItemReport", (ctx) => resolveItemReport(ctx));
