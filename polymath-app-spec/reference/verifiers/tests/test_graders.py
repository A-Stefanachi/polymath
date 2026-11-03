import pytest
import sympy as sp

import numeric_grader as ng
import safe_expr as se
import symbolic_equiv as sq

NUM = {"kind": "numeric", "unit": "V", "tolerance": {"rel": 0.01, "abs": 0.001}, "bare_number_means": "V"}
X = sp.Symbol("x", real=True)
REF = 3 * X**2 * sp.sin(2 * X) + 2 * X**3 * sp.cos(2 * X)
SYM = {"variables": ["x"], "sample_domain": {"x": [0.3, 2.5]}, "forbid_functions": ["diff", "Derivative", "integrate"]}


@pytest.mark.parametrize("text,ok", [
    ("2.97 V", True), ("2.97", True), ("2970 mV", True), ("0.00297 kV", True), ("2,97 V", True), ("2.9701 V", True),
    ("2.9 V", False), ("3.3 V", False), ("2.97 A", False), ("2.97 µV", False), ("", False), ("two", False),
])
def test_numeric_grading(text, ok):
    assert ng.grade_exact_numeric(text, NUM, 2.97)["correct"] is ok


def test_numeric_grade_shape_and_tags():
    g = ng.grade_exact_numeric("0.33 V", NUM, 2.97, [{"tag": "mc.x", "value": 0.33}])
    assert set(g) == {"score", "correct", "graders", "feedback", "misconception_tags"}
    assert g["misconception_tags"] == ["mc.x"] and g["score"] == 0.0


def test_complex_grading():
    spec = {"kind": "complex", "tolerance": {"abs": 0.01}}
    for t in ["3-2j", "3 - 2i", "3 -2j"]:
        assert ng.grade_exact_numeric(t, spec, 3 - 2j)["correct"]
    assert not ng.grade_exact_numeric("3+2j", spec, 3 - 2j)["correct"]
    assert not ng.grade_exact_numeric("__import__('os')", spec, 3 - 2j)["correct"]


@pytest.mark.parametrize("text", [
    "3*x^2*sin(2*x) + 2*x^3*cos(2*x)", "x^2*(3*sin(2*x)+2*x*cos(2*x))", "3x^2 sin(2x) + 2x^3 cos(2x)",
    "2*x^3*cos(2*x)+3*x**2*sin(2*x)",
])
def test_symbolic_accepts_equivalent_forms(text):
    assert sq.check_equivalent(text, REF, SYM)["correct"]


@pytest.mark.parametrize("text", [
    "3*x^2*sin(2*x) + x^3*cos(2*x)", "6*x*cos(2*x)", "x", "diff(x^3*sin(2*x), x)", "y", "sin", "3*x^2*sin 2*x",
])
def test_symbolic_rejects_wrong_or_forbidden(text):
    assert not sq.check_equivalent(text, REF, SYM)["correct"]


@pytest.mark.parametrize("evil", [
    "__import__('os').system('id')", "x.__class__", "().__class__.__bases__", "lambda: 1", "[x for x in range(9)]",
    "9**9**9", "x**100000", "open('/etc/passwd')", "exec('1')", "x;y", "x\n+1", "a" * 500,
])
def test_symbolic_injection_and_dos_are_rejected_without_executing(evil):
    g = sq.check_equivalent(evil, REF, SYM)
    assert g["correct"] is False


def test_safe_expr_rejects_attribute_and_calls():
    for bad in ["(1).real", "abs.__call__(1)", "a[0]", "f(1)"]:
        with pytest.raises(se.ExprError):
            se.evaluate(bad, {"a": 1})


def test_symbolic_misconception_tagging():
    wrong = [{"tag": "mc.pr", "expr": sp.diff(X**3, X) * 2 * sp.cos(2 * X), "feedback_md": "f"}]
    g = sq.check_equivalent("3*x^2*2*cos(2*x)", REF, SYM, wrong)
    assert g["correct"] is False and g["misconception_tags"] == ["mc.pr"]
