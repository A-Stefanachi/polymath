"""Template-level verification engine (reference). Implements the verifier kinds used by the sample templates,
the self-grade and wrong-answer gates, and the 200-sample fuzz run. See docs/07 sections 5 to 8.

Usage:
  python3 verify_template.py [--samples N] [--only KEY] [template.yaml ...]
Exit code 0 only if every selected template passes every gate.
"""
from __future__ import annotations

import argparse
import cmath
import datetime as dt
import math
import platform
import shutil
import sys
import time
from pathlib import Path

import mpmath
import numpy as np
import pint
import sympy as sp

import code_runner
import numeric_grader as ng
import safe_expr as se
import spice_check
import symbolic_equiv as sq
import tplkit

ALLOW_SKIP = False  # local work only; set by --allow-skip, never in CI

ureg = pint.UnitRegistry()
REPORT_VERSION = 1


class Fail(Exception):
    pass


def _tol_ok(a, b, tol) -> bool:
    tol = tol or {"rel": 1e-9, "abs": 1e-12}
    return abs(a - b) <= max(tol.get("abs", 0.0), tol.get("rel", 0.0) * abs(b))


def _exact_ctx(tpl, params):
    syms = tplkit._symbols(tpl)
    return tplkit.build_context(tpl, params, "sympy", syms)


# ----------------------------------------------------------------------------- verifier kinds
# Each returns a dict {status: pass|fail, detail...}. Raising Fail or se.ExprError means status fail.

def v_sympy_solve(tpl, item, v):
    spec = v["spec"]
    ex = _exact_ctx(tpl, item["params"])
    unknowns = [sp.Symbol(u) for u in spec["unknowns"]]
    ns = {**ex, **{str(u): u for u in unknowns}}
    eqs = [se.evaluate(e, ns, se.sympy_funcs(), se.sympy_consts()) for e in spec["equations"]]
    sol = sp.solve(eqs, unknowns, dict=True)
    if len(sol) != 1:
        raise Fail(f"expected a unique solution, got {sol}")
    out = []
    for chk in spec["checks"]:
        val = sol[0][sp.Symbol(chk["unknown"])]
        gen = item["_ctx"][chk["output"]]
        if not _tol_ok(float(val), float(gen), v.get("tolerance")):
            raise Fail(f"{chk['unknown']}: recomputed {float(val)!r} vs generator {float(gen)!r}")
        out.append({"unknown": chk["unknown"], "recomputed": float(val), "generator": float(gen)})
    return {"status": "pass", "checks": out}


def v_sympy_exact(tpl, item, v):
    ex = _exact_ctx(tpl, item["params"])
    gen_ctx = item["_ctx"]
    out = []
    for chk in v["spec"]["checks"]:
        rec = se.evaluate(chk["expr"], ex, se.sympy_funcs(allow_diff=True), se.sympy_consts())
        gen = gen_ctx[chk["output"]]
        if isinstance(gen, sp.Basic) and gen.free_symbols:
            diff = sp.simplify(rec - gen)
            if diff != 0:
                raise Fail(f"{chk['output']}: symbolic difference {diff}")
            out.append({"output": chk["output"], "method": "symbolic_zero"})
        else:
            r = complex(sp.N(rec))
            g = complex(gen)
            if abs(r - g) > max(1e-9, 1e-9 * abs(g)):
                raise Fail(f"{chk['output']}: recomputed {r} vs generator {g}")
            out.append({"output": chk["output"], "recomputed": str(rec), "generator": str(gen)})
    return {"status": "pass", "checks": out}


def v_polar_vs_rectangular(tpl, item, v):
    s, c = v["spec"], item["_ctx"]
    n, d = complex(c[s["numerator"]]), complex(c[s["denominator"]])
    rn, tn = cmath.polar(n)
    rd, td = cmath.polar(d)
    q = cmath.rect(rn / rd, tn - td)
    tol = v.get("tolerance", {"abs": 1e-9})
    if not (_tol_ok(q.real, c[s["re_output"]], tol) and _tol_ok(q.imag, c[s["im_output"]], tol)):
        raise Fail(f"polar quotient {q} vs generator ({c[s['re_output']]}, {c[s['im_output']]})")
    return {"status": "pass", "recomputed": [q.real, q.imag]}


