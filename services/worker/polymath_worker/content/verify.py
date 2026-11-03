"""Template-level verification engine (analytic verifiers), port of
polymath-app-spec/reference/verifiers/verify_template.py (BL-0017). Doc 07 sections 5 to 7.

Kept: the verifier kinds sympy_solve, sympy_exact, polar_vs_rectangular, pint_dimension, bounds,
distinct_options, sympy_diff_vs_numeric and fault_uniqueness, plus self_grade, check_render and verify_item.
Left out on purpose: the code and SPICE verifiers (reference_code_passes, model_vs_reference_code,
golden_vectors, mutants_fail, spice_vs_closed_form, netlist_lint_reference) and the fuzz/CLI driver. They run
gcc or ngspice, and that execution belongs to services/sandbox-runner (CLAUDE.md rule 7). A template that
lists one of them gets status `skipped` for that verifier, which doc 07 section 6 turns into
`needs_human_review`. Differences from the reference: imports, no ALLOW_SKIP switch (a skip is never a
pass) and no `code_cache`.
"""

from __future__ import annotations

import cmath
import datetime as dt
import math
import platform
import time

import mpmath
import numpy as np
import pint
import sympy as sp

from polymath_worker.content import numeric_grader as ng
from polymath_worker.content import safe_expr as se
from polymath_worker.content import symbolic_equiv as sq
from polymath_worker.content import tplkit

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
        names[p["name"]] = (
            ureg.Quantity(item["params"][p["name"]], p["unit"])
            if p.get("unit")
            else item["params"][p["name"]]
        )
    out = []
    for chk in v["spec"]["checks"]:
        q = se.evaluate(
            chk["expr"],
            names,
            funcs={"max": max, "min": min, "abs": abs, "sqrt": lambda x: x**0.5},
            consts={"pi": math.pi},
        )
        try:
            q.to(chk["result_unit"])
        except pint.errors.DimensionalityError as e:
            raise Fail(
                f"'{chk['expr']}' has dimension {q.dimensionality}, expected {chk['result_unit']}"
            ) from e
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
    cases = {
        "ok": (p["r1"], p["r2"]),
        "r1_open": (op, p["r2"]),
        "r2_open": (p["r1"], op),
        "r1_short": (sh, p["r2"]),
        "r2_short": (p["r1"], sh),
    }
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
            sep = any(
                abs(a[k] - b[k]) > max(s["abs_floor"][k], s["min_separation_rel"] * max(abs(a[k]), abs(b[k])))
                for k in a
            )
            if not sep:
                raise Fail(f"faults {names[i]} and {names[j]} are indistinguishable by the readings")
    return {"status": "pass", "faults": len(names)}


REGISTRY = {
    "sympy_solve": v_sympy_solve,
    "sympy_exact": v_sympy_exact,
    "polar_vs_rectangular": v_polar_vs_rectangular,
    "pint_dimension": v_pint_dimension,
    "bounds": v_bounds,
    "distinct_options": v_distinct_options,
    "sympy_diff_vs_numeric": v_sympy_diff_vs_numeric,
    "fault_uniqueness": v_fault_uniqueness,
}


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
            spellings = (
                [f"{ref!r}"]
                if a["unit"] == "dimensionless"
                else [f"{ref!r} {a['unit']}", f"{ref!r}", f"{ref * 1000!r} m{a['unit']}"]
            )
            for m in _wrong_values(tpl, c):
                wr.append(
                    {
                        "tag": m["tag"],
                        "value": float(se.evaluate(m["wrong_answer_expr"], c)),
                        "feedback_md": m.get("feedback_md"),
                    }
                )
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
            if o["id"] != correct and not (
                o.get("correct") or "correct_when" in o and se.evaluate(o["correct_when"], c)
            ):
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
    for _key, text in (tpl.get("hints") or {}).items():
        tplkit.render_text(text, c, u)
    for st in tpl["solution"]["steps"]:
        tplkit.render_text(st["text_md"], c, u)


# ----------------------------------------------------------------------------- driver


def verify_item(tpl: dict, seed: int) -> dict:
    t0 = time.time()
    item = tplkit.generate_item(tpl, seed)
    results, reasons = [], []
    for v in tpl["verifiers"]:
        kind = v["kind"]
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
        results.append(res)
    for r in results:
        if r["status"] != "pass":  # doc 07 section 7, G2: 0 skipped
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
    outputs = {
        k: (str(v) if isinstance(v, (sp.Basic, complex)) else v)
        for k, v in ctx.items()
        if k in (tpl["solution"]["generator"].get("outputs") or {})
    }
    report = {
        "report_version": REPORT_VERSION,
        "template_key": tpl["key"],
        "template_version": tpl["version"],
        "template_sha256": tplkit.template_sha256(tpl),
        "seed": seed,
        "params": item["params"],
        "generated_at": dt.datetime.now(dt.UTC).isoformat(timespec="seconds"),
        "toolchain": {
            "python": platform.python_version(),
            "sympy": sp.__version__,
            "pint": pint.__version__,
            "numpy": np.__version__,
        },
        "generator": {
            "method": tpl["solution"]["generator"]["method"],
            "outputs": outputs,
            "rejections": item["rejections"],
        },
        "verifiers": results,
        "self_grade": sg,
        "decision": "verified" if not reasons else "rejected",
        "reasons": reasons,
        "duration_ms": int((time.time() - t0) * 1000),
    }
    return {"item": item, "report": report}
