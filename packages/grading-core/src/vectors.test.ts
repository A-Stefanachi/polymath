// The shared vectors (doc 08 section 4.1, AC: all numeric and complex vectors pass, none skipped).
// The test reads the file; the package does not. The Python reference runs the same file in
// polymath-app-spec/reference/verifiers/tests/test_grader_vectors.py.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gradeExactNumeric, type Complex, type NumericSpec } from "./index.ts";

interface VectorCase {
  readonly input: string;
  readonly correct: boolean;
  readonly invalid?: boolean;
}

interface VectorSection {
  readonly spec: NumericSpec;
  readonly reference: number | Complex;
  readonly cases: readonly VectorCase[];
}

const file = new URL("../../../polymath-app-spec/reference/verifiers/tests/grader_vectors.json", import.meta.url);
const vectors = JSON.parse(readFileSync(file, "utf8")) as Record<"numeric" | "complex", VectorSection>;

describe.each([
  ["numeric", 13],
  ["complex", 5],
] as const)("grader_vectors.json %s section", (section, expectedCount) => {
  const { spec, reference, cases } = vectors[section];

  it(`has the ${expectedCount} vectors the specification counts`, () => {
    expect(cases).toHaveLength(expectedCount);
  });

  it.each(cases.map((c) => [c.input, c] as const))("grades %j as the reference does", (_input, c) => {
    const grade = gradeExactNumeric(c.input, spec, reference);
    const detail = grade.graders[0]?.detail ?? {};
    expect(grade.correct).toBe(c.correct);
    expect("parse_error" in detail).toBe(c.invalid === true);
    expect(grade.score).toBe(c.correct ? 1 : 0);
    // Invalid input keeps the 0/false shape and carries the status the caller maps (00a D2).
    expect(grade.status).toBe(c.invalid === true ? "invalid_input" : undefined);
  });
});
