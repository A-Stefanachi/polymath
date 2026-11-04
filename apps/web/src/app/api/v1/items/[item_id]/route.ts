import { defineRoute } from "@/lib/api/route";
import { readItem } from "@/lib/items/serve";

export const dynamic = "force-dynamic";

// getItem: the learner-visible projection of one item, behind the serve gate (FR-060).
export const GET = defineRoute("getItem", (ctx) => readItem(ctx));