def v_pint_dimension(tpl, item, v):
    names = {}
    for p in tpl["parameters"]:
        names[p["name"]] = ureg.Quantity(item["params"][p["name"]], p["unit"]) if p.get("unit") else item["params"][p["name"]]
    out = []
    for chk in v["spec"]["checks"]:
        q = se.evaluate(chk["expr"], names, funcs={"max": max, "min": min, "abs": abs, "sqrt": lambda x: x ** 0.5}, consts={"pi": math.pi})
        try:
            q.to(chk["result_unit"])
        except pint.errors.DimensionalityError as e:
            raise Fail(f"'{chk['expr']}' has dimension {q.dimensionality}, expected {chk['result_unit']}") from e
        out.append({"expr": chk["expr"], "dimension": str(q.dimensionality)})
    return {"status": "pass", "checks": out}


def v_bounds(tpl, item, v):
    s, c = v["spec"], item["_ctx"]
    val = se.evaluate(s["output"], c)
    lo, hi = se.evaluate(s["lo"], c), se.evaluate(s["hi"], c)
    strict = s.get("strict", False)
    ok = (lo < val < hi) if strict else (lo <= val <= hi)
    if not ok:
        raise Fail(f"{s['output']} = {val} outside [{lo}, {hi}]")
    return {"status": "pass", "value": float(val) if not isinstance(val, complex) else str(val)}


def v_distinct_options(tpl, item, v):
    ans, c = tpl["answer"], item["_ctx"]
    correct = tplkit.correct_option_id(tpl, c)
    vals = tplkit.option_values(tpl, c)
    rel = v.get("tolerance", {}).get("rel", ans.get("min_separation_rel", 0))
    items = list(vals.items())
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            a, b = items[i][1], items[j][1]
            if abs(a - b) < rel * max(abs(a), abs(b)):
                raise Fail(f"options {items[i][0]} and {items[j][0]} are within {rel:.0%}")
    co = v["spec"]["correct_output"]
    if co in c and correct in vals and isinstance(c[co], (int, float)):
        if not _tol_ok(vals[correct], c[co], {"rel": 1e-9}):
            raise Fail("correct option value differs from verified output")
    return {"status": "pass", "correct_option": correct, "n_options": len(ans["options"])}


def v_sympy_diff_vs_numeric(tpl, item, v):
    s = v["spec"]
    ex = _exact_ctx(tpl, item["params"])
    x = ex[s["variable"]]
    f = sp.lambdify(x, se.evaluate(s["function"], ex, se.sympy_funcs(), se.sympy_consts()), "mpmath")
    r = sp.lambdify(x, item["_ctx"][s["reference_output"]], "mpmath")
    mpmath.mp.dps = 30
    worst = 0.0
    for p in s["points"]:
        num = mpmath.diff(f, mpmath.mpf(p))
        ref = r(mpmath.mpf(p))
        err = abs(num - ref) / max(1, abs(ref))
        worst = max(worst, float(err))
        if err > v["tolerance"]["rel"]:
            raise Fail(f"at x={p}: numeric derivative {num} vs reference {ref}")
    return {"status": "pass", "worst_rel_error": worst}


def _mna_divider(vs, r1, r2):
    # Node 0 = ground, node 1 = supply (fixed), node 2 = midpoint. Solve G v = i for the midpoint only.
    g1, g2 = 1.0 / r1, 1.0 / r2
    G = np.array([[g1 + g2]])
    b = np.array([g1 * vs])
    vmid = float(np.linalg.solve(G, b)[0])
    return {"vmid": vmid, "i": (vs - vmid) * g1}


def v_fault_uniqueness(tpl, item, v):
    s = v["spec"]
    if s["circuit"] != "series_divider":
        raise Fail("unknown circuit solver")
    p = item["params"]
    op, sh = s["open_ohm"], s["short_ohm"]
    cases = {"ok": (p["r1"], p["r2"]), "r1_open": (op, p["r2"]), "r2_open": (p["r1"], op), "r1_short": (sh, p["r2"]), "r2_short": (p["r1"], sh)}
    table = tpl["solution"]["generator"]["tables"]["readings"]
    reads = {}
    for fault, (r1, r2) in cases.items():
        num = _mna_divider(p["vs"], r1, r2)
        row = {k: float(se.evaluate(e, item["_ctx"] | {"fault": fault})) for k, e in table[fault].items()}
        for k in row:
            tol = max(v["tolerance"]["rel"] * abs(row[k]), 0.01 * s["abs_floor"][k])
            if abs(num[k] - row[k]) > tol:
                raise Fail(f"{fault}.{k}: nodal {num[k]!r} vs table {row[k]!r}")
        reads[fault] = row
    names = list(reads)
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            a, b = reads[names[i]], reads[names[j]]
            sep = any(abs(a[k] - b[k]) > max(s["abs_floor"][k], s["min_separation_rel"] * max(abs(a[k]), abs(b[k]))) for k in a)
            if not sep:
                raise Fail(f"faults {names[i]} and {names[j]} are indistinguishable by the readings")
    return {"status": "pass", "faults": len(names)}


