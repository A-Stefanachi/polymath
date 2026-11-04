// The one wrapper every /api/v1 route handler uses (doc 03 section 4.1 and 13): authenticate,
// rate-limit, size-check and validate the body against the OpenAPI schema, apply the
// Idempotency-Key, run the domain function, map every failure to the error envelope.
// Handlers stay thin: `export const POST = defineRoute("opId", (ctx) => domain(ctx))`.
import { randomUUID } from "node:crypto";
import { logger as defaultLogger, type Logger } from "@/lib/logger";
import { privilegedDb } from "@/server/privileged/db";
import { createIdempotencyStore, type IdempotencyStore } from "@/server/privileged/idempotency-store";
import { createRateLimitStore, type RateLimitStore } from "@/server/privileged/rate-limit-store";
import { authenticate, type Authenticate, type Caller } from "./auth.ts";
import { parseBody } from "./body.ts";
import { ApiError, problemResponse } from "./errors.ts";
import { readIdempotencyKey, withIdempotency } from "./idempotency.ts";
import { OPERATIONS, type OperationId } from "./openapi.gen.ts";
import { BUCKETS, takeRateLimit, type Bucket } from "./rate-limit.ts";

export type ApiDeps = {
  authenticate: Authenticate;
  idempotency: () => IdempotencyStore;
  rateLimit: () => RateLimitStore;
  logger: Logger;
};

export const defaultDeps: ApiDeps = {
  authenticate,
  idempotency: () => createIdempotencyStore(privilegedDb()),
  rateLimit: () => createRateLimitStore(privilegedDb()),
  logger: defaultLogger,
};

export type ApiContext = {
  request: Request;
  requestId: string;
  /** null only for operations that declare `security: []` (getHealth). */
  caller: Caller | null;
  /** The validated JSON body (undefined when the operation has none). */
  body: unknown;
  params: Record<string, string>;
  /** Takes from an extra bucket, for example BUCKETS.tutor; throws `rate_limited`. */
  limit: (bucket: Bucket, cost?: number) => Promise<void>;
};

type NextRouteContext = { params?: Promise<Record<string, string>> };

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export function defineRoute(op: OperationId, run: (ctx: ApiContext) => Promise<Response>, deps: ApiDeps = defaultDeps) {
  const meta = OPERATIONS[op];
  return async (request: Request, routeContext?: NextRouteContext): Promise<Response> => {
    const requestId = `req_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    let response: Response;
    try {
      const caller = meta.public ? null : await deps.authenticate(request);
      const limit = (bucket: Bucket, cost = 1) =>
        caller ? takeRateLimit(deps.rateLimit(), caller.userId, bucket, cost) : Promise.resolve();
      await limit(BUCKETS.api);
      const body = await parseBody(request, op);
      const ctx: ApiContext = { request, requestId, caller, body, params: (await routeContext?.params) ?? {}, limit };
      // A buildSession preview (dry_run, G16) stores nothing, so its Idempotency-Key is ignored, not consumed.
      const preview = op === "buildSession" && (body as { dry_run?: unknown } | undefined)?.dry_run === true;
      const key = caller && meta.idempotent && !preview ? readIdempotencyKey(request) : undefined;
      response =
        caller && key
          ? await withIdempotency(
              deps.idempotency(),
              { userId: caller.userId, key, method: meta.method, path: new URL(request.url).pathname, body, requestId },
              () => run(ctx),
            )
          : await run(ctx);
    } catch (error) {
      if (error instanceof ApiError) {
        response = problemResponse(error, requestId);
      } else {
        deps.logger.error("api.unhandled", { request_id: requestId, operation: op, error });
        response = problemResponse(new ApiError("internal"), requestId);
      }
    }
    response.headers.set("X-Request-Id", requestId);
    deps.logger.info("api.request", { request_id: requestId, operation: op, status: response.status });
    return response;
  };
}
