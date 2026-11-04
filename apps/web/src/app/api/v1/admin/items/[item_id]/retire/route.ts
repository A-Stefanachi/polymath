import { defineRoute } from "@/lib/api/route";
import { retireItem } from "@/lib/items/report";

export const dynamic = "force-dynamic";

// retireItem: admin only (ST-API-10); the domain code checks admin_users.
export const POST = defineRoute("retireItem", (ctx) => retireItem(ctx));
