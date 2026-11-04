// Static G1 rules of doc 07 section 7 (those that need no sampling and no tools). Each rule returns
// messages; index.ts attaches the rule id, file and severity.
import { existsSync } from "node:fs";
import path from "node:path";

import { hitsInLine } from "@polymath/claims-lint/rules";

import { ALLOWED_LICENSES, KNOWN_SVG_TEMPLATES, PROMPTS_DIR } from "./config.ts";
import { ExprSyntaxError, FUNCTIONS, CONSTANTS, parseExpr } from "./expr.ts";
import { FILTER_UNITS, FILTERS, malformedPlaceholders, placeholders, renderFields, unitOf } from "./render.ts";
import type { Model } from "./model.ts";
import type { LintOptions, SyncedTemplate, TemplateInput } from "./types.ts";
import { asArray, asDoc, str, stringsWithPath, type Doc } from "./util.ts";

export type Ctx = { file: string; t: Doc; all: readonly TemplateInput[]; opts: LintOptions; model: Model; sha256: string | undefined };

const NON_COMMERCIAL = /non-?commercial|\bNC-SA\b|\bBY-NC\b|ocw\.mit\.edu|MIT OpenCourseWare/i;
const PLACEHOLDER_TEXT = /\b(TODO|FIXME|XXX)\b|lorem/i;

/** Licence and source checks, shared with content:sync for skills (SKILL-LIC). */
export function licenceMessages(doc: Doc): string[] {
  const out: string[] = [];
  const license = str(doc["license"]);
  if (!(ALLOWED_LICENSES as readonly string[]).includes(license)) out.push(`license "${license}" is not one of ${ALLOWED_LICENSES.join(", ")}`);
  const source = str(doc["source"]).trim();
  if (source === "") out.push("source is empty");
  else if (NON_COMMERCIAL.test(source)) out.push("source points at non-commercial material (doc 07 section 11)");
  return out;
}

export function l01({ file, t }: Ctx): string[] {
  const base = path.posix.basename(file);
  return base === `${str(t["key"])}.yaml` ? [] : [`file name must be ${str(t["key"])}.yaml`];
}

export function l02({ t, opts }: Ctx): string[] {
  const out: string[] = [];
  if (opts.skillKeys && !opts.skillKeys.has(str(t["skill_key"]))) out.push(`skill_key ${str(t["skill_key"])} is not in the skill graph`);
  if (t["task_kind"] === "perceptual_drill" && !["multiple_choice", "exact_numeric"].includes(str(t["grader_type"])))
    out.push("perceptual_drill is allowed only with multiple_choice or exact_numeric");
  return out;
}

export function l03({ t, opts, sha256 }: Ctx): string[] {
  const old: SyncedTemplate | undefined = opts.synced?.get(str(t["key"]));
  if (!old || old.status === "draft" || sha256 === undefined || old.sha256 === sha256) return [];
  const version = Number(t["version"]);
  return version > old.version ? [] : [`content changed but version ${String(version)} is not greater than the synced version ${String(old.version)}`];
}

export function l04({ model }: Ctx): string[] {
  const out: string[] = [];
  const known = new Set<string>([...Object.keys(CONSTANTS), ...FUNCTIONS]);
  for (const r of model.exprs) {
    try {
      const p = parseExpr(r.expr);
      for (const n of p.names) if (!r.scope.has(n) && !known.has(n)) out.push(`${r.path}: name "${n}" does not resolve`);
    } catch (e) {
      out.push(`${r.path}: ${e instanceof ExprSyntaxError ? e.message : "cannot parse"}`);
    }
  }
  const outputs = new Set(model.outputs);
  for (const ref of model.answerRefs) if (!outputs.has(ref)) out.push(`answer: "${ref}" is not a generator output`);
  return out;
}

export function l06({ model, t }: Ctx): string[] {
  const used = new Set<string>();
  const addNames = (src: string): void => {
    try {
      for (const n of parseExpr(src).names) used.add(n);
    } catch {
      // L04 reports it.
    }
  };
  for (const r of model.exprs) if (!r.path.startsWith("constraints.") && !r.path.startsWith("derived.")) addNames(r.expr);
  for (const f of renderFields(t)) for (const p of placeholders(f.text)) used.add(p.name);
  for (const [, v] of stringsWithPath(t["answer"])) for (const p of placeholders(v)) used.add(p.name);
  const derived = new Map(asArray(t["derived"]).map(asDoc).map((d) => [str(d["name"]), str(d["expr"])]));
  // A used derived value pulls in what it is computed from.
  for (let changed = true; changed; ) {
    changed = false;
    for (const [name, expr] of derived) {
      if (!used.has(name)) continue;
      const before = used.size;
      addNames(expr);
      if (used.size > before) changed = true;
    }
  }
  return [...model.params, ...model.derived].filter((n) => !used.has(n)).map((n) => `"${n}" never reaches the stem, the answer or the hints`);
}

