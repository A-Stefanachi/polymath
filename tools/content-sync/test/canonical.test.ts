// Doc 07 section 10 step 3: the TypeScript hash equals tplkit.template_sha256 of the Python oracle.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseDocument } from "yaml";
import { describe, expect, it } from "vitest";

import { canonicalJson, pyFloatRepr, templateSha256, typedFromDocument } from "../src/canonical.ts";
import { CONTENT_ROOT } from "../src/config.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

function hashFile(file: string): string {
  const doc = parseDocument(readFileSync(file, "utf8"), { schema: "core" });
  return templateSha256(typedFromDocument(doc));
}

function filesIn(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => path.join(dir, f));
}

describe("pyFloatRepr matches Python repr(float)", () => {
  it.each([
    [1e-6, "1e-06"],
    [0.0001, "0.0001"],
    [0.00001, "1e-05"],
    [0, "0.0"],
    [3, "3.0"],
    [0.3, "0.3"],
    [1234.5, "1234.5"],
    [1e16, "1e+16"],
    [1e15, "1000000000000000.0"],
    [1.5e-7, "1.5e-07"],
    [-2.5, "-2.5"],
    [1e100, "1e+100"],
  ])("%s -> %s", (x, expected) => {
    expect(pyFloatRepr(x)).toBe(expected);
  });
});

describe("canonicalJson", () => {
  it("sorts keys by code point and keeps non-ASCII text", () => {
    const doc = parseDocument("b: 1\na: [x, 'é']\n", { schema: "core" });
    expect(canonicalJson(typedFromDocument(doc))).toBe('{"a":["x","é"],"b":1}');
  });
  it("tells 1 from 1.0", () => {
    const doc = parseDocument("a: 1\nb: 1.0\n", { schema: "core" });
    expect(canonicalJson(typedFromDocument(doc))).toBe('{"a":1,"b":1.0}');
  });
  it("ignores authoring_status and provenance.review", () => {
    const a = "key: k\nauthoring_status: draft\nprovenance: {authors: [x], review: {template_sha256: abc}}\n";
    const b = "key: k\nauthoring_status: ready\nprovenance: {authors: [x]}\n";
    const h = (t: string): string => templateSha256(typedFromDocument(parseDocument(t, { schema: "core" })));
    expect(h(a)).toBe(h(b));
    expect(h(a)).not.toBe(h(b.replace("key: k", "key: j")));
  });
});

describe("hash equals the Python oracle", () => {
  it("the 7 sample templates equal the recorded oracle values", () => {
    const expected = JSON.parse(readFileSync(path.join(here, "fixtures", "python-sample-hashes.json"), "utf8")) as Record<string, string>;
    const dir = path.join(CONTENT_ROOT, "sample-problem-templates");
    const actual: Record<string, string> = {};
    for (const f of filesIn(dir)) actual[path.basename(f)] = hashFile(f);
    expect(Object.keys(expected)).toHaveLength(7);
    expect(actual).toEqual(expected);
  });

  const probe = spawnSync("python3", ["-c", "import yaml"], { encoding: "utf8" });
  it.skipIf(probe.status !== 0)("every template under content/templates equals the live oracle", () => {
    const dirs = [path.join(CONTENT_ROOT, "templates"), path.join(CONTENT_ROOT, "sample-problem-templates")];
    const run = spawnSync("python3", [path.join(here, "fixtures", "py_hashes.py"), ...dirs], { encoding: "utf8" });
    expect(run.status).toBe(0);
    const expected = JSON.parse(run.stdout) as Record<string, string>;
    const actual: Record<string, string> = {};
    for (const dir of dirs) for (const f of filesIn(dir)) actual[path.basename(f)] = hashFile(f);
    expect(Object.keys(actual).length).toBeGreaterThanOrEqual(30);
    expect(actual).toEqual(expected);
  });
});
