import shutil

import pytest

import code_runner as cr
import tplkit

pytestmark = pytest.mark.skipif(shutil.which("gcc") is None, reason="gcc not installed")
TPL = tplkit.load_all()["tpl.sw.debounce-counter-c"]
A = TPL["answer"]
ORDER = [p["name"] for p in TPL["parameters"]]
P = {"n": 3, "initial": 0}


def test_reference_passes_everything():
    g = cr.grade_code(A, P, A["reference_solution"], ORDER)
    assert g["correct"] and g["score"] == 1.0


@pytest.mark.parametrize("m", A["mutants"], ids=lambda m: m["id"])
def test_every_mutant_is_caught(m):
    g = cr.grade_code(A, P, m["source"], ORDER)
    assert not g["correct"]


def test_compile_error_is_reported_not_raised():
    g = cr.grade_code(A, P, "int x = ;", ORDER)
    assert not g["correct"] and "did not compile" in g["feedback"]
    assert g["graders"][0]["detail"]["stage"] == "compile"


def test_forbidden_include_rejected_before_compiling():
    src = '#include <stdio.h>\n' + A["reference_solution"]
    g = cr.grade_code(A, P, src, ORDER)
    assert not g["correct"] and "not allowed" in g["feedback"]


def test_infinite_loop_hits_limit_and_does_not_hang():
    src = ('#include "debounce.h"\nvoid debounce_init(debounce_t *d, uint8_t i){(void)d;(void)i;}\n'
           'uint8_t debounce_update(debounce_t *d, uint8_t r, uint8_t n){(void)d;(void)r;(void)n;for(;;){} return 0;}\n')
    g = cr.grade_code({**A, "limits": {**A["limits"], "run_s": 1}}, P, src, ORDER)
    assert not g["correct"]
    statuses = {r["status"] for r in g["graders"][0]["detail"]["results"]}
    assert "not_run" in statuses  # aborted after the first kill


def test_crash_is_reported_as_failure():
    src = ('#include "debounce.h"\nvoid debounce_init(debounce_t *d, uint8_t i){(void)d;(void)i;}\n'
           'uint8_t debounce_update(debounce_t *d, uint8_t r, uint8_t n){(void)d;(void)r;(void)n;'
           'volatile uint8_t *p = 0; return *p;}\n')
    g = cr.grade_code(A, P, src, ORDER)
    assert not g["correct"]


def test_forged_output_without_nonce_is_not_accepted():
    # Learner prints a plausible answer line itself; only the harness line carrying the nonce counts.
    src = A["reference_solution"].replace("return d->stable;", 'return d->stable ^ 1u;')
    g = cr.grade_code(A, P, src, ORDER)
    assert not g["correct"]


def test_hidden_inputs_not_leaked_in_feedback():
    g = cr.grade_code(A, P, A["starter_code"], ORDER)
    hidden_inputs = [c["input"] for c in A["tests"]["hidden"]]
    assert not any(h in g["feedback"] for h in hidden_inputs)
