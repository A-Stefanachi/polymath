// Server-only secrets read for internal routes (CLAUDE.md rule 2.6: server-only variables are read only under
// src/server/privileged). INTERNAL_APPLY_HMAC_SECRET signs the worker-to-web grade callback (doc 03 sections 7.2
// and 9.1, BL-0196); it is never logged and never reaches a client bundle.
export function internalApplySecret(env: Record<string, string | undefined> = process.env): string | undefined {
  return env["INTERNAL_APPLY_HMAC_SECRET"];
}
