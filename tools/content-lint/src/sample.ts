// Deterministic parameter draws for the sampling rules (L05, L11, L12, L13, L18). This is lint
// sampling, not item generation: the worker's generator (doc 07 section 4.1) owns the real
// seeding, so the PRNG here is a small seeded one and only has to be repeatable.
import { createHash } from "node:crypto";

import { evaluate, ExprEvalError, parseExpr, type Env, type Value } from "./expr.ts";
import { asArray, asDoc, str, type Doc } from "./util.ts";

const E_SERIES: Record<string, number[]> = {
  E6: [1.0, 1.5, 2.2, 3.3, 4.7, 6.8],
  E12: [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2],
  E24: [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1],
};

export function rngFor(seed: string): () => number {
  let a = createHash("sha256").update(seed).digest().readUInt32BE(0);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Parameter types lint can draw; undefined for one it cannot (E96), so sampling rules skip. */
function draw(p: Doc, rnd: () => number): Value | undefined {
  const pick = <T>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)] as T;
  const nonzero = p["nonzero"] === true;
  switch (p["type"]) {
    case "int": {
      const lo = Number(p["min"]);
      const hi = Number(p["max"]);
      const c: number[] = [];
      for (let v = lo; v <= hi; v++) if (!(nonzero && v === 0)) c.push(v);
      return c.length > 0 ? pick(c) : undefined;
    }
    case "float": {
      const lo = Number(p["min"]);
      const step = Number(p["step"]);
      const k = Math.round((Number(p["max"]) - lo) / step);
      const c: number[] = [];
      for (let i = 0; i <= k; i++) {
        const v = Number((lo + i * step).toFixed(12));
        if (!(nonzero && v === 0)) c.push(v);
      }
      return c.length > 0 ? pick(c) : undefined;
    }
    case "choice": {
      const values = asArray(p["values"]).filter((v): v is Value => ["string", "number", "boolean"].includes(typeof v));
      return values.length > 0 ? pick(values) : undefined;
    }
    case "e_series": {
      const series = E_SERIES[str(p["series"])];
      if (!series) return undefined;
      const lo = Number(p["decade_min"]);
      const hi = Number(p["decade_max"]);
      return Number((pick(series) * 10 ** (lo + Math.floor(rnd() * (hi - lo + 1)))).toPrecision(12));
    }
    case "bool":
      return rnd() < 0.5;
    default:
      return undefined;
  }
}

export type Draw = {
  env: Env;
  /** Names that evaluated: params, derived and the generator outputs that could be computed. */
  outputs: Set<string>;
  /** All constraints evaluated to true. A constraint that could not be evaluated is not a failure. */
  accepted: boolean;
  /** A constraint or derived value hit a domain error. */
  rejected: boolean;
};

export function outputExprs(t: Doc): Record<string, string> {
  const gen = asDoc(asDoc(t["solution"])["generator"]);
  const out: Record<string, string> = {};
  const outputs = asDoc(gen["outputs"]);
  for (const [k, v] of Object.entries(outputs)) if (typeof v === "string") out[k] = v;
  const readings = asDoc(asDoc(gen["tables"])["readings"]);
  const first = Object.values(readings)[0];
  for (const [k, v] of Object.entries(asDoc(first))) if (typeof v === "string" && !(k in out)) out[k] = v;
  return out;
}

/** The value, or undefined when the expression is invalid, has an unknown name or fails on this draw. */
export function tryEval(expr: string, env: Env): Value | undefined {
  try {
    return evaluate(parseExpr(expr), env);
  } catch {
    return undefined;
  }
}

/** One draw. Returns undefined when a parameter type cannot be drawn. */
function oneDraw(t: Doc, rnd: () => number): Draw | undefined {
  const env: Env = {};
  const names = new Set<string>();
  let rejected = false;
  for (const p of asArray(t["parameters"]).map(asDoc)) {
    const v = draw(p, rnd);
    if (v === undefined) return undefined;
    env[str(p["name"])] = v;
    names.add(str(p["name"]));
  }
  for (const d of asArray(t["derived"]).map(asDoc)) {
    const v = tryEval(str(d["expr"]), env);
    if (v === undefined) rejected = true;
    else {
      env[str(d["name"])] = v;
      names.add(str(d["name"]));
    }
  }
  // In a fault table the table row is picked by the draw of `fault`.
  const gen = asDoc(asDoc(t["solution"])["generator"]);
  const readings = asDoc(asDoc(gen["tables"])["readings"]);
  const row = asDoc(readings[str(env["fault"])]);
  const exprs = Object.keys(readings).length > 0 ? Object.fromEntries(Object.entries(row).filter(([, v]) => typeof v === "string")) as Record<string, string> : outputExprs(t);
  for (const [k, e] of Object.entries(exprs)) {
    const v = tryEval(e, env);
    if (v !== undefined) {
      env[k] = v;
      names.add(k);
    }
  }
  let accepted = !rejected;
  for (const c of asArray(t["constraints"]).map(asDoc)) {
    try {
      if (!evaluate(parseExpr(str(c["expr"])), env)) accepted = false;
    } catch (e) {
      // A domain error rejects the draw; an unknown name (a tool-only value) leaves the constraint undecided.
      if (e instanceof ExprEvalError) {
        accepted = false;
        rejected = true;
      }
    }
  }
  return { env, outputs: names, accepted, rejected };
}

/** `count` consecutive draws (accepted or not), for L05. Undefined if the parameters cannot be drawn. */
export function rawDraws(t: Doc, count: number): Draw[] | undefined {
  const rnd = rngFor(`${str(t["key"])}|${String(t["version"])}|lint`);
  const out: Draw[] = [];
  for (let i = 0; i < count; i++) {
    const d = oneDraw(t, rnd);
    if (!d) return undefined;
    out.push(d);
  }
  return out;
}

/** Up to `want` draws that satisfy the constraints, by rejection sampling (500 tries, doc 07 section 4.2). */
export function validDraws(t: Doc, want: number, maxTries = 500): Draw[] | undefined {
  const rnd = rngFor(`${str(t["key"])}|${String(t["version"])}|lint2`);
  const out: Draw[] = [];
  for (let i = 0; i < maxTries && out.length < want; i++) {
    const d = oneDraw(t, rnd);
    if (!d) return undefined;
    if (d.accepted) out.push(d);
  }
  return out;
}
