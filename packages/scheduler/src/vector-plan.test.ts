import { describe, expect, it } from "vitest";
import { planVectors } from "./vector-plan.ts";
import type { VectorCase } from "./vector-registry.ts";

const v = (id: string, fn: string): VectorCase => ({ id, fn, input: {}, expected: null });

describe("planVectors (BL-0033 runner rules)", () => {
  const vectors = [v("a1", "f_impl"), v("a2", "f_impl"), v("b1", "f_skip"), v("b2", "f_skip")];

  it("runs implemented functions and counts skipped ones per function name", () => {
    const plan = planVectors(vectors, ["f_impl"], { f_skip: "BL-9" }, {});
    expect(plan.errors).toEqual([]);
    expect(plan.byStatus.run.map((x) => x.id)).toEqual(["a1", "a2"]);
    expect(plan.skippedPerFunction).toEqual({ f_skip: 2 });
  });

  it("reports an error for a function that is neither implemented nor skipped", () => {
    const plan = planVectors([...vectors, v("c1", "f_unknown")], ["f_impl"], { f_skip: "BL-9" }, {});
    expect(plan.errors).toEqual([expect.stringContaining("c1 names function f_unknown")]);
  });

  it("reports an error for a function that is implemented and still on the skip list", () => {
    const plan = planVectors(vectors, ["f_impl", "f_skip"], { f_skip: "BL-9" }, {});
    expect(plan.errors).toEqual([expect.stringContaining("f_skip is implemented but still on the skip list")]);
  });

  it("reports a pending vector as pending, not as run", () => {
    const plan = planVectors(vectors, ["f_impl"], { f_skip: "BL-9" }, { a2: "BL-0185" });
    expect(plan.errors).toEqual([]);
    expect(plan.byStatus.pending.map((x) => x.id)).toEqual(["a2"]);
    expect(plan.byStatus.run.map((x) => x.id)).toEqual(["a1"]);
  });

  it("reports pending ids that match no vector or belong to an unimplemented function", () => {
    const plan = planVectors(vectors, ["f_impl"], { f_skip: "BL-9" }, { nope: "BL-0185", b1: "BL-0185" });
    expect(plan.errors).toHaveLength(2);
  });
});
