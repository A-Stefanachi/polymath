// Step 1 of doc 07 section 10: read the YAML with the YAML 1.2 core schema (no timestamp coercion)
// and run G0 through @polymath/content-schema, the only place content is validated (doc 03 13.1).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { validateSkillNode, validateTemplate, type SchemaError } from "@polymath/content-schema";
import { parseDocument } from "yaml";

import { entrySha256, templateSha256, typedFromDocument, type Typed } from "./canonical.ts";
import { CONTENT_LAYOUT } from "./config.ts";

export type Problem = { file: string; rule: string; message: string };

export type Doc = Record<string, unknown>;

export type SkillEntry = { doc: Doc; sha256: string };
export type GraphData = {
  file: string;
  modules: Doc[];
  skills: SkillEntry[];
};
export type TemplateEntry = { file: string; doc: Doc; sha256: string };
export type Loaded = {
  graph: GraphData | undefined;
  templates: TemplateEntry[];
  reviewLog: string;
  problems: Problem[];
};

function isDoc(v: unknown): v is Doc {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function describe(e: SchemaError): string {
  return `${e.path}: ${e.message}`;
}

function parseYaml(file: string, text: string, problems: Problem[]): { js: unknown; typed: Typed } | undefined {
  const doc = parseDocument(text, { schema: "core", uniqueKeys: true });
  if (doc.errors.length > 0) {
    for (const e of doc.errors) problems.push({ file, rule: "yaml", message: e.message.split("\n")[0] ?? "invalid YAML" });
    return undefined;
  }
  try {
    return { js: doc.toJS(), typed: typedFromDocument(doc) };
  } catch (error) {
    problems.push({ file, rule: "yaml", message: error instanceof Error ? error.message : "invalid YAML" });
    return undefined;
  }
}

function yamlFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.split(path.sep).join("/"))
    .sort();
}

/** Reads the graph file and the templates below `contentRoot`. Problems are collected, not thrown. */
export function loadContent(contentRoot: string): Loaded {
  const problems: Problem[] = [];

  let graph: GraphData | undefined;
  const graphFile = CONTENT_LAYOUT.graph;
  const graphPath = path.join(contentRoot, graphFile);
  if (!existsSync(graphPath)) {
    problems.push({ file: graphFile, rule: "G0", message: "skill graph file not found" });
  } else {
    const parsed = parseYaml(graphFile, readFileSync(graphPath, "utf8"), problems);
    if (parsed) {
      const result = validateSkillNode(parsed.js);
      if (!result.valid) {
        for (const e of result.errors) problems.push({ file: graphFile, rule: "G0", message: describe(e) });
      } else if (isDoc(parsed.js) && isDoc(parsed.typed) && Array.isArray(parsed.typed["skills"])) {
        const rawSkills = (parsed.js["skills"] as Doc[]) ?? [];
        const typedSkills = parsed.typed["skills"];
        graph = {
          file: graphFile,
          modules: (parsed.js["modules"] as Doc[]) ?? [],
          skills: rawSkills.map((doc, i) => ({ doc, sha256: entrySha256(typedSkills[i] ?? null, ["prerequisites"]) })),
        };
      }
    }
  }

  const templates: TemplateEntry[] = [];
  const templatesDir = path.join(contentRoot, CONTENT_LAYOUT.templates);
  for (const rel of yamlFiles(templatesDir)) {
    const file = `${CONTENT_LAYOUT.templates}/${rel}`;
    const parsed = parseYaml(file, readFileSync(path.join(templatesDir, rel), "utf8"), problems);
    if (!parsed) continue;
    const result = validateTemplate(parsed.js);
    if (!result.valid) {
      for (const e of result.errors) problems.push({ file, rule: "G0", message: describe(e) });
      continue;
    }
    if (isDoc(parsed.js)) templates.push({ file, doc: parsed.js, sha256: templateSha256(parsed.typed) });
  }

  const logPath = path.join(contentRoot, CONTENT_LAYOUT.reviewLog);
  const reviewLog = existsSync(logPath) ? readFileSync(logPath, "utf8") : "";
  return { graph, templates, reviewLog, problems };
}
