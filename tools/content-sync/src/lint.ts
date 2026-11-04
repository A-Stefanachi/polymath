// G1 for content:sync (doc 07 section 7). The template rules L01 to L27 live in tools/content-lint
// (BL-0050) and run here through lintTemplates, so `pnpm content:lint` and the sync apply the same
// code. What stays here needs the whole graph: GRAPH (unique keys, key parts agree with node and
// module, modules exist, prerequisites exist, no cycle), TPL-DUP (one file per key and version)
// and SKILL-LIC (the licence rule L10 applied to skills, whose license and source are not null).
import { licenceMessages, lintTemplates } from "@polymath/content-lint";
import { lessonProblems } from "@polymath/content-schema";

import type { Doc, Loaded, Problem } from "./load.ts";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function licenceProblems(file: string, rule: string, doc: Doc): Problem[] {
  return licenceMessages(doc).map((message) => ({ file, rule, message }));
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

/** L-G1 of doc 07 section 15 for every lesson file: needs the graph (skills, stubs) and the templates' misconception tags. */
function lessonFileProblems(loaded: Loaded): Problem[] {
  if (!loaded.graph) return [];
  const skills = new Map(loaded.graph.skills.map(({ doc }) => [str(doc["key"]), { stub: doc["status"] === "stub" }]));
  const tags = new Map<string, Set<string>>();
  for (const { doc } of loaded.templates) {
    for (const m of (doc["misconceptions"] as Doc[] | undefined) ?? []) {
      const key = str(doc["skill_key"]);
      tags.set(key, (tags.get(key) ?? new Set<string>()).add(str(m["tag"])));
    }
  }
  return loaded.lessons.flatMap(({ file, fileName, doc }) =>
    lessonProblems(doc, { fileName, skills, tags }).map((p) => ({ file, rule: p.rule, message: p.message })),
  );
}

/** Runs G1 on loaded content. `contentRoot` locates content/prompts. Warnings carry severity "W". */
export function lintContent(loaded: Loaded, contentRoot: string): Problem[] {
  const out: Problem[] = [...graphProblems(loaded), ...lessonFileProblems(loaded)];
  const seen = new Map<string, string>();
  for (const { file, doc } of loaded.templates) {
    const id = `${str(doc["key"])}@${String(doc["version"])}`;
    const prior = seen.get(id);
    if (prior) out.push({ file, rule: "TPL-DUP", message: `${str(doc["key"])} version ${String(doc["version"])} is also defined in ${prior}` });
    seen.set(id, file);
  }
  const findings = lintTemplates(loaded.templates, {
    contentRoot,
    skillKeys: loaded.graph ? new Set(loaded.graph.skills.map((s) => str(s.doc["key"]))) : undefined,
  });
  for (const f of findings) out.push({ file: f.file, rule: f.rule, message: f.message, severity: f.severity });
  return out;
}
