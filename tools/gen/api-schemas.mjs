// Builds apps/web/src/lib/api/openapi.gen.ts from schemas/api.openapi.yaml (BL-0022; doc 03
// section 13: "zod from OpenAPI"). The module lists every operation (method, path, auth, body) and
// the JSON Schemas its request body needs; the web app turns them into zod with z.fromJSONSchema,
// so the OpenAPI file stays the single source of truth and nothing is written by hand.
//
// Request bodies are made strict here (ER-7, ST-API-05): an object schema that lists `properties`
// and says nothing about `additionalProperties` gets `additionalProperties: false`, so an unknown
// field such as `user_id` fails validation. Objects directly inside `allOf` are left alone because
// each member only names part of the keys.
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const METHODS = ["get", "post", "put", "patch", "delete"];
const REF_PREFIX = "#/components/schemas/";
const IDEMPOTENCY_REF = "#/components/parameters/IdempotencyKey";

function rewrite(node, inAllOf = false) {
  if (Array.isArray(node)) return node.map((n) => rewrite(n, inAllOf));
  if (node === null || typeof node !== "object") return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === "$ref" && typeof v === "string" && v.startsWith(REF_PREFIX)) {
      out[k] = `#/$defs/${v.slice(REF_PREFIX.length)}`;
    } else if (k === "allOf" && Array.isArray(v)) {
      out[k] = v.map((m) => rewrite(m, true));
    } else if (k === "example" || k === "examples" || k === "discriminator") {
      continue; // documentation only; not constraints
    } else if (k === "properties" || k === "$defs") {
      out[k] = Object.fromEntries(Object.entries(v).map(([name, s]) => [name, rewrite(s)]));
    } else {
      out[k] = rewrite(v);
    }
  }
  if (!inAllOf && out.properties && out.additionalProperties === undefined) out.additionalProperties = false;
  return out;
}

function refsOf(node, into) {
  if (Array.isArray(node)) node.forEach((n) => refsOf(n, into));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "$ref" && typeof v === "string") into.add(v.slice("#/$defs/".length));
      else refsOf(v, into);
    }
  }
}

export function buildApiModule(openapiPath, header) {
  const doc = parse(readFileSync(openapiPath, "utf8"));
  const schemas = doc.components.schemas;
  const operations = {};
  const needed = new Set();
  for (const [path, item] of Object.entries(doc.paths)) {
    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;
      const raw = op.requestBody?.content?.["application/json"]?.schema;
      const body = raw ? rewrite(raw) : null;
      if (body) refsOf(body, needed);
      operations[op.operationId] = {
        method: method.toUpperCase(),
        path,
        // `security: []` on an operation means no credentials (only getHealth).
        public: Array.isArray(op.security) && op.security.length === 0,
        idempotent: (op.parameters ?? []).some((p) => p.$ref === IDEMPOTENCY_REF),
        bodyRequired: Boolean(op.requestBody?.required),
        body,
      };
    }
  }
  // Transitive closure of the definitions the bodies reference.
  const defs = {};
  const queue = [...needed];
  while (queue.length > 0) {
    const name = queue.pop();
    if (name === undefined || name in defs) continue;
    defs[name] = rewrite(schemas[name]);
    const more = new Set();
    refsOf(defs[name], more);
    queue.push(...more);
  }
  const sorted = Object.fromEntries(Object.entries(defs).sort(([a], [b]) => a.localeCompare(b)));
  return (
    `${header}\n` +
    `export type OperationMeta = {\n` +
    `  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";\n` +
    `  /** Path below /api/v1, with {param} placeholders. */\n` +
    `  path: string;\n` +
    `  /** True only for operations that declare \`security: []\`. */\n` +
    `  public: boolean;\n` +
    `  /** The operation lists the Idempotency-Key header. */\n` +
    `  idempotent: boolean;\n` +
    `  bodyRequired: boolean;\n` +
    `  /** Strict JSON Schema of the JSON request body; refs point into SCHEMA_DEFS. */\n` +
    `  body: Record<string, unknown> | null;\n` +
    `};\n\n` +
    `export const OPERATIONS = ${JSON.stringify(operations, null, 2)} as const satisfies Record<string, OperationMeta>;\n\n` +
    `export type OperationId = keyof typeof OPERATIONS;\n\n` +
    `export const SCHEMA_DEFS: Record<string, unknown> = ${JSON.stringify(sorted, null, 2)};\n`
  );
}
