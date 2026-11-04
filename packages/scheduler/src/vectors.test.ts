// The scheduler vector runner (doc 06 section 13; BL-0033). Loads the shared vector file, dispatches by
// function name to the handlers that `*.vectors.ts` files export, and reports skipped functions and
// pending vector ids explicitly (as todo tests), never as passed.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { planVectors } from "./vector-plan.ts";
import {
  PENDING_VECTOR_IDS,
  SKIPPED_FUNCTIONS,
  VECTORS_FILE_FROM_REPO_ROOT,
  vectorContext,
  type VectorFile,
  type VectorHandlers,
} from "./vector-registry.ts";

const repoRoot = new URL("../../../", import.meta.url);
const file = JSON.parse(readFileSync(new URL(VECTORS_FILE_FROM_REPO_ROOT, repoRoot), "utf8")) as VectorFile;

// Auto-discovery: a later task adds src/<name>.vectors.ts and touches no shared runner file.
const srcDir = new URL("./", import.meta.url);
const handlers: Record<string, VectorHandlers[string]> = {};
for (const name of readdirSync(fileURLToPath(srcDir)).filter((n) => n.endsWith(".vectors.ts")).sort()) {
  const mod = (await import(/* @vite-ignore */ new URL(name, srcDir).href)) as { vectorHandlers?: VectorHandlers };
  for (const [fn, handler] of Object.entries(mod.vectorHandlers ?? {})) {
    if (fn in handlers) throw new Error(`function ${fn} has a vector handler in two files (second: ${name})`);
    handlers[fn] = handler;
  }
}

const plan = planVectors(file.vectors, Object.keys(handlers), SKIPPED_FUNCTIONS, PENDING_VECTOR_IDS);
const skippedSummary = Object.entries(plan.skippedPerFunction)
  .map(([fn, n]) => `${fn}=${n}`)
  .join(", ");

describe("scheduler_test_vectors.json", () => {
  it("has as many vectors as its count field, and the runner accounts for each", () => {
    expect(file.vectors).toHaveLength(file.count);
    const { run, skipped, pending } = plan.byStatus;
    expect(run.length + skipped.length + pending.length).toBe(file.count);
    // The count the acceptance test reads in the test output.
    console.log(
      `scheduler vectors: count=${file.count} run=${run.length} skipped=${skipped.length} pending=${pending.length}\n` +
        `skipped per function: ${skippedSummary === "" ? "none" : skippedSummary}`,
    );
  });

  it("names no function that is neither implemented nor on the skip list", () => {
    expect(plan.errors).toEqual([]);
  });

  // An empty describe or it.each fails in vitest, so these register only when there is something to run.
  describe.runIf(plan.byStatus.run.length > 0)("implemented functions", () => {
    const ctx = vectorContext();
    const cases = plan.byStatus.run.map((v) => [v.id, v] as const);
    it.each(cases)("%s", (_id, v) => {
      const handler = handlers[v.fn];
      if (handler === undefined) throw new Error(`no handler for ${v.fn}`);
      // JSON round trip drops undefined and normalises -0, as the reference check does.
      const got: unknown = JSON.parse(JSON.stringify(handler(v.input, ctx)));
      expect(got).toEqual(v.expected);
    });
  });

  describe("skipped functions (not implemented yet)", () => {
    for (const [fn, task] of Object.entries(SKIPPED_FUNCTIONS)) {
      it.todo(`${fn}: ${plan.skippedPerFunction[fn] ?? 0} vectors, delivered by ${task}`);
    }
  });

  describe.runIf(plan.byStatus.pending.length > 0)("pending vectors (feature delivered by a later task)", () => {
    for (const v of plan.byStatus.pending) {
      it.todo(`${v.id} (${v.fn}), delivered by ${PENDING_VECTOR_IDS[v.id] ?? "?"}`);
    }
  });

  // BL-0039 gate: once every function is implemented, nothing may remain pending.
  it("has an empty pending list once no function is skipped", () => {
    if (Object.keys(SKIPPED_FUNCTIONS).length === 0) expect(Object.keys(PENDING_VECTOR_IDS)).toEqual([]);
  });
});
