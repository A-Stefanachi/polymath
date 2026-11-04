// POST /api/internal/apply-grade: the worker-to-web callback of doc 03 sections 5.3 and 7.2 (BL-0196). It is the
// only write path from the worker into learner state, and the state is still written by the TypeScript domain code
// (applyGradedAttempt, CLAUDE.md rule 2.8). Not an OpenAPI operation: it is internal and carries no user session.
//
// Authentication is the HMAC scheme of services/worker/polymath_worker/hmac_auth.py (signed string
// `timestamp.METHOD.path.body`, 60 s window) with INTERNAL_APPLY_HMAC_SECRET, kept apart from WORKER_HMAC_SECRET.
// A bad signature, a stale timestamp or a missing secret is 401 and changes nothing. A replay inside the window
// is harmless: applying is idempotent through the `state_applied_at` compare-and-set.
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { signRequest } from "@/lib/attempts/symbolic-client";
import { applyGradedAttempt, defaultStateDeps, type StateDeps } from "@/lib/state/apply-attempt.ts";
import { internalApplySecret } from "@/server/privileged/internal-secrets";

export const APPLY_GRADE_PATH = "/api/internal/apply-grade";
export const REPLAY_WINDOW_S = 60;
const MAX_BODY_BYTES = 4096;
const bodySchema = z.object({ attempt_id: z.string().uuid() }).strict();

export type ApplyGradeDeps = {
  secret: string | undefined;
  nowS: () => number;
  state: () => Promise<StateDeps>;
};

const defaultDeps = (): ApplyGradeDeps => ({
  secret: internalApplySecret(),
  nowS: () => Math.floor(Date.now() / 1000),
  state: defaultStateDeps,
});

/** The existing web-side HMAC helper (the worker's `hmac_auth.sign` counterpart), applied to this path. */
export const signApplyRequest = (secret: string, timestamp: string, body: string): string =>
  signRequest(secret, timestamp, APPLY_GRADE_PATH, body);

function validSignature(secret: string | undefined, timestamp: string | null, signature: string | null, body: string, nowS: number): boolean {
  if (!secret || !timestamp || !signature || !/^\d{1,12}$/.test(timestamp)) return false;
  if (Math.abs(nowS - Number(timestamp)) > REPLAY_WINDOW_S) return false;
  const expected = Buffer.from(signApplyRequest(secret, timestamp, body), "utf8");
  const given = Buffer.from(signature, "utf8");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const reply = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export async function applyGradeCallback(request: Request, deps: ApplyGradeDeps = defaultDeps()): Promise<Response> {
  const body = await request.text();
  const ok =
    body.length <= MAX_BODY_BYTES &&
    validSignature(deps.secret, request.headers.get("x-polymath-timestamp"), request.headers.get("x-polymath-signature"), body, deps.nowS());
  if (!ok) return reply(401, { error: { code: "invalid_signature" } });

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(JSON.parse(body));
  } catch {
    return reply(400, { error: { code: "validation_failed" } });
  }
  const result = await applyGradedAttempt(parsed.attempt_id, new Date(deps.nowS() * 1000), await deps.state());
  return reply(200, result.applied ? { applied: true } : { applied: false, reason: result.reason });
}
