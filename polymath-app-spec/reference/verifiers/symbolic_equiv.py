"""Reference symbolic_equivalence checker. See docs/08 section 2.2.

Learner text is never passed to eval(), sympify() or parse_expr(). It is tokenised, given implicit
multiplication, validated against an allowlist (safe_expr.check_syntax) and only then evaluated by the
restricted evaluator in SymPy mode. Equivalence = exact simplification to zero, or, failing that, agreement
at many sampled points with mpmath at 30 digits. NOT proof for pathological expressions; the grade records
which method decided.
"""
from __future__ import annotations

import re
import random
import signal
from contextlib import contextmanager

import mpmath
import sympy as sp

import safe_expr as se

MAX_LEN = 200
FUNCS = ("sqrt", "sin", "cos", "tan", "asin", "acos", "atan", "exp", "log", "abs", "sinh", "cosh", "tanh")
CONSTS = ("pi", "E")
_TOKEN = re.compile(r"\s*(?:(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+)|([A-Za-z_][A-Za-z_0-9]*)|(\*\*|[-+*/^(),]))")


class Timeout(Exception):
    pass


@contextmanager
def time_limit(seconds: float):
    """POSIX CPU wall limit; no-op on Windows (production worker is Linux-only, doc 08)."""
    if not hasattr(signal, "SIGALRM") or not hasattr(signal, "setitimer"):
        yield
        return

    def handler(signum, frame):
        raise Timeout()

    old = signal.signal(signal.SIGALRM, handler)
    signal.setitimer(signal.ITIMER_REAL, seconds)
    try:
        yield
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, old)


def tokenize(text: str):
    pos, out = 0, []
    text = text.strip()
    while pos < len(text):
        m = _TOKEN.match(text, pos)
        if not m or m.end() == pos:
            raise se.ExprError(f"unexpected character '{text[pos:pos+1].strip() or text[pos:pos+2]}'")
        num, name, op = m.groups()
        if num is not None:
            out.append(("num", num))
        elif name is not None:
            out.append(("name", name))
        else:
            out.append(("op", "**" if op == "^" else op))
        pos = m.end()
    return out


def to_python(text: str, variables: list[str]) -> str:
    if len(text) > MAX_LEN:
        raise se.ExprError(f"answer longer than {MAX_LEN} characters")
    toks = tokenize(text.replace("²", "**2").replace("³", "**3"))
    if not toks:
        raise se.ExprError("empty answer")
    value_names = set(variables) | set(CONSTS)
    out = []
    for i, (kind, val) in enumerate(toks):
        if i > 0:
            pk, pv = toks[i - 1]
            prev_is_value = pk == "num" or (pk == "name" and pv in value_names) or (pk == "op" and pv == ")")
            cur_starts_value = kind == "num" or kind == "name" or (kind == "op" and val == "(")
            if prev_is_value and cur_starts_value:
                if pk == "num" and kind == "num":
                    raise se.ExprError("two numbers in a row; use an operator")
                if kind == "name" and val not in value_names and val not in FUNCS:
                    raise se.ExprError(f"unknown name '{val}'")
                out.append("*")
            elif pk == "name" and pv in FUNCS and not (kind == "op" and val == "("):
                raise se.ExprError(f"function '{pv}' needs parentheses, e.g. {pv}(x)")
        out.append(val)
    return "".join(out)


def parse_learner(text: str, variables: list[str], extra_forbidden: list[str] | None = None):
    forbidden = set(extra_forbidden or [])
    py = to_python(text, variables)
    for tok in re.findall(r"[A-Za-z_][A-Za-z_0-9]*", py):
        if tok in forbidden:
            raise se.ExprError(f"'{tok}' is not allowed in this question")
    syms = {v: sp.Symbol(v, real=True) for v in variables}
    funcs = {k: v for k, v in se.sympy_funcs(allow_diff=False).items() if k in FUNCS}
    consts = {k: v for k, v in se.sympy_consts().items() if k in CONSTS}
    return se.evaluate(py, syms, funcs, consts, max_len=MAX_LEN * 2)