# --- code_tests
def _skip_without_gcc():
    if shutil.which("gcc") is None:
        return {"status": "skipped", "detail": "gcc not installed (reference dev skip)"}
    return None


def _code_ctx(tpl, item):
    a = tpl["answer"]
    order = [p["name"] for p in tpl["parameters"]]
    return a, order


def _grid(spec):
    keys = list(spec["param_grid"])
    out = [{}]
    for k in keys:
        out = [{**o, k: val} for o in out for val in spec["param_grid"][k]]
    return out


def v_reference_code_passes(tpl, item, v):
    skip = _skip_without_gcc()
    if skip:
        return skip
    a, order = _code_ctx(tpl, item)
    comp = code_runner.compile_submission(a["header"], a["reference_solution"], code_runner.DEFAULT_HARNESS, a["compile"], a["limits"])
    try:
        if not comp.ok:
            raise Fail("reference does not compile: " + comp.diagnostics[:300])
        n = 0
        for params in _grid(v["spec"]):
            for g in ("visible", "hidden"):
                for case in a["tests"][g]:
                    exp = code_runner.expected_for(a, params, case["input"])
                    r = code_runner.run_case(comp, code_runner.stdin_for(params, case["input"], order), a["limits"])
                    if r["status"] != "ok" or r["output"] != exp:
                        raise Fail(f"{case['id']} with {params}: got {r}, expected {exp}")
                    n += 1
    finally:
        comp.cleanup()
    return {"status": "pass", "executions": n}


def v_model_vs_reference_code(tpl, item, v):
    import random

    skip = _skip_without_gcc()
    if skip:
        return skip
    a, order = _code_ctx(tpl, item)
    rng = random.Random(99)
    comp = code_runner.compile_submission(a["header"], a["reference_solution"], code_runner.DEFAULT_HARNESS, a["compile"], a["limits"])
    n = 0
    try:
        for params in _grid(v["spec"]):
            for _ in range(20):
                s = "".join(rng.choice("01") if rng.random() < 0.5 else "0" for _ in range(rng.randint(5, 80)))
                s = "".join(("1" if rng.random() < 0.35 else "0") if i % 5 else s[i] for i, _c in enumerate(s))
                exp = code_runner.expected_for(a, params, s)
                r = code_runner.run_case(comp, code_runner.stdin_for(params, s, order), a["limits"])
                if r["output"] != exp:
                    raise Fail(f"differential mismatch on {s!r} with {params}: C={r['output']} model={exp}")
                n += 1
    finally:
        comp.cleanup()
    return {"status": "pass", "random_sequences": n}


def v_golden_vectors(tpl, item, v):
    a = tpl["answer"]
    for g in a["tests"]["golden"]:
        got = code_runner.expected_for(a, g["params"], g["input"])
        if got != g["expected"]:
            raise Fail(f"model gives {got} for {g['input']} with {g['params']}, golden says {g['expected']}")
    return {"status": "pass", "vectors": len(a["tests"]["golden"])}


def v_mutants_fail(tpl, item, v):
    skip = _skip_without_gcc()
    if skip:
        return skip
    a, order = _code_ctx(tpl, item)
    killed = {}
    for m in a["mutants"]:
        comp = code_runner.compile_submission(a["header"], m["source"], code_runner.DEFAULT_HARNESS, a["compile"], a["limits"])
        try:
            if not comp.ok:
                raise Fail(f"mutant {m['id']} does not compile: {comp.diagnostics[:200]}")
            by = set()
            for params in _grid(v["spec"]):
                for case in a["tests"]["hidden"]:
                    exp = code_runner.expected_for(a, params, case["input"])
                    r = code_runner.run_case(comp, code_runner.stdin_for(params, case["input"], order), a["limits"])
                    if r["output"] != exp:
                        by.add(case["id"])
            if not by:
                raise Fail(f"mutant {m['id']} survives all hidden tests")
            killed[m["id"]] = sorted(by)
        finally:
            comp.cleanup()
    return {"status": "pass", "killed_by": killed}


