// L04 name resolution follows the generator's evaluation order (reference/verifiers/tplkit.py,
// generate_item): an output may use the outputs before it, never one after it. Regression for the
// false positive on tpl.math.solve-linear-v1 (`sol: (c - b) / a` after `c: a * r + b`).
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { CONTENT_ROOT } from "../src/config.ts";
import { lintTemplates } from "../src/index.ts";

const SAMPLE = path.join(CONTENT_ROOT, "sample-problem-templates", "tpl.elec.voltage-divider-vout.yaml");

function l04With(outputs: Record<string, string>, answerValue: string): string[] {
  const doc = parse(readFileSync(SAMPLE, "utf8")) as Record<string, unknown>;
  const solution = doc["solution"] as { generator: { outputs: Record<string, string> } };
  solution.generator.outputs = outputs;
  (doc["answer"] as Record<string, unknown>)["value"] = answerValue;
  return lintTemplates([{ file: SAMPLE, doc }], { contentRoot: CONTENT_ROOT })
    .filter((f) => f.rule === "L04")
    .map((f) => f.message);
}

describe("L04 output order", () => {
  it("an output that uses an earlier output resolves", () => {
    expect(l04With({ i: "vin / (r1 + r2)", vout: "i * r2" }, "vout")).toEqual([]);
  });

  it("an output that uses a later output is reported", () => {
    const messages = l04With({ vout: "i * r2", i: "vin / (r1 + r2)" }, "vout");
    expect(messages.join("\n")).toContain("i");
    expect(messages.length).toBeGreaterThan(0);
  });
});