function scopeNames(model: Model, t: Doc): Set<string> {
  const names = new Set([...model.params, ...model.derived, ...model.outputs, ...model.variables]);
  if (t["grader_type"] === "multiple_choice") names.add("value");
  return names;
}

export function l07({ model, t }: Ctx): string[] {
  const out: string[] = [];
  const names = scopeNames(model, t);
  const answer = asDoc(t["answer"]);
  const fields = renderFields(t);
  for (const k of ["skeleton", "reference_netlist"]) if (typeof answer[k] === "string") fields.push({ path: `answer.${k}`, text: answer[k] });
  if (t["grader_type"] === "spice_compare") names.add("skeleton");
  for (const f of fields) {
    for (const bad of malformedPlaceholders(f.text)) out.push(`${f.path}: malformed placeholder "${bad}"`);
    for (const p of placeholders(f.text)) {
      if (!names.has(p.name)) out.push(`${f.path}: {{${p.name}}} does not resolve to a parameter, derived value or output`);
      if (p.filter !== undefined) {
        if (!(FILTERS as readonly string[]).includes(p.filter)) out.push(`${f.path}: unknown filter "${p.filter}" in ${p.raw}`);
        else if (["sig", "fixed"].includes(p.filter) && !/^\d+$/.test(p.arg ?? "")) out.push(`${f.path}: filter ${p.filter} needs a whole-number argument in ${p.raw}`);
        else if (["eng", "tex"].includes(p.filter) && p.arg !== undefined && !/^[A-Za-z]+$/.test(p.arg)) out.push(`${f.path}: "${p.arg}" is not a unit name (for example ${FILTER_UNITS.join(", ")}) in ${p.raw}`);
      }
    }
  }
  return out;
}

export function l08({ t }: Ctx): string[] {
  const out: string[] = [];
  const render = asDoc(t["render"]);
  const stem = str(render["stem_md"]);
  const alt = str(render["alt_text"]).trim();
  if (stem.length > 1200) out.push(`render.stem_md has ${String(stem.length)} characters (limit 1200)`);
  if (alt === "") out.push("render.alt_text is missing");
  else if (alt === stem.trim()) out.push("render.alt_text equals the stem");
  return out;
}

export function l09({ t }: Ctx): string[] {
  const out: string[] = [];
  for (const f of renderFields(t)) {
    for (const p of placeholders(f.text)) {
      if ((p.filter === "eng" || p.filter === "tex") && (p.arg === undefined || p.arg === "") && unitOf(t, p.name) === "")
        out.push(`${f.path}: ${p.raw} has no unit: give a parameter or derived unit, or write ${p.raw.replace("}}", ":ohm}}")}`);
    }
  }
  return out;
}

export function l10({ t, opts }: Ctx): string[] {
  const out = licenceMessages(t);
  const llm = asDoc(asDoc(t["provenance"])["llm_assistance"]);
  const promptVersion = str(llm["prompt_version"]);
  if (llm["used"] === true) {
    if (promptVersion === "") out.push("llm_assistance.used is true but prompt_version is empty");
    else if (!/^[A-Za-z0-9_.-]+$/.test(promptVersion) || !existsSync(path.join(opts.contentRoot, PROMPTS_DIR, `${promptVersion}.md`)))
      out.push(`prompt_version ${promptVersion} has no file in content/${PROMPTS_DIR}/`);
  }
  return out;
}

export function l14({ t }: Ctx): string[] {
  const declared = new Set(asArray(t["misconceptions"]).map((m) => str(asDoc(m)["tag"])));
  const used = new Set<string>();
  const find = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(find);
    else if (typeof v === "object" && v !== null)
      for (const [k, x] of Object.entries(v)) {
        if (k === "misconception_tag" && typeof x === "string") used.add(x);
        else find(x);
      }
  };
  for (const [k, v] of Object.entries(t)) if (k !== "misconceptions") find(v);
  return [...used].filter((tag) => !declared.has(tag)).map((tag) => `misconception tag ${tag} is not declared in misconceptions[]`);
}

export function l17({ t }: Ctx): string[] {
  const out: string[] = [];
  const figure = asDoc(asDoc(t["render"])["figure"]);
  if (figure["kind"] === "svg_template" && !(KNOWN_SVG_TEMPLATES as readonly string[]).includes(str(figure["template"])))
    out.push(`render.figure.template "${str(figure["template"])}" is not a known svg_template (${KNOWN_SVG_TEMPLATES.join(", ")})`);
  for (const [p, s] of stringsWithPath(t)) {
    if (p === "source" || p.startsWith("provenance.")) continue;
    const m = /\b(?:https?|ftp):\/\/\S+|\bwww\.[a-z0-9-]+\.\S+/i.exec(s);
    if (m) out.push(`${p}: external URL "${m[0].slice(0, 60)}"`);
  }
  return out;
}

