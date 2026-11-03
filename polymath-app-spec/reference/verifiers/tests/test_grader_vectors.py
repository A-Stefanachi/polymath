"""Executes the shared vectors in grader_vectors.json (the same file the TypeScript client port must pass)."""
import json
from pathlib import Path

import pytest
import sympy as sp

import numeric_grader as ng
import symbolic_equiv as sq

V = json.loads((Path(__file__).parent / "grader_vectors.json").read_text(encoding="utf-8"))


def _cases(section):
    return [pytest.param(c, id=f"{section}:{c['input'][:30]!r}") for c in V[section]["cases"]]


def _check(grade, case):
    assert grade["correct"] is case["correct"]
    detail = grade["graders"][0]["detail"]
    is_invalid = "parse_error" in detail
    assert is_invalid is bool(case.get("invalid", False)), detail


@pytest.mark.parametrize("case", _cases("numeric"))
def test_numeric_vectors(case):
    _check(ng.grade_exact_numeric(case["input"], V["numeric"]["spec"], V["numeric"]["reference"]), case)


@pytest.mark.parametrize("case", _cases("complex"))
def test_complex_vectors(case):
    ref = complex(*V["complex"]["reference"])
    _check(ng.grade_exact_numeric(case["input"], V["complex"]["spec"], ref), case)


@pytest.mark.parametrize("case", _cases("symbolic"))
def test_symbolic_vectors(case):
    x = sp.Symbol("x", real=True)
    ref = sp.sympify(V["symbolic"]["reference"], locals={"x": x})
    _check(sq.check_equivalent(case["input"], ref, V["symbolic"]["spec"]), case)
