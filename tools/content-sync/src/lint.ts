// G1 for content:sync: the lint rules that need only the loaded data (doc 07 section 7). The full
// L01 to L26 set is BL-0050. Implemented here, by the doc's ids:
//   L01 filename equals key + ".yaml" (the schema half of L01 is G0, run in load.ts)
//   L02 skill_key exists in the skill graph; perceptual_drill only with multiple_choice or exact_numeric
//   L10 license is in the allowed set; source is not a non-commercial pointer; prompt_version file exists
//   L20 phone_suitable implies phone in contexts and est_seconds <= 180
//   L22 a ready template has at least 2 verifiers, one not bounds or pint_dimension
//   L24 fuzz.samples >= 200
//   L25 no TODO, FIXME, lorem or XXX text
// and three checks of its own: GRAPH (unique keys, key parts agree with node and module, modules
// exist, prerequisites exist, no cycle), TPL-DUP (one file per key and version) and SKILL-LIC
// (L10 applied to skills, whose license and source columns are also not null).
import { existsSync } from "node:fs";
import path from "node:path";

import { ALLOWED_LICENSES, CONTENT_LAYOUT } from "./config.ts";
import type { Doc, Loaded, Problem } from "./load.ts";

const NON_COMMERCIAL = /non-?commercial|\bNC-SA\b|\bBY-NC\b|ocw\.mit\.edu|MIT OpenCourseWare/i;
const PLACEHOLDER = /\b(TODO|FIXME|XXX)\b|lorem/i;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asDoc(v: unknown): Doc {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Doc) : {};
}

function* strings(v: unknown): Generator<string> {
  if (typeof v === "string") yield v;
  else if (Array.isArray(v)) for (const x of v) yield* strings(x);
  else if (typeof v === "object" && v !== null) for (const x of Object.values(v)) yield* strings(x);
}

function licenceProblems(file: string, rule: string, doc: Doc): Problem[] {
  const out: Problem[] = [];
  const license = str(doc["license"]);
  if (!(ALLOWED_LICENSES as readonly string[]).includes(license))
    out.push({ file, rule, message: `license "${license}" is not one of ${ALLOWED_LICENSES.join(", ")}` });
  const source = str(doc["source"]).trim();
  if (source === "") out.push({ file, rule, message: "source is empty" });
  else if (NON_COMMERCIAL.test(source))
    out.push({ file, rule, message: "source points at non-commercial material (doc 07 section 11)" });
  return out;
}

/** Finds a cycle in the prerequisite graph; returns the keys on it, or undefined. */
export function findCycle(edges: ReadonlyMap<string, readonly string[]>): string[] | undefined {
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const visit = (n: string): string[] | undefined => {
    state.set(n, 1);
    stack.push(n);
    for (const next of edges.get(n) ?? []) {
      if (state.get(next) === 1) return [...stack.slice(stack.indexOf(next)), next];
      if (!state.has(next)) {
        const c = visit(next);
        if (c) return c;
      }
    }
    stack.pop();
    state.set(n, 2);
    return undefined;
  };
  for (const n of edges.keys()) {
    if (!state.has(n)) {
      const c = visit(n);
      if (c) return c;
    }
  }
  return undefined;
}

function graphProblems(loaded: Loaded): Problem[] {
  const graph = loaded.graph;
  if (!graph) return [];
  const out: Problem[] = [];
  const file = graph.file;
  const moduleKeys = new Set<string>();
  for (const m of graph.modules) {
    const key = str(m["key"]);
    if (moduleKeys.has(key)) out.push({ file, rule: "GRAPH", message: `duplicate module ${key}` });
    moduleKeys.add(key);
    if (key !== `${str(m["node"])}.${str(m["module"])}`)
      out.push({ file, rule: "GRAPH", message: `module ${key} does not equal node.module` });
  }
  const keys = new Set<string>();
  for (const { doc } of graph.skills) {
    const key = str(doc["key"]);
    if (keys.has(key)) out.push({ file, rule: "GRAPH", message: `duplicate skill ${key}` });
    keys.add(key);
  }
  const edges = new Map<string, string[]>();
  for (const { doc } of graph.skills) {
    const key = str(doc["key"]);
    const [node, module] = key.split(".");
    if (node !== doc["node"] || module !== doc["module"])
      out.push({ file, rule: "GRAPH", message: `${key}: key does not match node ${str(doc["node"])} and module ${str(doc["module"])}` });
    // Modules used only by stub skills need no entry: the sync adds a stub row (doc 04 section 5).
    if (doc["status"] !== "stub" && !moduleKeys.has(`${str(doc["node"])}.${str(doc["module"])}`))
      out.push({ file, rule: "GRAPH", message: `${key}: module ${str(doc["node"])}.${str(doc["module"])} is not declared` });
    out.push(...licenceProblems(file, "SKILL-LIC", doc).map((p) => ({ ...p, message: `${key}: ${p.message}` })));
    const prereqs: string[] = [];
    for (const p of (doc["prerequisites"] as Doc[] | undefined) ?? []) {
      const from = str(p["skill"]);
      if (from === key) out.push({ file, rule: "GRAPH", message: `${key} requires itself` });
      else if (!keys.has(from)) out.push({ file, rule: "GRAPH", message: `${key}: prerequisite ${from} does not exist` });
      prereqs.push(from);
    }
    edges.set(key, prereqs);
  }
  const cycle = findCycle(edges);
  if (cycle) out.push({ file, rule: "GRAPH", message: `prerequisite cycle ${cycle.join(" -> ")}` });
  return out;
}

