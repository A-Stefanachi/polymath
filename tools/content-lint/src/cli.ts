// pnpm content:lint [--content-root DIR] [--synced FILE.json] [PATH...]
// G1 (doc 07 section 7): G0 schema check, then L01 to L26 on every template below the PATHs (files
// or folders; default <content root>/templates). The skill graph and prompts come from the content
// root. --synced names a JSON object {key: {version, sha256, status}} (what the database holds)
// and switches L03 on; without it L03 is skipped because lint opens no database.
// Output: one line per finding, `file [Lnn] E|W message`. Exit 0 when there is no error (warnings
// are shown), 1 on any error, 2 when the lint could not run.
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { lintContent } from "@polymath/content-sync/lint";
import { loadContent, loadTemplateDir, type Problem } from "@polymath/content-sync/load";

import { CONTENT_ROOT } from "./config.ts";
import { lintTemplates, type Finding, type SyncedTemplate } from "./index.ts";

function fail(message: string): never {
  console.error(`content:lint: ${message}`);
  process.exit(2);
}

let parsed;
try {
  parsed = parseArgs({
    options: { "content-root": { type: "string" }, synced: { type: "string" } },
    allowPositionals: true,
    strict: true,
  });
} catch (error) {
  fail(error instanceof Error ? error.message : "bad arguments");
}
const root = path.resolve(parsed.values["content-root"] ?? CONTENT_ROOT);

let synced: Map<string, SyncedTemplate> | undefined;
if (parsed.values.synced) {
  try {
    const raw: unknown = JSON.parse(readFileSync(parsed.values.synced, "utf8"));
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("not an object");
    synced = new Map(Object.entries(raw as Record<string, SyncedTemplate>));
  } catch (error) {
    fail(`cannot read --synced file: ${error instanceof Error ? error.message : "invalid"}`);
  }
}

const findings: Finding[] = [];
const toFinding = (p: Problem): Finding => ({
  file: p.file,
  // The schema half of L01 is G0 (load.ts); the schema also states the L24 minimum of fuzz.samples
  // (minimum 200), so a template under it never reaches the rule code and is reported as L24.
  rule: p.rule === "G0" ? (p.message.startsWith("/fuzz/samples") ? "L24" : "L01") : p.rule,
  severity: p.severity ?? "E",
  message: p.rule === "G0" ? `schema: ${p.message}` : p.message,
});

let count: number;
if (parsed.positionals.length === 0) {
  const loaded = loadContent(root);
  const problems = [...loaded.problems, ...lintContent(loaded, root, true)];
  // lintContent covers the graph and L01 to L26 without L03; add L03 only when asked.
  findings.push(...problems.map(toFinding));
  if (synced) findings.push(...lintTemplates(loaded.templates, { contentRoot: root, synced }).filter((f) => f.rule === "L03"));
  count = loaded.templates.length;
} else {
  const problems: Problem[] = [];
  const loaded = loadContent(root);
  const templates = [];
  for (const p of parsed.positionals) {
    const abs = path.resolve(p);
    let isDir: boolean;
    try {
      isDir = statSync(abs).isDirectory();
    } catch {
      fail(`${p}: no such file or folder`);
    }
    templates.push(...(isDir ? loadTemplateDir(abs, p.replaceAll("\\", "/"), problems) : loadTemplateDir(path.dirname(abs), path.dirname(p).replaceAll("\\", "/"), problems).filter((t) => path.basename(t.file) === path.basename(abs))));
  }
  const skillKeys = loaded.graph ? new Set(loaded.graph.skills.map((s) => String(s.doc["key"]))) : undefined;
  findings.push(...problems.map(toFinding), ...lintTemplates(templates, { contentRoot: root, skillKeys, synced }));
  count = templates.length;
}

const errors = findings.filter((f) => f.severity === "E").length;
for (const f of findings) console.log(`${f.file} [${f.rule}] ${f.severity} ${f.message}`);
console.log(`content:lint: ${String(count)} template(s), ${String(errors)} error(s), ${String(findings.length - errors)} warning(s)`);
process.exitCode = errors > 0 ? 1 : 0;