# --- spice
def v_spice_vs_closed_form(tpl, item, v):
    if shutil.which("ngspice") is None:
        return {"status": "skipped", "detail": "ngspice not installed (reference dev skip)"}
    a, s, c = tpl["answer"], v["spec"], item["_ctx"]
    deck = spice_check.lint_netlist(spice_check.render(a["reference_netlist"], c), a)
    if not deck["ok"]:
        raise Fail("reference netlist fails lint: " + "; ".join(deck["errors"]))
    run = spice_check.run_ngspice(deck["deck_lines"], a["analysis"]["grader_directives"], a["limits"]["run_s"])
    if not run["ok"] or s["measure"] not in run["measures"]:
        raise Fail("ngspice failed: " + run["log"][-200:])
    sim = run["measures"][s["measure"]]
    closed = float(se.evaluate(s["closed_form"], c))
    target = float(c[s["target_output"]])
    if not _tol_ok(sim, closed, v["tolerance"]) or not _tol_ok(sim, target, v["tolerance"]):
        raise Fail(f"ngspice {sim!r} vs closed form {closed!r} vs target {target!r}")
    return {"status": "pass", "simulated_hz": sim, "closed_form_hz": closed}


def v_netlist_lint_reference(tpl, item, v):
    if shutil.which("ngspice") is None:
        return {"status": "skipped", "detail": "ngspice not installed (reference dev skip)"}
    a, c = tpl["answer"], item["_ctx"]
    ref = spice_check.render(a["reference_netlist"], c)
    g = spice_check.grade_spice(ref, a, c)
    if not g["correct"]:
        raise Fail("reference netlist does not pass its own grader: " + g["feedback"])
    bad = ref.replace(spice_check.render("{{r_ideal|spice}}", c), repr(c["r_ideal"] * 2.0))
    gb = spice_check.grade_spice(bad, a, c)
    if gb["correct"]:
        raise Fail("a netlist with R doubled was graded correct")
    return {"status": "pass", "reference_score": g["score"], "doubled_R_score": gb["score"]}


REGISTRY = {
    "sympy_solve": v_sympy_solve, "sympy_exact": v_sympy_exact, "polar_vs_rectangular": v_polar_vs_rectangular,
    "pint_dimension": v_pint_dimension, "bounds": v_bounds, "distinct_options": v_distinct_options,
    "sympy_diff_vs_numeric": v_sympy_diff_vs_numeric, "fault_uniqueness": v_fault_uniqueness,
    "reference_code_passes": v_reference_code_passes, "model_vs_reference_code": v_model_vs_reference_code,
    "golden_vectors": v_golden_vectors, "mutants_fail": v_mutants_fail,
    "spice_vs_closed_form": v_spice_vs_closed_form, "netlist_lint_reference": v_netlist_lint_reference,
}
# Code-template checks depend only on the template and the fixed parameter grid, so they run once per fuzz run.
# SPICE checks depend on each item's parameters and run for every sample.
ITEM_LEVEL_ONCE = {"reference_code_passes", "model_vs_reference_code", "golden_vectors", "mutants_fail"}


# ----------------------------------------------------------------------------- self-grade and wrong answers

def _wrong_values(tpl, ctx):
    out = []
    for m in tpl.get("misconceptions", []):
        if "wrong_answer_expr" in m:
            out.append(m)
    return out


