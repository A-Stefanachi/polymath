// BL-0010: the generated types are exported and usable. Type-level assertions fail `tsc`
// (pnpm -w typecheck), and the runtime checks fail Vitest.
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  Constants,
  type ApiSchema,
  type Database,
  type SubmitAttemptRequest,
  type Tables,
} from "./index.ts";

describe("generated shared types", () => {
  it("acceptance 2: exports a type for the submitAttempt request body (operationId)", () => {
    expectTypeOf<SubmitAttemptRequest>().toEqualTypeOf<ApiSchema<"SubmitAttemptRequest">>();
    expectTypeOf<SubmitAttemptRequest>().not.toBeNever();
    expectTypeOf<SubmitAttemptRequest>().toHaveProperty("client_attempt_id");
  });

  it("exports the database row types of the baseline schema", () => {
    expectTypeOf<Tables<"attempts">>().toHaveProperty("user_id");
    expectTypeOf<Database["public"]["Tables"]["skill_state"]["Row"]>().toHaveProperty("skill_key");
  });

  it("exports the contract enums with their exact spellings (contract section 5)", () => {
    expect(Constants.public.Enums.session_type).toEqual(["micro", "focus", "lab"]);
    expect(Constants.public.Enums.mastery_state).toEqual(["unseen", "learning", "reviewing", "mastered", "decayed"]);
  });
});
