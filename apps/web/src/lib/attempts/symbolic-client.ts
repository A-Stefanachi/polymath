// Client of the worker's POST /grade/symbolic (BL-0054; doc 03 section 5.2 step 4, doc 08 section 2.2, 00a I2).
// Server-side only: it signs with WORKER_HMAC_SECRET (headers and signed string as in
// services/worker/polymath_worker/hmac_auth.py). It sends the learner's expression and the answer key to the
// worker and receives the grade; it never logs either. Any failure (no WORKER_URL, timeout, non-200, malformed
// reply) returns null and the caller queues the attempt instead (doc 03 section 7.2).
import { createHmac } from "node:crypto";
import { z } from "zod";

export const SYMBOLIC_PATH = "/grade/symbolic";
/** Doc 03 section 5.2: the client timeout for the synchronous call. */
export const SYMBOLIC_TIMEOUT_MS = 1500;

export type SymbolicSpec = {
  variables: string[];
  sample_domain: Record<string, [number, number]>;
  forbid_functions?: string[];
  form?: string;
  numeric_rel_tol?: number;
};
export type SymbolicRequest = { responseText: string; reference: string; spec: SymbolicSpec };

/** The worker's grade. `detail` keys are filtered by the caller before anything is stored or returned. */
const workerGrade = z.object({
  status: z.enum(["graded", "invalid_input"]),
  score: z.number().min(0).max(1),
  correct: z.boolean(),
  graders: z.array(z.object({ type: z.literal("symbolic_equivalence"), score: z.number(), detail: z.record(z.string(), z.unknown()) })),
  feedback: z.string(),
  misconception_tags: z.array(z.string()),
});
export type SymbolicWorkerGrade = z.infer<typeof workerGrade>;

/** Reads WORKER_URL and WORKER_HMAC_SECRET (doc 03 section 9.1). */
export type WorkerEnv = Record<string, string | undefined>;

/** The grading call, replaceable in tests. Resolves null when the worker cannot answer. */
export type SymbolicGrader = (req: SymbolicRequest) => Promise<SymbolicWorkerGrade | null>;

export function signRequest(secret: string, timestamp: string, path: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.POST.${path}.${body}`, "utf8").digest("hex");
}

export function createSymbolicClient(
  env: WorkerEnv = process.env,
  fetchImpl: typeof fetch = fetch,
  nowS: () => number = () => Math.floor(Date.now() / 1000),
): SymbolicGrader {
  return async (req) => {
    const base = env.WORKER_URL;
    const secret = env.WORKER_HMAC_SECRET;
    if (!base || !secret) return null; // queue-only mode (00a I2)
    const body = JSON.stringify({ response_text: req.responseText, reference: req.reference, spec: req.spec });
    const timestamp = String(nowS());
    try {
      const res = await fetchImpl(new URL(SYMBOLIC_PATH, base), {
        method: "POST",
        body,
        headers: {
          "Content-Type": "application/json",
          "X-Polymath-Timestamp": timestamp,
          "X-Polymath-Signature": signRequest(secret, timestamp, SYMBOLIC_PATH, body),
        },
        signal: AbortSignal.timeout(SYMBOLIC_TIMEOUT_MS),
      });
      if (res.status !== 200) return null;
      const parsed = workerGrade.safeParse(await res.json());
      return parsed.success ? parsed.data : null;
    } catch {
      return null; // timeout, connection error or unreadable body: no detail, it could echo the request
    }
  };
}