def self_grade(tpl, item) -> dict:
    """Grade the reference answer (must be correct, in several spellings) and each wrong_answer_expr (must be rejected and tagged)."""
    g, a, c = tpl["grader_type"], tpl["answer"], item["_ctx"]
    rec = {"checked": [], "wrong_answers": []}
    if g == "exact_numeric":
        wr = []
        if a["kind"] == "numeric":
            ref = float(c[a["value"]])
            spellings = [f"{ref!r}"] if a["unit"] == "dimensionless" else [f"{ref!r} {a['unit']}", f"{ref!r}", f"{ref * 1000!r} m{a['unit']}"]
            for m in _wrong_values(tpl, c):
                wr.append({"tag": m["tag"], "value": float(se.evaluate(m["wrong_answer_expr"], c)), "feedback_md": m.get("feedback_md")})
            wrong_texts = [(w, f"{w['value']!r} {a['unit']}") for w in wr]
        else:
            ref = complex(c[a["re"]], c[a["im"]])
            spellings = [f"{ref.real:g}{ref.imag:+g}j", f"{ref.real:g} + {ref.imag:g}i".replace("+ -", "- ")]
            for m in _wrong_values(tpl, c):
                z = complex(se.evaluate(m["wrong_answer_expr"], c))
                wr.append({"tag": m["tag"], "value": z, "feedback_md": m.get("feedback_md")})
            wrong_texts = [(w, f"{w['value'].real:g}{w['value'].imag:+g}j") for w in wr]
        for sp_ in spellings:
            r = ng.grade_exact_numeric(sp_, a, ref, wr)
            if not r["correct"]:
                raise Fail(f"reference answer {sp_!r} graded wrong: {r['feedback']}")
            rec["checked"].append(sp_)
        for w, text in wrong_texts:
            r = ng.grade_exact_numeric(text, a, ref, wr)
            if r["correct"]:
                raise Fail(f"misconception answer {w['tag']} ({text}) is accepted as correct")
            if w["tag"] not in r["misconception_tags"]:
                raise Fail(f"misconception answer {w['tag']} was not tagged")
            rec["wrong_answers"].append({"tag": w["tag"], "text": text, "rejected": True, "tagged": True})
    elif g == "symbolic_equivalence":
        ref = c[a["reference"]]
        spec = {**a}
        wr = [{"tag": m["tag"], "expr": m["wrong_answer_expr"].replace("**", "^"), "feedback_md": m.get("feedback_md", "")} for m in _wrong_values(tpl, c)]
        # wrong answers are written in terms of template parameters: substitute exact values
        ex = _exact_ctx(tpl, item["params"])
        wr_s = []
        for m in _wrong_values(tpl, c):
            e = se.evaluate(m["wrong_answer_expr"], ex, se.sympy_funcs(), se.sympy_consts())
            wr_s.append({"tag": m["tag"], "expr": e, "feedback_md": m.get("feedback_md", ""), "text": str(e)})
        spellings = [str(ref).replace("**", "^"), str(sp.expand(ref)).replace("**", "^")]
        for t in spellings:
            r = sq.check_equivalent(t, ref, spec, [])
            if not r["correct"]:
                raise Fail(f"reference answer {t!r} graded wrong: {r['feedback']}")
            rec["checked"].append(t)
        for w in wr_s:
            r = sq.check_equivalent(w["text"].replace("**", "^"), ref, spec, wr_s)
            if r["correct"]:
                raise Fail(f"misconception answer {w['tag']} is accepted as correct")
            if w["tag"] not in r["misconception_tags"]:
                raise Fail(f"misconception answer {w['tag']} was not tagged")
            rec["wrong_answers"].append({"tag": w["tag"], "rejected": True, "tagged": True})
    elif g == "multiple_choice":
        correct = tplkit.correct_option_id(tpl, c)
        rec["checked"].append(correct)
        for o in a["options"]:
            if o["id"] != correct and not (o.get("correct") or "correct_when" in o and se.evaluate(o["correct_when"], c)):
                if "misconception_tag" not in o or "feedback_md" not in o:
                    raise Fail(f"option {o['id']} lacks misconception_tag or feedback_md")
    return rec


def check_render(tpl, item):
    r = item["rendered"]
    for k in ("stem_md", "alt_text"):
        if "{{" in r[k] or "}}" in r[k].replace("}}$", "").replace("} }", "") and "{{" in r[k]:
            raise Fail(f"unresolved placeholder in {k}: {r[k][:120]}")
    for k in ("stem_md", "alt_text"):
        if "nan" in r[k].lower().split() or "inf" in r[k].lower().split():
            raise Fail(f"non-finite number rendered in {k}")
    # hints and solution steps must render
    c, u = item["_ctx"], tplkit.unit_map(tpl)
    for key, text in (tpl.get("hints") or {}).items():
        tplkit.render_text(text, c, u)
    for st in tpl["solution"]["steps"]:
        tplkit.render_text(st["text_md"], c, u)


# ----------------------------------------------------------------------------- driver

