// Placeholders and filters (doc 07 section 3.1): find them, check them, and render one sample so
// KaTeX can be run over its math spans (L18). The formats follow tplkit.py in the reference code.
import { asArray, asDoc, str, type Doc } from "./util.ts";
import type { Value } from "./expr.ts";

export const FILTERS = ["eng", "tex", "sig", "fixed", "int", "paren", "cplx", "tex_cplx", "spice", "raw"] as const;
/** Units the eng and tex filters can print (doc 07 section 3.1). */
export const FILTER_UNITS = ["ohm", "V", "A", "F", "Hz", "s", "H", "W"] as const;

const PLACEHOLDER = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\|\s*([A-Za-z_]+)\s*(?::\s*([^}|]*?))?\s*)?\}\}/g;

export type Placeholder = { name: string; filter: string | undefined; arg: string | undefined; raw: string };

export function placeholders(text: string): Placeholder[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => ({ name: m[1] ?? "", filter: m[2], arg: m[3], raw: m[0] }));
}

/** `{{` that the placeholder pattern does not match (a typo such as `{{ r1|}}` or `{{1x}}`). */
export function malformedPlaceholders(text: string): string[] {
  const rest = text.replace(PLACEHOLDER, "");
  return [...rest.matchAll(/\{\{[^}]*\}?\}?/g)].map((m) => m[0]);
}

/** The template's text fields that take placeholders, with the path used in messages. */
export function renderFields(t: Doc): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  const add = (path: string, v: unknown): void => {
    if (typeof v === "string") out.push({ path, text: v });
  };
  const render = asDoc(t["render"]);
  add("render.stem_md", render["stem_md"]);
  add("render.alt_text", render["alt_text"]);
  add("render.answer_prompt", render["answer_prompt"]);
  const hints = asDoc(t["hints"]);
  for (const k of ["l1", "l2", "l3"]) add(`hints.${k}`, hints[k]);
  const solution = asDoc(t["solution"]);
  for (const [i, s] of asArray(solution["steps"]).entries()) add(`solution.steps.${String(i)}.text_md`, asDoc(s)["text_md"]);
  add("solution.explanation_md", solution["explanation_md"]);
  const answer = asDoc(t["answer"]);
  for (const [i, o] of asArray(answer["options"]).entries()) {
    add(`answer.options.${String(i)}.text_md`, asDoc(o)["text_md"]);
    add(`answer.options.${String(i)}.feedback_md`, asDoc(o)["feedback_md"]);
  }
  return out;
}

// ---------------------------------------------------------------------------------- formatting

const SI: [number, string][] = [[1e12, "T"], [1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "u"], [1e-9, "n"], [1e-12, "p"]];

function sig(x: number, n: number): string {
  if (x === 0) return "0";
  const s = Number(x.toPrecision(n)).toString();
  return s;
}

function eng(value: number, unit: string, tex: boolean): string {
  const a = Math.abs(value);
  const [scale, pre] = value === 0 ? [1, ""] : (SI.find(([s]) => a >= s * 0.9995) ?? [1e-12, "p"]);
  const n = sig(value / scale, 3);
  if (!tex) return `${n} ${pre}${unit === "ohm" ? "Ω" : unit}`;
  const u = unit === "ohm" ? (pre ? `\\mathrm{${pre}}\\Omega` : "\\Omega") : `\\mathrm{${pre}${unit}}`;
  return `${n}\\,${u}`;
}

function cplx(v: Value): string {
  if (typeof v === "object") return `${sig(v.re, 4)} + ${sig(v.im, 4)}j`;
  return sig(Number(v), 4);
}

/** Formats a value as the filter would. A value of the wrong type renders as `0` (lint only needs well-formed text). */
export function applyFilter(value: Value | undefined, filter: string | undefined, arg: string | undefined, unit: string): string {
  const v = value ?? 1;
  const n = typeof v === "number" ? v : typeof v === "boolean" ? Number(v) : typeof v === "string" ? Number.NaN : v.re;
  const safe = Number.isFinite(n) ? n : 1;
  switch (filter) {
    case undefined: return typeof v === "string" ? v : cplx(v);
    case "eng": return eng(safe, arg ?? unit, false);
    case "tex": return eng(safe, arg ?? unit, true);
    case "sig": return sig(safe, Math.max(1, Number(arg) || 3));
    case "fixed": return safe.toFixed(Math.max(0, Number(arg) || 0));
    case "int": return String(Math.round(safe));
    case "paren": return safe < 0 ? `(${String(Math.round(safe))})` : String(Math.round(safe));
    case "cplx":
    case "tex_cplx": return cplx(v);
    case "spice": return String(safe);
    default: return String(safe);
  }
}

/** Replaces each placeholder using `lookup`; an unknown name renders as 1. */
export function renderText(text: string, lookup: (name: string) => { value: Value | undefined; unit: string }): string {
  return text.replace(PLACEHOLDER, (_m, name: string, filter: string | undefined, arg: string | undefined) => {
    const { value, unit } = lookup(name);
    return applyFilter(value, filter, arg?.trim() === "" ? undefined : arg?.trim(), unit);
  });
}

/** Math spans of a rendered markdown text: `$$...$$` as display, `$...$` as inline. */
export function mathSpans(text: string): { tex: string; display: boolean }[] {
  const out: { tex: string; display: boolean }[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$((?:\\\$|[^$\n])+?)\$/g;
  for (const m of text.matchAll(re)) {
    if (m[1] !== undefined) out.push({ tex: m[1], display: true });
    else if (m[2] !== undefined) out.push({ tex: m[2], display: false });
  }
  return out;
}

export function unitOf(t: Doc, name: string): string {
  for (const p of asArray(t["parameters"]).map(asDoc)) if (str(p["name"]) === name) return str(p["unit"]);
  for (const d of asArray(t["derived"]).map(asDoc)) if (str(d["name"]) === name) return str(d["unit"]);
  const answer = asDoc(t["answer"]);
  if ([answer["value"], answer["re"], answer["im"]].includes(name)) return str(answer["unit"]);
  return "";
}
