// exact_numeric grader (real with units, and rectangular complex). Port of
// polymath-app-spec/reference/verifiers/numeric_grader.py, doc 08 section 2.1. Deterministic, no LLM.
// Messages and result shape match the reference so the two can be diffed (tools/parity/run.sh).

import { evaluateComplex, ExprError, type Complex } from "./complex-expr.ts";
import { convertUnits, UnitDimensionError } from "./units.ts";

const MAX_LEN = 64;
const NUM = /^\s*([+-]?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)\s*(.*?)\s*$/;
// The reference class also lists "^", "µ", "μ" and "Ω", which normalizeUnit has already replaced by then.
const UNIT_OK = /^[A-Za-z/*0-9 .-]{1,24}$/;
const codePoints = (s: string): number => [...s].length;

export interface Tolerance {
  readonly abs?: number;
  readonly rel?: number;
}

/** The template's answer block (doc 08 section 2.1); `unit` is required when `kind` is not "complex". */
export interface NumericSpec {
  readonly kind: "numeric" | "complex";
  readonly unit?: string;
  readonly tolerance: Tolerance;
  readonly bare_number_means?: string | null;
}

/** A `wrong_answer_expr` value for a known mistake: a number, or [re, im] for complex answers. */
export interface WrongAnswer {
  readonly tag: string;
  readonly value: number | Complex;
  readonly feedback_md?: string | null;
}

export interface GraderEntry {
  readonly type: "exact_numeric" | "multiple_choice";
  readonly score: number;
  readonly detail: Readonly<Record<string, unknown>>;
}

/** The reference grade shape. `status` is set only for invalid input (00a D2 and B4 apply to it). */
export interface Grade {
  readonly score: number;
  readonly correct: boolean;
  readonly graders: readonly GraderEntry[];
  readonly feedback: string;
  readonly misconception_tags: readonly string[];
  readonly status?: "invalid_input";
}

/** Input the learner can fix; the message is safe to show. */
class InputError extends Error {}

export function normalizeUnit(u: string): string {
  return u
    .replaceAll("Ω", "ohm")
    .replaceAll("Ω", "ohm")
    .replaceAll("µ", "u")
    .replaceAll("μ", "u")
    .replace(/ohms?\b/gi, "ohm")
    .replaceAll("^", "**")
    .trim();
}

interface RealParse {
  readonly value: number;
  readonly bareNumber: boolean;
  readonly typedUnit: string;
}

function parseReal(text: string, expectedUnit: string, bareNumberMeans: string | null | undefined): RealParse {
  if (codePoints(text) > MAX_LEN) throw new InputError("Answer too long.");
  let t = text.trim();
  const commas = t.split(",").length - 1;
  if (commas > 0 && !t.includes(".") && commas === 1) t = t.replace(",", ".");
  else if (commas > 0) throw new InputError("Please write the number without thousands separators.");
  const m = NUM.exec(t);
  if (!m) throw new InputError("Could not read a number. Example: 3.3 V");
  const typedUnit = m[2] ?? "";
  const num = Number(m[1]);
  let unit = normalizeUnit(typedUnit);
  let bare: boolean;
  if (unit === "") {
    if (!bareNumberMeans) throw new InputError("Please include a unit.");
    unit = bareNumberMeans;
    bare = true;
  } else {
    bare = false;
    if (!UNIT_OK.test(unit)) throw new InputError("Could not read the unit.");
  }
  try {
    return { value: convertUnits(num, unit, expectedUnit), bareNumber: bare, typedUnit };
  } catch (e) {
    if (e instanceof UnitDimensionError) {
      throw new InputError(`The unit '${typedUnit}' has the wrong dimension for this question.`);
    }
    throw new InputError(`Could not interpret the unit '${typedUnit}'.`);
  }
}

export function parseComplex(text: string): Complex {
  const failure = "Could not read the complex number. Example: 3 - 2j";
  let t = text.trim().replaceAll(" ", "");
  if (codePoints(t) > MAX_LEN || t === "") throw new InputError(failure);
  t = t.replace(/(?<![A-Za-z])i(?![A-Za-z])/g, "j");
  if (!/^[0-9+\-.*()jeE]+$/.test(t)) throw new InputError("Use only digits, + - and j. Example: 3 - 2j");
  try {
    return evaluateComplex(t);
  } catch (e) {
    if (e instanceof ExprError) throw new InputError(failure);
    throw e;
  }
}

/** |x - ref| <= max(abs, rel * |ref|) */
export function within(x: number, ref: number, tol: Tolerance): boolean {
  return Math.abs(x - ref) <= Math.max(tol.abs ?? 0, (tol.rel ?? 0) * Math.abs(ref));
}

function grade(score: number, correct: boolean, detail: Record<string, unknown>, feedback: string, tags: string[]): Grade {
  return {
    score,
    correct,
    graders: [{ type: "exact_numeric", score, detail }],
    feedback,
    misconception_tags: tags,
  };
}

/**
 * Grade a typed answer against a reference value: a number for `kind: "numeric"`, [re, im] for `"complex"`.
 * Incorrect answers are compared with each wrong answer for misconception tags. Unreadable input returns
 * the 0/false shape with `detail.parse_error` and `status: "invalid_input"`.
 */
export function gradeExactNumeric(
  response: string,
  spec: NumericSpec,
  ref: number | Complex,
  wrong: readonly WrongAnswer[] = [],
): Grade {
  const tol = spec.tolerance;
  let ok: boolean;
  let detail: Record<string, unknown>;
  let hit: (w: number | Complex) => boolean;
  try {
    if (spec.kind === "complex") {
      if (typeof ref === "number") throw new TypeError("a complex answer needs an [re, im] reference");
      const z = parseComplex(response);
      ok = within(z[0], ref[0], tol) && within(z[1], ref[1], tol);
      detail = { parsed: [z[0], z[1]], reference: [ref[0], ref[1]] };
      hit = (w) => {
        const c: Complex = typeof w === "number" ? [w, 0] : w;
        return within(z[0], c[0], tol) && within(z[1], c[1], tol);
      };
    } else {
      if (typeof ref !== "number") throw new TypeError("a numeric answer needs a number reference");
      if (spec.unit === undefined) throw new TypeError("a numeric answer needs a unit");
      const p = parseReal(response, spec.unit, spec.bare_number_means);
      ok = within(p.value, ref, tol);
      detail = { parsed: p.value, unit: spec.unit, reference: ref, bare_number: p.bareNumber, typed_unit: p.typedUnit };
      hit = (w) => typeof w === "number" && within(p.value, w, tol);
    }
  } catch (e) {
    if (!(e instanceof InputError)) throw e;
    return { ...grade(0, false, { parse_error: e.message }, e.message, []), status: "invalid_input" };
  }
  if (ok) return grade(1, true, detail, "Correct.", []);
  const tags = wrong.filter((w) => hit(w.value)).map((w) => w.tag);
  const feedback =
    wrong.find((w) => tags.includes(w.tag) && w.feedback_md)?.feedback_md ?? "Not quite. Check your method and units.";
  return grade(0, false, detail, feedback, tags);
}
