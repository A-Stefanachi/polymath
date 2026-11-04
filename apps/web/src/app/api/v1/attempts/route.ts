import { defineRoute } from "@/lib/api/route";
import { submitAttempt } from "@/lib/attempts/submit";

export const dynamic = "force-dynamic";

// submitAttempt: inline grading of numeric and multiple-choice answers (FR-061).
export const POST = defineRoute("submitAttempt", (ctx) => submitAttempt(ctx));
