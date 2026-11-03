// Shared types (doc 03 section 13): generated from the migrated database and from
// polymath-app-spec/schemas/api.openapi.yaml by pnpm gen:db-types and pnpm gen:api-types (BL-0010).
// The *.gen.ts files are never edited by hand; CI regenerates them and fails on a difference.
export const PACKAGE_NAME = "@polymath/shared-types" as const;

export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums } from "./database.gen.ts";
export { Constants } from "./database.gen.ts";
export type { paths, components, operations } from "./api.gen.ts";

import type { components, operations } from "./api.gen.ts";

/** A schema of the OpenAPI document by name. */
export type ApiSchema<Name extends keyof components["schemas"]> = components["schemas"][Name];

/** The JSON request body of an operation, by operationId. */
export type RequestBody<Op extends keyof operations> = operations[Op] extends {
  requestBody: { content: { "application/json": infer Body } };
}
  ? Body
  : operations[Op] extends { requestBody?: { content: { "application/json": infer Body } } }
    ? Body
    : never;

/** The submitAttempt request body (POST /attempts). */
export type SubmitAttemptRequest = RequestBody<"submitAttempt">;
