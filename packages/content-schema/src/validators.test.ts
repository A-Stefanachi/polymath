// BL-0013: G0 validators against the sample templates and the negative cases of
// polymath-app-spec/reference/verifiers/tests/test_templates.py (test_schema_rejects_bad_documents).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { isKey, SCHEMAS, SKILL_KEY, PROJECT_KEY, STEP_KEY, TEMPLATE_KEY, validateTemplate } from "./index.ts";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SAMPLES = path.join(REPO, "polymath-app-spec", "content", "sample-problem-templates");

type Doc = Record<string, unknown>;

// YAML 1.2 core schema: no timestamp coercion, as content:sync and tplkit read the files (doc 07 section 10).
function load(file: string): Doc {
  return parse(readFileSync(file, "utf8"), { schema: "core" }) as Doc;
}

const samples = readdirSync(SAMPLES)
  .filter((f) => f.endsWith(".yaml"))
  .sort()
  .map((f) => [f, load(path.join(SAMPLES, f))] as const);

describe("G0 on the sample templates", () => {
  it("there are 7 sample templates", () => {
    expect(samples).toHaveLength(7);
  });

  it.each(samples)("acceptance 1: %s is valid", (_name, doc) => {
    expect(validateTemplate(doc).errors).toEqual([]);
  });
});

// Mutations of tpl.elec.voltage-divider-vout, one per negative case of the Python oracle.
const base = (): Doc => structuredClone(load(path.join(SAMPLES, "tpl.elec.voltage-divider-vout.yaml")));
const obj = (d: Doc, k: string): Doc => d[k] as Doc;
const arr = (d: Doc, k: string): Doc[] => d[k] as Doc[];

const NEGATIVE: [string, (t: Doc) => void][] = [
  ["skill_key breaks the contract regex", (t) => (t["skill_key"] = "elec.voltage")],
  ["key lacks the tpl. prefix", (t) => (t["key"] = "elec.divider")],
  ["grader_type outside the enum", (t) => (t["grader_type"] = "llm_magic")],
  ["authoring_status verified (only the pipeline sets verified)", (t) => (t["authoring_status"] = "verified")],
  ["non-commercial licence", (t) => (t["license"] = "CC-BY-NC-SA-4.0")],
  ["difficulty_prior above 1", (t) => (t["difficulty_prior"] = 1.5)],
  ["ready with one verifier (needs at least 2)", (t) => (t["verifiers"] = arr(t, "verifiers").slice(0, 1))],
  ["ready without hint l2", (t) => delete obj(t, "hints")["l2"]],
  ["numeric answer without tolerance", (t) => delete obj(t, "answer")["tolerance"]],
  ["verifier without independence", (t) => delete (arr(t, "verifiers")[0] ?? {})["independence"]],
  ["fuzz below 200 samples", (t) => (obj(t, "fuzz")["samples"] = 50)],
  ["unknown top-level property", (t) => (t["surprise"] = 1)],
  [
    "llm_assistance without prompt_version",
    (t) => delete obj(obj(t, "provenance"), "llm_assistance")["prompt_version"],
  ],
];

describe("G0 rejects the 13 negative cases of the Python oracle", () => {
  it("has all 13 cases", () => {
    expect(NEGATIVE).toHaveLength(13);
  });

  it.each(NEGATIVE)("acceptance 1: rejects: %s", (_name, mutate) => {
    const doc = base();
    expect(validateTemplate(doc).valid).toBe(true);
    mutate(doc);
    const result = validateTemplate(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("G0 step labels (BL-0204, 00a K5)", () => {
  const withLabel = (label: unknown): Doc => {
    const doc = base();
    const steps = arr(obj(doc, "solution"), "steps");
    (steps[0] as Doc)["label"] = label;
    return doc;
  };

  it("accepts an optional label of 1 to 60 characters", () => {
    expect(validateTemplate(withLabel("x")).valid).toBe(true);
    expect(validateTemplate(withLabel("x".repeat(60))).valid).toBe(true);
  });

  it("rejects an empty label and one of 61 characters", () => {
    expect(validateTemplate(withLabel("")).valid).toBe(false);
    expect(validateTemplate(withLabel("x".repeat(61))).valid).toBe(false);
  });
});

describe("key regexes", () => {
  it("acceptance 3: 'elec.dc.voltage-divider' is a skill key; 'Elec.dc.x' and 'elec.dc' are not", () => {
    expect(isKey("skill", "elec.dc.voltage-divider")).toBe(true);
    expect(isKey("skill", "Elec.dc.x")).toBe(false);
    expect(isKey("skill", "elec.dc")).toBe(false);
    expect(isKey("skill", 42)).toBe(false);
  });

  it("template, project and step keys follow the contract shapes", () => {
    expect(isKey("template", "tpl.elec.voltage-divider-vout")).toBe(true);
    expect(isKey("template", "tpl.elec.Vout")).toBe(false);
    expect(isKey("project", "prj.L0.blink-led")).toBe(true);
    expect(isKey("project", "prj.L10.x")).toBe(false);
    expect(isKey("step", "prj.L0.blink-led#s09")).toBe(true);
    expect(isKey("step", "prj.L0.blink-led#s9")).toBe(false);
  });

  it("equal the patterns of the JSON Schemas (one source of truth)", () => {
    const tpl = SCHEMAS.template as unknown as { properties: Record<string, { pattern?: string }> };
    expect(tpl.properties["key"]?.pattern).toBe(TEMPLATE_KEY.source);
    expect(tpl.properties["skill_key"]?.pattern).toBe(SKILL_KEY.source);
    const prj = JSON.stringify(SCHEMAS.project);
    expect(prj).toContain(JSON.stringify(PROJECT_KEY.source));
    expect(prj).toContain(JSON.stringify(STEP_KEY.source));
  });
});
