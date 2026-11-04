// Request body reading and validation: a byte cap enforced while streaming (so a lying
// Content-Length cannot get past it), then the strict zod schema built from the OpenAPI file.
import { z } from "zod";
import { ApiError, type FieldError } from "./errors.ts";
import { OPERATIONS, SCHEMA_DEFS, type OperationId } from "./openapi.gen.ts";

/** Default cap for a JSON body (ST-API-12: a 300 KB attempt is refused; attempts allow 256 KB). */
export const MAX_BODY_BYTES = 256 * 1024;

export async function readBodyBytes(request: Request, maxBytes = MAX_BODY_BYTES): Promise<Uint8Array> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new ApiError("payload_too_large");
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ApiError("payload_too_large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

const validators = new Map<OperationId, z.ZodType>();

/** The zod schema of an operation's JSON body, converted once from the generated JSON Schema. */
export function bodySchema(op: OperationId): z.ZodType | null {
  const meta = OPERATIONS[op];
  if (!meta.body) return null;
  let schema = validators.get(op);
  if (!schema) {
    schema = z.fromJSONSchema({ ...meta.body, $defs: SCHEMA_DEFS } as Parameters<typeof z.fromJSONSchema>[0]);
    validators.set(op, schema);
  }
  return schema;
}

function fieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.slice(0, 20).map((i) => ({ field: i.path.join(".") || "(body)", message: i.message }));
}

/** Reads, size-checks, parses and validates the body. Returns undefined for a body-less operation. */
export async function parseBody(request: Request, op: OperationId): Promise<unknown> {
  const schema = bodySchema(op);
  if (!schema) return undefined;
  const bytes = await readBodyBytes(request);
  if (bytes.byteLength === 0) {
    if (OPERATIONS[op].bodyRequired) throw new ApiError("validation_failed", { errors: [{ field: "(body)", message: "a JSON body is required" }] });
    return undefined;
  }
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new ApiError("validation_failed", { errors: [{ field: "(body)", message: "must be valid JSON" }] });
  }
  const result = schema.safeParse(json);
  if (!result.success) throw new ApiError("validation_failed", { errors: fieldErrors(result.error) });
  return result.data;
}
