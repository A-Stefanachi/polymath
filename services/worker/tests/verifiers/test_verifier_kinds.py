"""BL-0051: the verifier registry names the 14 kinds of doc 07 section 5.3 (doc 07 T4, T5).

The eight analytic kinds run in the worker; each has a pass case on an unmodified sample template and a fail
case on a copy with one deliberate defect. The six code and SPICE kinds run in the sandbox runner (CLAUDE.md
rule 7): the worker reports them as `skipped`, and a skipped verifier never yields `verified`.
"""

from __future__ import annotations

import copy
from collections.abc import Callable
from typing import Any

import pytest

from polymath_worker.content import item_writer, tplkit, verify

SAMPLES = tplkit.load_all()
SEED = 11


def _set_output(name: str, expr: str) -> Callable[[dict], None]:
    def mutate(tpl: dict) -> None:
        tpl["solution"]["generator"]["outputs"][name] = expr

    return mutate


def _spec(vid: str, key: str, value: Any) -> Callable[[dict], None]:
    def mutate(tpl: dict) -> None:
        next(v for v in tpl["verifiers"] if v["id"] == vid)["spec"][key] = value

    return mutate


def _swap_table(tpl: dict) -> None:
    tpl["solution"]["generator"]["tables"]["readings"]["r1_open"]["vmid"] = "vs"


def _wide_tolerance_mc(tpl: dict) -> None:
    next(v for v in tpl["verifiers"] if v["kind"] == "distinct_options")["tolerance"] = {"rel": 10.0}


def _bad_dimension(tpl: dict) -> None:
    next(v for v in tpl["verifiers"] if v["kind"] == "pint_dimension")["spec"]["checks"] = [
        {"expr": "vin / (r1 + r2)", "result_unit": "V"}
    ]


# kind -> (sample template, verifier id, mutation that makes the generator or the template wrong)
CASES: dict[str, tuple[str, str, Callable[[dict], None]]] = {
    "sympy_solve": (
        "tpl.elec.voltage-divider-vout",
        "kcl-exact",
        _set_output("vout", "vin * r1 / (r1 + r2)"),
    ),
    "sympy_exact": (
        "tpl.math.complex-division-rectangular",
        "exact-gaussian",
        _set_output("qre", "qa + 1"),
    ),
    "polar_vs_rectangular": (
        "tpl.math.complex-division-rectangular",
        "polar",
        _set_output("qim", "qb + 1"),
    ),
    "pint_dimension": ("tpl.elec.voltage-divider-vout", "dimension", _bad_dimension),
    "bounds": ("tpl.elec.voltage-divider-vout", "window", _spec("window", "hi", "vin / 100")),
    "distinct_options": ("tpl.elec.series-parallel-req-mc", "", _wide_tolerance_mc),
    "sympy_diff_vs_numeric": (
        "tpl.math.derivative-product-sine",
        "finite-difference",
        _set_output("ref", "a*n*x**(n-1)*sin(b*x)"),
    ),
    "fault_uniqueness": ("tpl.elec.divider-fault-drill", "nodal-readings", _swap_table),
}

SANDBOX_SAMPLES = {
    "reference_code_passes": "tpl.sw.debounce-counter-c",
    "model_vs_reference_code": "tpl.sw.debounce-counter-c",
    "golden_vectors": "tpl.sw.debounce-counter-c",
    "mutants_fail": "tpl.sw.debounce-counter-c",
    "spice_vs_closed_form": "tpl.elec.rc-lowpass-netlist",
    "netlist_lint_reference": "tpl.elec.rc-lowpass-netlist",
}


def _verifier(tpl: dict, kind: str) -> dict:
    return next(v for v in tpl["verifiers"] if v["kind"] == kind)


def _run(tpl: dict, kind: str) -> dict:
    item = tplkit.generate_item(tpl, SEED)
    return verify.run_verifier(tpl, item, _verifier(tpl, kind))


def test_registry_names_the_fourteen_kinds():
    assert len(verify.IMPLEMENTED_KINDS) == 14
    assert set(verify.REGISTRY) == set(CASES)
    assert verify.SANDBOX_KINDS == set(SANDBOX_SAMPLES)
    assert not set(verify.REGISTRY) & verify.SANDBOX_KINDS


@pytest.mark.parametrize("kind", sorted(CASES))
def test_kind_passes_on_the_unmodified_sample(kind):
    key, _vid, _mutate = CASES[kind]
    res = _run(SAMPLES[key], kind)
    assert res["status"] == "pass", res


@pytest.mark.parametrize("kind", sorted(CASES))
def test_kind_fails_on_a_defective_template(kind):
    key, _vid, mutate = CASES[kind]
    tpl = copy.deepcopy(SAMPLES[key])
    mutate(tpl)
    res = _run(tpl, kind)
    assert res["status"] == "fail", res
    assert res["detail"]


@pytest.mark.parametrize("kind", sorted(SANDBOX_SAMPLES))
def test_sandbox_kind_is_skipped_never_passed(kind):
    tpl = SAMPLES[SANDBOX_SAMPLES[kind]]
    item = tplkit.generate_item(tpl, SEED)
    res = verify.run_verifier(tpl, item, _verifier(tpl, kind))
    assert res["status"] == "skipped"
    assert "sandbox" in res["detail"]


def test_unknown_kind_is_skipped():
    tpl = SAMPLES["tpl.elec.voltage-divider-vout"]
    item = tplkit.generate_item(tpl, SEED)
    res = verify.run_verifier(tpl, item, {"id": "x", "kind": "option_values_recomputed", "spec": {}})
    assert res["status"] == "skipped"


def test_skipped_verifier_gives_needs_human_review_not_verified():
    # Doc 07 T5 / section 6: the analytic verifiers pass, one skipped verifier remains.
    tpl = copy.deepcopy(SAMPLES["tpl.elec.voltage-divider-vout"])
    tpl["verifiers"].append({"id": "golden", "kind": "golden_vectors", "spec": {}})
    report = verify.verify_item(tpl, SEED)["report"]
    assert report["decision"] == "rejected"
    assert [v["status"] for v in report["verifiers"]][-1] == "skipped"
    assert report["reasons"] == [r for r in report["reasons"] if r.startswith("golden: skipped")]
    assert item_writer.decide_status(report, "verified") == "needs_human_review"


def test_failed_verifier_gives_draft_not_needs_human_review():
    tpl = copy.deepcopy(SAMPLES["tpl.elec.voltage-divider-vout"])
    tpl["solution"]["generator"]["outputs"]["vout"] = "vin * r1 / (r1 + r2)"
    report = verify.verify_item(tpl, SEED)["report"]
    assert item_writer.decide_status(report, "verified") == "draft"
