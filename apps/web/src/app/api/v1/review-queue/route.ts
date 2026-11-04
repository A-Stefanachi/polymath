import { defineRoute } from "@/lib/api/route";
import { getReviewQueue } from "@/lib/graph/graph";

export const dynamic = "force-dynamic";

// getReviewQueue: due and upcoming FSRS reviews, most overdue first.
export const GET = defineRoute("getReviewQueue", (ctx) => getReviewQueue(ctx));
