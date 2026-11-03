"""Stand-alone demonstration of the independent-recomputation rule for tpl.elec.voltage-divider-vout.

GENERATOR (floating point, closed form):   vout = vin * r2 / (r1 + r2)
VERIFIER  (different method, exact):       solve Kirchhoff's current law at the output node with SymPy rational
                                           arithmetic, and check units/dimensions with pint.
The two share no expression text. A disagreement means the item must not be served.

Run:  python3 voltage_divider_demo.py [seed ...]
"""
from __future__ import annotations

import json
import sys

import pint
import sympy as sp

import tplkit

ureg = pint.UnitRegistry()
TEMPLATE = tplkit.load_all()["tpl.elec.voltage-divider-vout"]


def generate(seed: int, generator=None) -> dict:
    """Sample parameters (deterministic) and compute the answer with the closed-form generator."""
    params, _ctx, _tries = tplkit.sample_params(TEMPLATE, seed)
    gen = generator or (lambda vin, r1, r2: vin * r2 / (r1 + r2))
    return {"seed": seed, "params": params, "answer_V": gen(params["vin"], params["r1"], params["r2"])}


def verify(item: dict) -> dict:
    """Independent recomputation. Returns a verification_report dict (docs/07 section 6)."""
    p = item["params"]
    # 1. dimensional analysis with pint
    vin, r1, r2 = (ureg.Quantity(p["vin"], "V"), ureg.Quantity(p["r1"], "ohm"), ureg.Quantity(p["r2"], "ohm"))
    dim_ok, dim_detail = True, ""
    try:
        (vin * r2 / (r1 + r2)).to("V")
        (vin / (r1 + r2)).to("A")
    except pint.errors.DimensionalityError as e:
        dim_ok, dim_detail = False, str(e)
    # 2. exact nodal analysis: (vin - vo)/r1 = vo/r2, rational arithmetic
    vo = sp.Symbol("vo")
    exact = {k: sp.Rational(repr(v)) for k, v in p.items()}
    sol = sp.solve(sp.Eq((exact["vin"] - vo) / exact["r1"], vo / exact["r2"]), vo)
    recomputed = sol[0]
    delta = abs(float(recomputed) - item["answer_V"])
    agree = delta <= 1e-9 * max(1.0, abs(item["answer_V"]))
    return {
        "report_version": 1, "template_key": TEMPLATE["key"], "seed": item["seed"],
        "verifiers": [
            {"id": "kcl-exact", "kind": "sympy_solve", "status": "pass" if agree else "fail",
             "generator": item["answer_V"], "recomputed": float(recomputed), "recomputed_exact": str(recomputed), "delta": delta},
            {"id": "dimension", "kind": "pint_dimension", "status": "pass" if dim_ok else "fail", "detail": dim_detail},
        ],
        "decision": "verified" if (agree and dim_ok) else "rejected",
    }


if __name__ == "__main__":
    seeds = [int(a) for a in sys.argv[1:]] or [1, 2, 3]
    for s in seeds:
        it = generate(s)
        print(json.dumps({"item": it, "report": verify(it)}, indent=2))
