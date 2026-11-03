"""Reference exact_numeric grader (real with units, and rectangular complex). See docs/08 section 2.1.

Deterministic, no LLM. Unit and magnitude handling happens here, before any LLM could see the answer.
"""
from __future__ import annotations

import re

import pint

import safe_expr as se

ureg = pint.UnitRegistry()
_NUM = re.compile(r"^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(.*?)\s*$")
_UNIT_OK = re.compile(r"^[A-Za-z/*^0-9 .\-µμΩ]{1,24}$")
MAX_LEN = 64


def normalize_unit(u: str) -> str:
    u = u.replace("Ω", "ohm").replace("Ω", "ohm").replace("µ", "u").replace("μ", "u")
    u = re.sub(r"(?i)ohms?\b", "ohm", u)
    u = u.replace("^", "**")
    return u.strip()


def _grade(score: float, correct: bool, detail: dict, feedback: str, tags: list[str]) -> dict:
    return {
        "score": score, "correct": correct,
        "graders": [{"type": "exact_numeric", "score": score, "detail": detail}],
        "feedback": feedback, "misconception_tags": tags,
    }


def parse_real(text: str, expected_unit: str, bare_number_means: str | None):
    """Return (value_in_expected_unit, info) or raise ValueError(feedback)."""
    if len(text) > MAX_LEN:
        raise ValueError("Answer too long.")
    t = text.strip()
    if "," in t and "." not in t and t.count(",") == 1:
        t = t.replace(",", ".")  # decimal comma
    elif "," in t:
        raise ValueError("Please write the number without thousands separators.")
    m = _NUM.match(t)
    if not m:
        raise ValueError("Could not read a number. Example: 3.3 V")
    num, unit = float(m.group(1)), normalize_unit(m.group(2))
    if unit == "":
        if not bare_number_means:
            raise ValueError("Please include a unit.")
        unit, bare = bare_number_means, True
    else:
        bare = False
        if not _UNIT_OK.match(unit):
            raise ValueError("Could not read the unit.")
    try:
        q = ureg.Quantity(num, unit)
        v = q.to(expected_unit).magnitude
    except pint.errors.DimensionalityError:
        raise ValueError(f"The unit '{m.group(2)}' has the wrong dimension for this question.") from None
    except Exception:
        raise ValueError(f"Could not interpret the unit '{m.group(2)}'.") from None
    return float(v), {"bare_number": bare, "typed_unit": m.group(2)}


def parse_complex(text: str) -> complex:
    t = text.strip().replace(" ", "")
    if len(t) > MAX_LEN or not t:
        raise ValueError("Could not read the complex number. Example: 3 - 2j")
    t = re.sub(r"(?<![A-Za-z])i(?![A-Za-z])", "j", t)
    t = re.sub(r"(\d)j", r"\1j", t)
    if not re.fullmatch(r"[0-9+\-.*()jeE]+", t):
        raise ValueError("Use only digits, + - and j. Example: 3 - 2j")
    try:
        v = se.evaluate(t, {}, funcs={}, consts={"j": 1j})
    except se.ExprError:
        raise ValueError("Could not read the complex number. Example: 3 - 2j") from None
    return complex(v)


def within(x: float, ref: float, tol: dict) -> bool:
    return abs(x - ref) <= max(tol.get("abs", 0.0), tol.get("rel", 0.0) * abs(ref))


def grade_exact_numeric(response: str, spec: dict, ref, wrong: list[dict] | None = None) -> dict:
    """spec: the answer block with `kind`, `unit`, `tolerance`, `bare_number_means`; ref: float or complex."""
    wrong = wrong or []
    tol = spec["tolerance"]
    try:
        if spec["kind"] == "complex":
            z = parse_complex(response)
            ok = within(z.real, ref.real, tol) and within(z.imag, ref.imag, tol)
            detail = {"parsed": [z.real, z.imag], "reference": [ref.real, ref.imag]}
            hit = lambda w: within(z.real, complex(w).real, tol) and within(z.imag, complex(w).imag, tol)
        else:
            x, info = parse_real(response, spec["unit"], spec.get("bare_number_means"))
            ok = within(x, ref, tol)
            detail = {"parsed": x, "unit": spec["unit"], "reference": ref, **info}
            hit = lambda w: within(x, float(w), tol)
    except ValueError as e:
        # Keeps the 0/False shape of the grader vectors; the caller applies 00a D2 and B4 on this status
        return {**_grade(0.0, False, {"parse_error": str(e)}, str(e), []), "status": "invalid_input"}
    if ok:
        return _grade(1.0, True, detail, "Correct.", [])
    tags = [w["tag"] for w in wrong if hit(w["value"])]
    fb = next((w.get("feedback_md") for w in wrong if w["tag"] in tags and w.get("feedback_md")), "Not quite. Check your method and units.")
    return _grade(0.0, False, detail, fb, tags)