def _numeric_agree(diffless_l, diffless_r, syms, domain, rel_tol, n_points=16, seed=12345):
    rng = random.Random(seed)
    mpmath.mp.dps = 30
    fl = sp.lambdify(syms, diffless_l, "mpmath")
    fr = sp.lambdify(syms, diffless_r, "mpmath")
    valid = 0
    for _ in range(n_points * 3):
        pt = [rng.uniform(*domain[str(s)]) for s in syms]
        try:
            a, b = fl(*pt), fr(*pt)
            if mpmath.im(a) != 0 or mpmath.im(b) != 0:
                continue
            a, b = mpmath.re(a), mpmath.re(b)
            if not (mpmath.isfinite(a) and mpmath.isfinite(b)):
                continue
        except (ZeroDivisionError, ValueError, OverflowError):
            continue
        valid += 1
        if abs(a - b) > rel_tol * max(1, abs(b)):
            return False, valid
        if valid >= n_points:
            break
    return (valid >= 8), valid


def check_equivalent(learner_text: str, reference, spec: dict, wrong: list[dict] | None = None, seconds: float = 1.5) -> dict:
    """`reference` is a SymPy expression. `spec` is the template's answer block. Returns the contract grade shape."""
    variables = spec["variables"]
    try:
        with time_limit(seconds):
            return _check(learner_text, reference, spec, wrong or [])
    except Timeout:
        return _invalid({"method": "timeout"}, "That expression was too complex to check in time. Try simplifying it.")


def _grade(score, correct, detail, feedback, tags):
    return {"score": score, "correct": correct, "graders": [{"type": "symbolic_equivalence", "score": score, "detail": detail}],
            "feedback": feedback, "misconception_tags": tags}


def _invalid(detail, feedback):
    """Keeps the 0/False shape of the grader vectors. The caller treats `status` as 00a D2 says: score and correct become
    null and the scheduler ignores the attempt (00a B4), so unreadable or too-complex input is never a lapse."""
    return {**_grade(0.0, False, detail, feedback, []), "status": "invalid_input"}


def _equal(l, r, spec):
    syms = [sp.Symbol(v, real=True) for v in spec["variables"]]
    domain = spec["sample_domain"]
    d = l - r
    try:
        if sp.simplify(d) == 0:
            return True, "symbolic"
    except Exception:
        pass
    ok, n = _numeric_agree(l, r, syms, domain, spec.get("numeric_rel_tol", 1e-9))
    return ok, f"numeric_{n}_points"


def _check(learner_text, reference, spec, wrong):
    try:
        l = parse_learner(learner_text, spec["variables"], spec.get("forbid_functions"))
    except se.ExprError as e:
        return _invalid({"parse_error": str(e)}, f"Could not read your expression: {e}")
    free = {str(s) for s in l.free_symbols} - set(spec["variables"])
    if free:
        return _invalid({"parse_error": "free symbols"}, f"Unknown symbol(s): {', '.join(sorted(free))}.")
    form = spec.get("form", "any")
    ok, method = _equal(l, reference, spec)
    if ok and form == "expanded" and sp.expand(l) != l:
        return _grade(0.0, False, {"method": method, "form": "not_expanded"}, "Equivalent, but please give it in expanded form.", [])
    if ok and form == "factored" and sp.factor(l) != l:
        return _grade(0.0, False, {"method": method, "form": "not_factored"}, "Equivalent, but please give it in factored form.", [])
    if ok:
        return _grade(1.0, True, {"method": method}, "Correct.", [])
    tags, fb = [], "Not equivalent to the correct expression."
    for w in wrong:
        wl = parse_learner(w["expr"], spec["variables"]) if isinstance(w["expr"], str) else w["expr"]
        if _equal(l, wl, spec)[0]:
            tags.append(w["tag"])
            fb = w.get("feedback_md", fb)
    return _grade(0.0, False, {"method": method}, fb, tags)
