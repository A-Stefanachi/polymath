"""Restricted expression evaluator used for template expressions and learner symbolic answers.

No eval(), no attribute access, no subscripts, no comprehensions, no lambdas. Only arithmetic, comparisons,
boolean operators, conditional expressions and calls to an allowlisted set of functions. The same grammar is
evaluated with different namespaces: plain floats/complex, exact SymPy numbers, or pint Quantities.
See docs/07 section 3.3.
"""

from __future__ import annotations

import ast
import cmath
import math
import numbers

MAX_LEN = 400
MAX_NODES = 300
MAX_ABS_EXPONENT = 64
MAX_LOG10_RESULT = 300


class ExprError(ValueError):
    """The expression is not in the allowed grammar or failed to evaluate."""


_BINOPS = {
    ast.Add: lambda a, b: a + b,
    ast.Sub: lambda a, b: a - b,
    ast.Mult: lambda a, b: a * b,
    ast.Div: lambda a, b: a / b,
    ast.Mod: lambda a, b: a % b,
    ast.FloorDiv: lambda a, b: a // b,
}
_CMPOPS = {
    ast.Eq: lambda a, b: a == b,
    ast.NotEq: lambda a, b: a != b,
    ast.Lt: lambda a, b: a < b,
    ast.LtE: lambda a, b: a <= b,
    ast.Gt: lambda a, b: a > b,
    ast.GtE: lambda a, b: a >= b,
}


def _is_plain_number(x) -> bool:
    if isinstance(x, bool):
        return False
    if isinstance(x, numbers.Number):
        return True
    try:  # SymPy numbers (Integer, Rational, Float) but not symbolic expressions
        import sympy as sp

        return isinstance(x, sp.Number)
    except Exception:  # pragma: no cover
        return False


def _safe_pow(a, b):
    if _is_plain_number(b):
        fb = complex(b) if isinstance(b, complex) else float(b)
        if abs(fb) > MAX_ABS_EXPONENT:
            raise ExprError(f"exponent {b} exceeds the allowed magnitude {MAX_ABS_EXPONENT}")
        if _is_plain_number(a):
            fa = abs(complex(a)) if isinstance(a, complex) else abs(float(a))
            if fa > 0 and abs(fb) * math.log10(fa) > MAX_LOG10_RESULT:
                raise ExprError("power result would be too large")
    elif _is_plain_number(a) and not isinstance(a, bool):
        # symbolic exponent with numeric base is fine, but bound the base
        pass
    return a**b


def float_funcs() -> dict:
    def _sqrt(x):
        return cmath.sqrt(x) if isinstance(x, complex) or x < 0 else math.sqrt(x)

    return {
        "sqrt": _sqrt,
        "sin": math.sin,
        "cos": math.cos,
        "tan": math.tan,
        "asin": math.asin,
        "acos": math.acos,
        "atan": math.atan,
        "atan2": math.atan2,
        "exp": math.exp,
        "log": math.log,
        "log10": math.log10,
        "abs": abs,
        "min": min,
        "max": max,
        "round": round,
        "floor": math.floor,
        "ceil": math.ceil,
        "hypot": math.hypot,
        "re": lambda z: complex(z).real,
        "im": lambda z: complex(z).imag,
        "conjugate": lambda z: complex(z).conjugate(),
        "phase": lambda z: cmath.phase(complex(z)),
        "complex": complex,
    }


def float_consts() -> dict:
    return {"pi": math.pi, "E": math.e, "j": 1j, "True": True, "False": False}


def sympy_funcs(allow_diff: bool = False) -> dict:
    import sympy as sp

    f = {
        "sqrt": sp.sqrt,
        "sin": sp.sin,
        "cos": sp.cos,
        "tan": sp.tan,
        "asin": sp.asin,
        "acos": sp.acos,
        "atan": sp.atan,
        "exp": sp.exp,
        "log": sp.log,
        "abs": sp.Abs,
        "min": sp.Min,
        "max": sp.Max,
        "re": sp.re,
        "im": sp.im,
        "conjugate": sp.conjugate,
        "sinh": sp.sinh,
        "cosh": sp.cosh,
        "tanh": sp.tanh,
    }
    if allow_diff:  # template-author expressions only, never learner input
        f["diff"] = sp.diff
    return f


def sympy_consts() -> dict:
    import sympy as sp

    return {"pi": sp.pi, "E": sp.E, "j": sp.I, "True": True, "False": False}


