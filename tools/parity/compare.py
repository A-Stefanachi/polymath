"""Diffs the JSON written by grade_py.py and grade_ts.ts. Exit 0 when every grade is identical.

Strings, booleans, keys and list lengths must match exactly. Floating-point numbers may differ by a
relative 1e-12: pint and the TypeScript unit table multiply the same factors in a different order, so
2970 mV is 2.97 in one and 2.9699999999999998 in the other. A difference that small never changes a
verdict (the tolerance band is at least 1e-3 relative in the templates)."""

from __future__ import annotations

import json
import math
import sys

REL = 1e-12


def diff(a: object, b: object, path: str, out: list[str]) -> None:
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                out.append(
                    f"{path}.{k}: only in {'python' if k in a else 'typescript'}"
                )
            else:
                diff(a[k], b[k], f"{path}.{k}", out)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            out.append(f"{path}: length {len(a)} != {len(b)}")
        for i, (x, y) in enumerate(zip(a, b, strict=False)):
            diff(x, y, f"{path}[{i}]", out)
    elif isinstance(a, bool) or isinstance(b, bool) or a is None or b is None:
        if a is not b:
            out.append(f"{path}: {a!r} != {b!r}")
    elif isinstance(a, (int, float)) and isinstance(b, (int, float)):
        if not math.isclose(a, b, rel_tol=REL, abs_tol=0.0):
            out.append(f"{path}: {a!r} != {b!r}")
    elif a != b:
        out.append(f"{path}: {a!r} != {b!r}")


def main(py_path: str, ts_path: str) -> int:
    with open(py_path, encoding="utf-8") as f:
        py = json.load(f)
    with open(ts_path, encoding="utf-8") as f:
        ts = json.load(f)
    problems: list[str] = []
    if len(py) != len(ts):
        problems.append(f"case count: python {len(py)}, typescript {len(ts)}")
    for i, (p, t) in enumerate(zip(py, ts, strict=False)):
        if (p["section"], p["input"]) != (t["section"], t["input"]):
            problems.append(f"case {i}: different case order")
            continue
        diff(p["grade"], t["grade"], f"{p['section']} {p['input']!r}", problems)
    for line in problems:
        print("DIFF", line)
    print(f"parity: {len(py)} cases compared, {len(problems)} differences")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2]))
