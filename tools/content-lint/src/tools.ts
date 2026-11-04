// Rules that run a tool over author content: L15 (the C compiler, compile only), L16 (a netlist
// lint, no simulator) and L18 (KaTeX). Author content is trusted repository content, but nothing
// here executes it: gcc gets `-c`, the netlist is parsed as text, KaTeX renders strings.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import katex from "katex";

import type { Ctx } from "./rules.ts";
import { mathSpans, renderFields, renderText, unitOf } from "./render.ts";
import { validDraws, tryEval } from "./sample.ts";
import { asArray, asDoc, str } from "./util.ts";

// ---------------------------------------------------------------------------------------- L15

const SAFE_FLAG = /^-(?:W[A-Za-z0-9=+-]*|O[0-3sg]?|f(?:no-)?[a-z][a-z0-9-]*|pedantic(?:-errors)?|D[A-Za-z_][A-Za-z0-9_]*(?:=[A-Za-z0-9_.]*)?)$/;
const FORBIDDEN_FLAG = /plugin|specs|wrapper|dump|save-temps|^-fuse-ld|^-fprofile|^-flto/;

function compilerAvailable(): boolean {
  return spawnSync("gcc", ["--version"], { stdio: "ignore" }).error === undefined;
}

export function l15({ t }: Ctx): string[] {
  if (t["grader_type"] !== "code_tests") return [];
  const out: string[] = [];
  const answer = asDoc(t["answer"]);
  const tests = asDoc(answer["tests"]);
  const hidden = asArray(tests["hidden"]).length;
  const golden = asArray(tests["golden"]).length;
  const mutants = asArray(answer["mutants"]).length;
  if (hidden < 3) out.push(`${String(hidden)} hidden test(s); at least 3 are needed`);
  if (golden < 2) out.push(`${String(golden)} golden vector(s); at least 2 are needed`);
  if (mutants < 2) out.push(`${String(mutants)} mutant(s); at least 2 are needed`);

  const starter = str(answer["starter_code"]);
  const reference = str(answer["reference_solution"]);
  const norm = (s: string): string => s.replace(/\s+/g, " ").trim();
  if (norm(starter) === norm(reference)) out.push("starter_code equals reference_solution, so it already passes");

  const compile = asDoc(answer["compile"]);
  const flags = asArray(compile["flags"]).map(str);
  const std = str(compile["std"]);
  for (const f of flags) if (!SAFE_FLAG.test(f) || FORBIDDEN_FLAG.test(f)) out.push(`compile flag "${f}" is not allowed`);
  if (std !== "" && !/^[a-z0-9+]+$/.test(std)) out.push(`compile.std "${std}" is not valid`);
  const forbid = asArray(compile["forbid_includes"]).map(str).filter(Boolean);
  for (const [name, code] of [["starter_code", starter], ["reference_solution", reference], ["header", str(answer["header"])]] as const) {
    for (const m of code.matchAll(/#\s*include\s*[<"]([^>"]+)[>"]/g)) {
      const inc = m[1] ?? "";
      if (forbid.some((f) => inc.startsWith(f))) out.push(`${name} includes forbidden header ${inc}`);
    }
  }
  if (out.some((m) => m.startsWith("compile"))) return out;

  if (!compilerAvailable()) return out; // reported once by index.ts as a warning
  const dir = mkdtempSync(path.join(tmpdir(), "pm_l15_"));
  try {
    const headerName = /#\s*include\s*"([A-Za-z0-9_.-]+)"/.exec(`${starter}\n${reference}`)?.[1];
    if (headerName) writeFileSync(path.join(dir, headerName), str(answer["header"]));
    for (const [name, code] of [["starter_code", starter], ["reference_solution", reference]] as const) {
      const file = path.join(dir, `${name}.c`);
      writeFileSync(file, code);
      const run = spawnSync("gcc", [...(std ? [`-std=${std}`] : []), ...flags, "-c", file, "-o", path.join(dir, `${name}.o`)], {
        cwd: dir,
        encoding: "utf8",
        timeout: 20_000,
        env: { PATH: process.env["PATH"] ?? "" },
      });
      if (run.status !== 0) out.push(`${name} does not compile: ${(run.stderr || run.error?.message || "gcc failed").split("\n").find((l) => /error|warning/.test(l)) ?? "gcc failed"}`.replaceAll(dir, "."));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return out;
}

export { compilerAvailable };
// ---------------------------------------------------------------------------------------- L16

const ANALYSIS_DIRECTIVES = new Set([".ac", ".op", ".tran", ".dc", ".print", ".plot", ".probe", ".save", ".meas", ".measure", ".options", ".option", ".temp", ".title"]);
const ELEMENT_NAME = /^[A-Za-z][A-Za-z0-9_]{0,15}$/;
const NODE = /^[A-Za-z0-9_]{1,16}$/;

/** A text-only check of a netlist: element lines, allowed element kinds, directives. */
function netlistProblems(text: string, allowed: string[]): string[] {
  const out: string[] = [];
  const lines = text.replace(/\{\{[^}]*\}\}/g, "1").split(/\r?\n/);
  const elements = new Set<string>();
  for (const [i, raw] of lines.entries()) {
    const line = raw.trim();
    const at = `line ${String(i + 1)}`;
    if (line === "" || line.startsWith("*")) continue;
    if (line.startsWith(".")) {
      const d = (line.split(/\s+/)[0] ?? "").toLowerCase();
      if (d !== ".end" && !ANALYSIS_DIRECTIVES.has(d)) out.push(`${at}: directive ${d} is not allowed`);
      continue;
    }
    const parts = line.split(/\s+/);
    const name = parts[0] ?? "";
    if (!ELEMENT_NAME.test(name)) out.push(`${at}: "${name.slice(0, 20)}" is not an element name`);
    else if (!allowed.includes(name.charAt(0).toUpperCase())) out.push(`${at}: element kind ${name.charAt(0).toUpperCase()} is not in allowed_elements`);
    else if (elements.has(name.toUpperCase())) out.push(`${at}: element ${name} is defined twice`);
    elements.add(name.toUpperCase());
    if (parts.length < 4) out.push(`${at}: an element needs two nodes and a value`);
    else if (!NODE.test(parts[1] ?? "") || !NODE.test(parts[2] ?? "")) out.push(`${at}: bad node name`);
  }
  return out;
}

export function l16({ t }: Ctx): string[] {
  if (t["grader_type"] !== "spice_compare") return [];
  const out: string[] = [];
  const answer = asDoc(t["answer"]);
  const allowed = asArray(answer["allowed_elements"]).map((s) => str(s).toUpperCase());
  const skeleton = str(answer["skeleton"]);
  const reference = str(answer["reference_netlist"]);
  for (const m of netlistProblems(skeleton, allowed)) out.push(`skeleton: ${m}`);
  for (const m of netlistProblems(reference, allowed)) out.push(`reference_netlist: ${m}`);
  const names = (text: string): Set<string> => new Set(text.split(/\r?\n/).map((l) => (l.trim().split(/\s+/)[0] ?? "").toUpperCase()));
  for (const f of asArray(answer["fixed_elements"]).map((s) => str(s).toUpperCase())) if (!names(skeleton).has(f)) out.push(`skeleton lacks fixed element ${f}`);
  for (const n of asArray(answer["required_nodes"]).map(str)) {
    if (!new RegExp(`(^|\\s)${n.replace(/[^A-Za-z0-9_]/g, "")}(\\s|$)`, "m").test(reference)) out.push(`reference_netlist does not use required node ${n}`);
  }
  // Without a simulator the closest static check: a skeleton that equals the reference is already the answer.
  const norm = (s: string): string => s.replace(/\{\{[^}]*\}\}/g, "1").replace(/^\*.*$/gm, "").replace(/\s+/g, " ").trim();
  if (norm(skeleton) === norm(reference)) out.push("skeleton is identical to reference_netlist, so it already satisfies the checks");
  return out;
}

// ---------------------------------------------------------------------------------------- L18

/** Renders the first valid draw of the template's text and runs KaTeX on every math span. */
export function l18(ctx: Ctx): string[] {
  const { t } = ctx;
  const out: string[] = [];
  const draw = validDraws(t, 1)?.[0];
  const env = draw?.env ?? {};
  const options = asArray(asDoc(t["answer"])["options"]).map(asDoc);
  for (const f of renderFields(t)) {
    let optionValue: ReturnType<typeof tryEval>;
    const m = /^answer\.options\.(\d+)\./.exec(f.path);
    if (m) optionValue = tryEval(str(options[Number(m[1])]?.["value_expr"]), env);
    const text = renderText(f.text, (name) => ({ value: name === "value" ? optionValue : env[name], unit: unitOf(t, name) }));
    for (const span of mathSpans(text)) {
      try {
        katex.renderToString(span.tex, { throwOnError: true, trust: false, strict: "ignore", displayMode: span.display });
      } catch (e) {
        out.push(`${f.path}: KaTeX cannot render "${span.tex.slice(0, 50)}": ${e instanceof Error ? e.message.split("\n")[0] ?? "error" : "error"}`);
      }
    }
  }
  return out;
}
