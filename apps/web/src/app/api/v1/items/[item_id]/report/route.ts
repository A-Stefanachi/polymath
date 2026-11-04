import { defineRoute } from "@/lib/api/route";
import { reportItem } from "@/lib/items/report";

export const dynamic = "force-dynamic";

// reportItem: a learner report; "wrong_answer" quarantines the item at once (FR-066, doc 07 section 8).
export const POST = defineRoute("reportItem", (ctx) => reportItem(ctx));