def verify_item(tpl: dict, seed: int, code_cache: dict | None = None) -> dict:
    t0 = time.time()
    item = tplkit.generate_item(tpl, seed)
    results, reasons = [], []
    for v in tpl["verifiers"]:
        kind = v["kind"]
        if kind in ITEM_LEVEL_ONCE and code_cache is not None and v["id"] in code_cache:
            results.append(code_cache[v["id"]])
            continue
        fn = REGISTRY.get(kind)
        t1 = time.time()
        if fn is None:
            res = {"status": "skipped", "detail": f"no implementation for {kind}"}
        else:
            try:
                res = fn(tpl, item, v)
            except (Fail, se.ExprError, KeyError, ZeroDivisionError, ValueError) as e:
                res = {"status": "fail", "detail": str(e)}
        res = {"id": v["id"], "kind": kind, **res, "ms": int((time.time() - t1) * 1000)}
        if kind in ITEM_LEVEL_ONCE and code_cache is not None:
            code_cache[v["id"]] = res
        results.append(res)
    for r in results:
        if r["status"] != "pass" and not (ALLOW_SKIP and r["status"] == "skipped"):  # doc 07 section 7, G2: 0 skipped
            reasons.append(f"{r['id']}: {r['status']} {r.get('detail', '')}")
    sg = None
    try:
        check_render(tpl, item)
        sg = self_grade(tpl, item)
    except Fail as e:
        reasons.append(f"self-check: {e}")
    except (se.ExprError, KeyError) as e:
        reasons.append(f"self-check error: {e!r}")
    ctx = item["_ctx"]
    outputs = {k: (str(v) if isinstance(v, (sp.Basic, complex)) else v) for k, v in ctx.items() if k in (tpl["solution"]["generator"].get("outputs") or {})}
    report = {
        "report_version": REPORT_VERSION, "template_key": tpl["key"], "template_version": tpl["version"],
        "template_sha256": tplkit.template_sha256(tpl), "seed": seed, "params": item["params"],
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "toolchain": {"python": platform.python_version(), "sympy": sp.__version__, "pint": pint.__version__, "numpy": np.__version__},
        "generator": {"method": tpl["solution"]["generator"]["method"], "outputs": outputs, "rejections": item["rejections"]},
        "verifiers": results, "self_grade": sg, "decision": "verified" if not reasons else "rejected", "reasons": reasons,
        "duration_ms": int((time.time() - t0) * 1000),
    }
    return {"item": item, "report": report}


def fuzz(tpl: dict, samples: int | None = None) -> dict:
    n = samples or tpl["fuzz"]["samples"]
    base = tpl["fuzz"]["seed_base"]
    cache: dict = {}
    failures, rejections, distinct, ms = [], 0, set(), 0
    for i in range(n):
        seed = base + i
        try:
            r = verify_item(tpl, seed, cache)
        except RuntimeError as e:
            failures.append({"seed": seed, "reasons": [str(e)]})
            continue
        rejections += r["report"]["generator"]["rejections"]
        distinct.add(tuple(sorted((k, str(v)) for k, v in r["item"]["params"].items())))
        ms += r["report"]["duration_ms"]
        if r["report"]["decision"] != "verified":
            failures.append({"seed": seed, "reasons": r["report"]["reasons"]})
    total_draws = n + rejections
    rej_rate = rejections / total_draws
    summary = {"template": tpl["key"], "samples": n, "failures": len(failures), "first_failures": failures[:3],
               "rejection_rate": round(rej_rate, 3), "distinct_param_sets": len(distinct), "avg_ms": round(ms / n, 1)}
    if rej_rate > tpl["fuzz"].get("max_rejection_rate", 0.5):
        summary["failures"] += 1
        summary["first_failures"].append({"reasons": [f"rejection rate {rej_rate:.2f} exceeds {tpl['fuzz'].get('max_rejection_rate', 0.5)}"]})
    if n >= tpl["fuzz"]["samples"] and len(distinct) < tpl["fuzz"].get("min_distinct_param_sets", 1):
        summary["failures"] += 1
        summary["first_failures"].append({"reasons": [f"only {len(distinct)} distinct parameter sets"]})
    return summary


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--samples", type=int)
    ap.add_argument("--only")
    ap.add_argument("--allow-skip", action="store_true")
    ap.add_argument("files", nargs="*")
    args = ap.parse_args(argv)
    global ALLOW_SKIP
    ALLOW_SKIP = args.allow_skip
    tpls = [tplkit.load_template(f) for f in args.files] if args.files else list(tplkit.load_all().values())
    bad = 0
    for t in tpls:
        if args.only and t["key"] != args.only:
            continue
        s = fuzz(t, args.samples)
        print(("PASS " if s["failures"] == 0 else "FAIL ") + f"{s['template']:46s} samples={s['samples']} failures={s['failures']} "
              f"rejection_rate={s['rejection_rate']} distinct={s['distinct_param_sets']} avg_ms={s['avg_ms']}")
        for f in s["first_failures"]:
            print("     ", f)
        bad += s["failures"] > 0
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
