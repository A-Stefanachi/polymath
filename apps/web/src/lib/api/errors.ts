// The uniform error envelope (api.openapi.yaml `Error`, RFC 9457; doc 03 ER-1). Messages never
// carry request content: a field name and a rule, never the submitted value (CLAUDE.md rule 2.5).
import type { components } from "@polymath/shared-types";

export type ErrorCode = components["schemas"]["Error"]["code"];
export type FieldError = { field: string; message: string };

const STATUS: Partial<Record<ErrorCode, number>> = {
  validation_failed: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  idempotency_key_reuse: 409,
  idempotency_in_progress: 409,
  payload_too_large: 413,
  rate_limited: 429,
  internal: 500,
  worker_unavailable: 503,
};

const TITLE: Partial<Record<ErrorCode, string>> = {
  validation_failed: "Request validation failed",
  unauthenticated: "Authentication required",
  forbidden: "Not allowed",
  not_found: "Not found",
  idempotency_key_reuse: "Idempotency-Key reused with a different request",
  idempotency_in_progress: "A request with this Idempotency-Key is still running",
  payload_too_large: "Request body too large",
  rate_limited: "Too many requests",
  internal: "Internal error",
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryAfterS: number | undefined;
  readonly errors: FieldError[] | undefined;

  constructor(code: ErrorCode, opts: { status?: number; detail?: string; retryAfterS?: number; errors?: FieldError[] } = {}) {
    super(opts.detail ?? TITLE[code] ?? code);
    this.code = code;
    this.status = opts.status ?? STATUS[code] ?? 500;
    this.retryAfterS = opts.retryAfterS;
    this.errors = opts.errors;
  }
}

export function problemResponse(error: ApiError, requestId: string): Response {
  const body: components["schemas"]["Error"] = {
    type: `https://errors.polymath.invalid/${error.code}`,
    title: TITLE[error.code] ?? error.code,
    status: error.status,
    code: error.code,
    request_id: requestId,
    ...(error.message !== TITLE[error.code] ? { detail: error.message } : {}),
    ...(error.retryAfterS !== undefined ? { retry_after_s: error.retryAfterS } : {}),
    ...(error.errors ? { errors: error.errors } : {}),
  };
  const headers = new Headers({ "Content-Type": "application/problem+json", "X-Request-Id": requestId });
  if (error.retryAfterS !== undefined) headers.set("Retry-After", String(error.retryAfterS));
  return new Response(JSON.stringify(body), { status: error.status, headers });
}