/** Runs the G1 rules above on loaded content. `contentRoot` locates content/prompts. */
export function lintContent(loaded: Loaded, contentRoot: string): Problem[] {
  const out: Problem[] = [...graphProblems(loaded)];
  const skillKeys = new Set((loaded.graph?.skills ?? []).map((s) => str(s.doc["key"])));
  const seen = new Map<string, string>();
  for (const { file, doc } of loaded.templates) {
    const key = str(doc["key"]);
    const base = path.posix.basename(file);
    if (base !== `${key}.yaml`) out.push({ file, rule: "L01", message: `file name must be ${key}.yaml` });

    const id = `${key}@${String(doc["version"])}`;
    const prior = seen.get(id);
    if (prior) out.push({ file, rule: "TPL-DUP", message: `${key} version ${String(doc["version"])} is also defined in ${prior}` });
    seen.set(id, file);

    if (loaded.graph && !skillKeys.has(str(doc["skill_key"])))
      out.push({ file, rule: "L02", message: `skill_key ${str(doc["skill_key"])} is not in the skill graph` });
    if (doc["task_kind"] === "perceptual_drill" && !["multiple_choice", "exact_numeric"].includes(str(doc["grader_type"])))
      out.push({ file, rule: "L02", message: "perceptual_drill is allowed only with multiple_choice or exact_numeric" });

    out.push(...licenceProblems(file, "L10", doc));
    const llm = asDoc(asDoc(doc["provenance"])["llm_assistance"]);
    const promptVersion = str(llm["prompt_version"]);
    if (llm["used"] === true && promptVersion !== "") {
      const promptFile = path.join(contentRoot, CONTENT_LAYOUT.prompts, `${promptVersion}.md`);
      if (!/^[A-Za-z0-9_.-]+$/.test(promptVersion) || !existsSync(promptFile))
        out.push({ file, rule: "L10", message: `prompt_version ${promptVersion} has no file in content/${CONTENT_LAYOUT.prompts}/` });
    }

    const delivery = asDoc(doc["delivery"]);
    if (delivery["phone_suitable"] === true) {
      const contexts = Array.isArray(delivery["contexts"]) ? delivery["contexts"] : [];
      const est = typeof delivery["est_seconds"] === "number" ? delivery["est_seconds"] : Infinity;
      if (!contexts.includes("phone") || est > 180)
        out.push({ file, rule: "L20", message: "phone_suitable needs phone in contexts and est_seconds <= 180" });
    }

    if (doc["authoring_status"] === "ready") {
      const verifiers = Array.isArray(doc["verifiers"]) ? (doc["verifiers"] as Doc[]) : [];
      if (verifiers.length < 2 || !verifiers.some((v) => !["bounds", "pint_dimension"].includes(str(v["kind"]))))
        out.push({ file, rule: "L22", message: "a ready template needs 2 verifiers, one not bounds or pint_dimension" });
    }

    const samples = asDoc(doc["fuzz"])["samples"];
    if (typeof samples !== "number" || samples < 200)
      out.push({ file, rule: "L24", message: "fuzz.samples must be at least 200" });

    for (const s of strings(doc)) {
      if (PLACEHOLDER.test(s)) {
        out.push({ file, rule: "L25", message: `placeholder text "${(PLACEHOLDER.exec(s)?.[0] ?? "").toUpperCase()}" found` });
        break;
      }
    }
  }
  return out;
}
