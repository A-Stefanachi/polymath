import { defineRoute } from "@/lib/api/route";
import { acceptEvents } from "@/lib/events/post-events";

export const dynamic = "force-dynamic";

// postEvents: a batch of client analytics events (doc 11 section 9).
export const POST = defineRoute("postEvents", (ctx) => acceptEvents(ctx));
