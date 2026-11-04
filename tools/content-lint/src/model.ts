// What a template declares: its names and where its expressions are. Shared by the rules.
import { asArray, asDoc, str, type Doc } from "./util.ts";
import { outputExprs } from "./sample.ts";

export type ExprRef = {
  path: string;
  expr: string;
  /** Names the expression may use, besides the constants and functions of the grammar. */
  scope: Set<string>;
  /** In a generator output: a conditional expression's bare names are not allowed outside scope either. */
  kind: "expr" | "name";
};

export type Model = {
  params: string[];
  derived: string[];
  outputs: string[];
  /** Names an answer spec points at: answer.value, .re, .im and .reference. */
  answerRefs: string[];
  variables: string[];
  exprs: ExprRef[];
};

const NAME_KEYS = ["output", "correct_output", "target_output", "reference_output", "re_output", "im_output", "numerator", "denominator", "unknown", "variable"];

export function modelOf(t: Doc): Model {
  const params = asArray(t["parameters"]).map((p) => str(asDoc(p)["name"])).filter(Boolean);
  const derivedDocs = asArray(t["derived"]).map(asDoc);
  const derived = derivedDocs.map((d) => str(d["name"])).filter(Boolean);
  const answer = asDoc(t["answer"]);
  const variables = asArray(answer["variables"]).map(str).filter(Boolean);
  const outs = outputExprs(t);
  const outputs = Object.keys(outs);
  const answerRefs = ["value", "re", "im", "reference"].map((k) => str(answer[k])).filter(Boolean);

  const exprs: ExprRef[] = [];
  const base = new Set([...params, ...derived, ...variables]);
  const full = new Set([...base, ...outputs]);

  // Derived values see the parameters and the derived values before them.
  const seen = new Set<string>([...params, ...variables]);
  for (const [i, d] of derivedDocs.entries()) {
    exprs.push({ path: `derived.${String(i)}.expr`, expr: str(d["expr"]), scope: new Set(seen), kind: "expr" });
    seen.add(str(d["name"]));
  }
  const gen = asDoc(asDoc(t["solution"])["generator"]);
  // Outputs are evaluated in order, each seeing the outputs before it; the readings tables come after
  // all outputs (reference/verifiers/tplkit.py, generate_item).
  const outSeen = new Set(base);
  for (const [k, v] of Object.entries(asDoc(gen["outputs"]))) {
    if (typeof v === "string") exprs.push({ path: `solution.generator.outputs.${k}`, expr: v, scope: new Set(outSeen), kind: "expr" });
    outSeen.add(k);
  }
  for (const [row, table] of Object.entries(asDoc(asDoc(gen["tables"])["readings"])))
    for (const [k, v] of Object.entries(asDoc(table))) if (typeof v === "string") exprs.push({ path: `solution.generator.tables.readings.${row}.${k}`, expr: v, scope: outSeen, kind: "expr" });
  for (const [i, c] of asArray(t["constraints"]).map(asDoc).entries()) exprs.push({ path: `constraints.${String(i)}.expr`, expr: str(c["expr"]), scope: full, kind: "expr" });
  for (const [i, o] of asArray(answer["options"]).map(asDoc).entries()) {
    for (const k of ["value_expr", "correct_when"]) if (typeof o[k] === "string") exprs.push({ path: `answer.options.${String(i)}.${k}`, expr: str(o[k]), scope: full, kind: "expr" });
  }
  for (const [i, m] of asArray(t["misconceptions"]).map(asDoc).entries())
    if (typeof m["wrong_answer_expr"] === "string") exprs.push({ path: `misconceptions.${String(i)}.wrong_answer_expr`, expr: str(m["wrong_answer_expr"]), scope: full, kind: "expr" });

  for (const [i, v] of asArray(t["verifiers"]).map(asDoc).entries()) {
    const spec = asDoc(v["spec"]);
    const at = `verifiers.${String(i)}.spec`;
    const scope = new Set([...full, ...asArray(spec["unknowns"]).map(str), ...(typeof spec["variable"] === "string" ? [spec["variable"]] : [])]);
    const add = (path: string, expr: unknown, kind: ExprRef["kind"] = "expr"): void => {
      if (typeof expr === "string") exprs.push({ path: `${at}.${path}`, expr, scope, kind });
    };
    switch (v["kind"]) {
      case "sympy_solve":
        for (const [j, e] of asArray(spec["equations"]).entries()) add(`equations.${String(j)}`, e);
        break;
      case "sympy_exact":
      case "pint_dimension":
        for (const [j, c] of asArray(spec["checks"]).map(asDoc).entries()) add(`checks.${String(j)}.expr`, c["expr"]);
        break;
      case "bounds":
        add("output", spec["output"]);
        add("lo", spec["lo"]);
        add("hi", spec["hi"]);
        break;
      case "sympy_diff_vs_numeric":
        add("function", spec["function"]);
        break;
      case "spice_vs_closed_form":
        add("closed_form", spec["closed_form"]);
        break;
      default:
        break;
    }
    for (const k of NAME_KEYS) if (k !== "output" || v["kind"] !== "bounds") add(k, spec[k], "name");
    for (const [j, c] of asArray(spec["checks"]).map(asDoc).entries()) {
      add(`checks.${String(j)}.output`, c["output"], "name");
      add(`checks.${String(j)}.unknown`, c["unknown"], "name");
    }
  }
  return { params, derived, outputs, answerRefs, variables, exprs };
}