def check_syntax(
    expr: str, allowed_names: set[str], allowed_funcs: set[str], max_len: int = MAX_LEN
) -> ast.Expression:
    """Parse and validate without evaluating. Raises ExprError."""
    if not isinstance(expr, str) or not expr.strip():
        raise ExprError("empty expression")
    if len(expr) > max_len:
        raise ExprError(f"expression longer than {max_len} characters")
    try:
        tree = ast.parse(expr.strip(), mode="eval")
    except SyntaxError as e:
        raise ExprError(f"syntax error: {e.msg}") from None
    n = 0
    for node in ast.walk(tree):
        n += 1
        if n > MAX_NODES:
            raise ExprError("expression too complex")
        if isinstance(node, (ast.Expression, ast.Load, ast.operator, ast.unaryop, ast.cmpop, ast.boolop)):
            if isinstance(node, ast.operator) and type(node) not in (
                ast.Add,
                ast.Sub,
                ast.Mult,
                ast.Div,
                ast.Pow,
                ast.Mod,
                ast.FloorDiv,
            ):
                raise ExprError(f"operator {type(node).__name__} not allowed")
            continue
        if isinstance(node, (ast.BinOp, ast.UnaryOp, ast.BoolOp, ast.Compare, ast.IfExp, ast.Tuple)):
            continue
        if isinstance(node, ast.Constant):
            if not isinstance(node.value, (int, float, complex, str, bool)):
                raise ExprError("constant type not allowed")
            continue
        if isinstance(node, ast.Name):
            if node.id not in allowed_names and node.id not in allowed_funcs:
                raise ExprError(f"unknown name '{node.id}'")
            continue
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in allowed_funcs:
                fname = getattr(node.func, "id", "?")
                raise ExprError(f"function '{fname}' is not allowed")
            if node.keywords or len(node.args) > 4:
                raise ExprError("keyword arguments and more than 4 arguments are not allowed")
            continue
        raise ExprError(f"syntax element {type(node).__name__} is not allowed")
    return tree


def evaluate(
    expr: str, names: dict, funcs: dict | None = None, consts: dict | None = None, max_len: int = MAX_LEN
):
    """Evaluate `expr` with the given names. `funcs` default to the float function set."""
    funcs = float_funcs() if funcs is None else funcs
    consts = float_consts() if consts is None else consts
    ns = {**consts, **names}
    tree = check_syntax(expr, set(ns), set(funcs), max_len=max_len)

    def ev(node):
        if isinstance(node, ast.Expression):
            return ev(node.body)
        if isinstance(node, ast.Constant):
            return node.value
        if isinstance(node, ast.Name):
            if node.id in ns:
                return ns[node.id]
            raise ExprError(f"'{node.id}' is a function and needs arguments")
        if isinstance(node, ast.Tuple):
            return tuple(ev(e) for e in node.elts)
        if isinstance(node, ast.BinOp):
            a, b = ev(node.left), ev(node.right)
            if isinstance(node.op, ast.Pow):
                return _safe_pow(a, b)
            return _BINOPS[type(node.op)](a, b)
        if isinstance(node, ast.UnaryOp):
            v = ev(node.operand)
            if isinstance(node.op, ast.USub):
                return -v
            if isinstance(node.op, ast.UAdd):
                return +v
            if isinstance(node.op, ast.Not):
                return not v
            raise ExprError("unary operator not allowed")
        if isinstance(node, ast.BoolOp):
            vals = [ev(v) for v in node.values]
            return all(vals) if isinstance(node.op, ast.And) else any(vals)
        if isinstance(node, ast.Compare):
            left = ev(node.left)
            for op, comp in zip(node.ops, node.comparators):
                right = ev(comp)
                if not _CMPOPS[type(op)](left, right):
                    return False
                left = right
            return True
        if isinstance(node, ast.IfExp):
            return ev(node.body) if ev(node.test) else ev(node.orelse)
        if isinstance(node, ast.Call):
            fn = funcs[node.func.id]
            return fn(*[ev(a) for a in node.args])
        raise ExprError(f"cannot evaluate {type(node).__name__}")

    try:
        return ev(tree)
    except ExprError:
        raise
    except (ZeroDivisionError, OverflowError, ValueError, TypeError) as e:
        raise ExprError(f"evaluation failed: {e}") from None
