import { defineRoute } from "@/lib/api/route";
import { readProfile, writeProfile } from "@/lib/profile/profile";

export const dynamic = "force-dynamic";

// getProfile and updateProfile (doc 09 S02, FR-002). The store is scoped to the caller's id.
export const GET = defineRoute("getProfile", (ctx) => readProfile(ctx));
export const PATCH = defineRoute("updateProfile", (ctx) => writeProfile(ctx));