export function l19({ t }: Ctx): string[] {
  const out: string[] = [];
  for (const [p, s] of stringsWithPath(t)) {
    for (const line of s.split(/\r?\n/)) {
      const hit = hitsInLine(line)[0];
      if (hit) {
        out.push(`${p}: banned claim (${hit.category}): "${hit.fragment}"`);
        break;
      }
    }
  }
  return out;
}

export function l20({ t }: Ctx): string[] {
  const delivery = asDoc(t["delivery"]);
  if (delivery["phone_suitable"] !== true) return [];
  const contexts = asArray(delivery["contexts"]);
  const est = typeof delivery["est_seconds"] === "number" ? delivery["est_seconds"] : Infinity;
  return !contexts.includes("phone") || est > 180 ? ["phone_suitable needs phone in contexts and est_seconds <= 180"] : [];
}

export function l21({ t, all }: Ctx): string[] {
  if (str(asDoc(asDoc(t["provenance"])["review"])["notes"]).trim() !== "") return [];
  const others = all
    .map((o) => o.doc)
    .filter((o) => o["skill_key"] === t["skill_key"] && o["key"] !== t["key"] && typeof o["difficulty_prior"] === "number")
    .map((o) => o["difficulty_prior"] as number)
    .sort((a, b) => a - b);
  const prior = t["difficulty_prior"];
  if (others.length === 0 || typeof prior !== "number") return [];
  const mid = others.length >> 1;
  const median = others.length % 2 === 1 ? (others[mid] as number) : ((others[mid - 1] as number) + (others[mid] as number)) / 2;
  return Math.abs(prior - median) > 0.2 + 1e-9 ? [`difficulty_prior ${String(prior)} is more than 0.2 from the median ${median.toFixed(2)} of the other templates for this skill; explain it in provenance.review.notes`] : [];
}

export function l22({ t }: Ctx): string[] {
  if (t["authoring_status"] !== "ready") return [];
  const verifiers = asArray(t["verifiers"]).map(asDoc);
  return verifiers.length < 2 || !verifiers.some((v) => !["bounds", "pint_dimension"].includes(str(v["kind"])))
    ? ["a ready template needs 2 verifiers, one not bounds or pint_dimension"]
    : [];
}

const NORMALISE = (s: string): string => s.replace(/\s+/g, "");

export function l23({ t }: Ctx): string[] {
  const out: string[] = [];
  const gen = asDoc(asDoc(t["solution"])["generator"]);
  const generated = new Map<string, string>();
  for (const [k, v] of Object.entries(asDoc(gen["outputs"]))) if (typeof v === "string") generated.set(NORMALISE(v), k);
  for (const [i, v] of asArray(t["verifiers"]).map(asDoc).entries()) {
    if (!["sympy_solve", "sympy_exact", "polar_vs_rectangular", "spice_vs_closed_form"].includes(str(v["kind"]))) continue;
    for (const [p, s] of stringsWithPath(v["spec"])) {
      const same = generated.get(NORMALISE(s));
      if (same !== undefined && /[^A-Za-z0-9_.]/.test(NORMALISE(s))) out.push(`verifiers.${String(i)}.spec.${p} repeats the text of generator output ${same}; a verifier must be independent (doc 07 section 5.1)`);
    }
  }
  return out;
}

export function l24({ t }: Ctx): string[] {
  const samples = asDoc(t["fuzz"])["samples"];
  return typeof samples !== "number" || samples < 200 ? ["fuzz.samples must be at least 200"] : [];
}

export function l25({ t }: Ctx): string[] {
  for (const [p, s] of stringsWithPath(t)) {
    const m = PLACEHOLDER_TEXT.exec(s);
    if (m) return [`placeholder text "${m[0].toUpperCase()}" found in ${p}`];
  }
  return [];
}

/** Advisory only: a very long sentence in text the learner reads. */
export function l26({ t }: Ctx): string[] {
  const out: string[] = [];
  for (const f of renderFields(t)) {
    if (f.path.endsWith("alt_text") || f.path.endsWith("feedback_md")) continue;
    const plain = f.text.replace(/\$\$[\s\S]+?\$\$|\$[^$]+\$/g, "X").replace(/\{\{[^}]*\}\}/g, "X");
    for (const sentence of plain.split(/[.!?]+\s/)) {
      const words = sentence.trim().split(/\s+/).filter(Boolean).length;
      if (words > 35) {
        out.push(`${f.path}: a sentence of ${String(words)} words is hard to read on a phone; consider splitting it`);
        break;
      }
    }
  }
  return out;
}
