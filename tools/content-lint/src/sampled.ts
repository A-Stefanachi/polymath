// Rules that need sampled draws: L05, L11, L12, L13. A rule that cannot decide (a name that needs
// a tool, a parameter type lint cannot draw) says nothing; the fuzz gate (G2) covers those.
import { distance, type Value } from "./expr.ts";
import { placeholders } from "./render.ts";
import { rawDraws, tryEval, validDraws } from "./sample.ts";
import type { Ctx } from "./rules.ts";
import { asArray, asDoc, str } from "./util.ts";

export function l05({ t }: Ctx): string[] {
  if (asArray(t["constraints"]).length === 0) return [];
  const draws = rawDraws(t, 20);
  if (!draws) return [];
  return draws.some((d) => d.accepted) ? [] : ["no constraint set is true for any of 20 sampled draws: the constraints are vacuous or impossible"];
}

function answerValue(t: Record<string, unknown>, env: Record<string, Value>): Value | undefined {
  const answer = asDoc(t["answer"]);
  if (answer["kind"] === "complex") {
    const re = env[str(answer["re"])];
    const im = env[str(answer["im"])];
    return typeof re === "number" && typeof im === "number" ? { re, im } : undefined;
  }
  return env[str(answer["value"])];
}

export function l11({ t }: Ctx): string[] {
  if (t["grader_type"] !== "exact_numeric") return [];
  const out: string[] = [];
  const tol = asDoc(asDoc(t["answer"])["tolerance"]);
  const rel = typeof tol["rel"] === "number" ? tol["rel"] : undefined;
  const abs = typeof tol["abs"] === "number" ? tol["abs"] : undefined;
  if (rel === undefined && abs === undefined) out.push("answer.tolerance needs rel or abs");
  if (rel !== undefined && rel > 0.05) out.push(`answer.tolerance.rel ${String(rel)} is above 0.05`);
  const draws = validDraws(t, 20);
  if (!draws) return out;
  for (const m of asArray(t["misconceptions"]).map(asDoc)) {
    if (typeof m["wrong_answer_expr"] !== "string") continue;
    for (const d of draws) {
      const ref = answerValue(t, d.env);
      const wrong = tryEval(m["wrong_answer_expr"], d.env);
      if (ref === undefined || wrong === undefined) continue;
      const mag = typeof ref === "object" ? Math.hypot(ref.re, ref.im) : Math.abs(Number(ref));
      const limit = 3 * Math.max(abs ?? 0, (rel ?? 0) * mag);
      if (distance(wrong, ref) <= limit) {
        out.push(`${str(m["tag"])}: wrong_answer_expr is within 3 x tolerance of the answer (${String(wrong)} against ${String(ref)}); the wrong answer would be accepted`);
        break;
      }
    }
  }
  return out;
}

export function l12({ t, model }: Ctx): string[] {
  const out: string[] = [];
  const hints = asDoc(t["hints"]);
  const outputs = new Set(model.outputs);
  const named = new Set(model.answerRefs);
  const draws = validDraws(t, 20) ?? [];
  const answers = draws.map((d) => answerValue(t, d.env)).filter((v): v is Value => v !== undefined);
  for (const level of ["l1", "l2", "l3"] as const) {
    for (const p of placeholders(str(hints[level]))) {
      if (level !== "l3" && outputs.has(p.name)) out.push(`hints.${level}: {{${p.name}}} is a generator output`);
      else if (level === "l3" && named.has(p.name)) out.push(`hints.${level}: {{${p.name}}} is named in the answer spec`);
      else if (level !== "l3" && draws.length > 0 && answers.length === draws.length) {
        // A parameter or derived value that equals the final answer on every draw gives it away.
        const same = draws.every((d, i) => {
          const v = d.env[p.name];
          const a = answers[i];
          return v !== undefined && a !== undefined && typeof v !== "string" && typeof v !== "boolean" && distance(v, a) <= 1e-9 * Math.max(1, Math.abs(Number(typeof a === "object" ? a.re : a)));
        });
        if (same) out.push(`hints.${level}: {{${p.name}}} equals the final answer`);
      }
    }
  }
  return out;
}

export function l13({ t }: Ctx): string[] {
  if (t["grader_type"] !== "multiple_choice") return [];
  const out: string[] = [];
  const answer = asDoc(t["answer"]);
  const options = asArray(answer["options"]).map(asDoc);
  if (typeof answer["n_shown"] === "number" && answer["n_shown"] > options.length) out.push(`n_shown ${String(answer["n_shown"])} is more than the ${String(options.length)} options`);
  for (const o of options) {
    const maybeWrong = o["correct"] !== true || typeof o["correct_when"] === "string";
    if (maybeWrong && (str(o["misconception_tag"]) === "" || str(o["feedback_md"]) === ""))
      out.push(`option ${str(o["id"])} can be wrong and needs misconception_tag and feedback_md`);
  }
  const conditional = options.some((o) => typeof o["correct_when"] === "string");
  if (!conditional) {
    const n = options.filter((o) => o["correct"] === true).length;
    if (n !== 1) out.push(`${String(n)} options are marked correct; exactly one is needed`);
    return out;
  }
  const draws = validDraws(t, 20) ?? [];
  for (const [i, d] of draws.entries()) {
    const flags = options.map((o) => {
      if (typeof o["correct_when"] === "string") {
        const v = tryEval(o["correct_when"], d.env);
        return v === undefined ? undefined : Boolean(v);
      }
      return o["correct"] === true;
    });
    if (flags.includes(undefined)) break;
    const n = flags.filter(Boolean).length;
    if (n !== 1) {
      out.push(`draw ${String(i + 1)} has ${String(n)} correct options; exactly one is needed`);
      break;
    }
  }
  return out;
}
