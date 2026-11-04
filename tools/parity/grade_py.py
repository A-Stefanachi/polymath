"""Runs the Python reference grader on the parity cases and prints one JSON document (BL-0019)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(
    0,
    str(
        Path(__file__).resolve().parents[2]
        / "polymath-app-spec"
        / "reference"
        / "verifiers"
    ),
)
sys.path.insert(0, str(Path(__file__).resolve().parent))

import cases
import numeric_grader as ng


def main() -> None:
    results = []
    for s in cases.sections():
        is_complex = s["spec"]["kind"] == "complex"
        ref = complex(*s["reference"]) if is_complex else s["reference"]
        # The reference takes complex wrong values as Python complex numbers; the case files write [re, im].
        wrong = [
            {
                **w,
                "value": complex(*w["value"])
                if isinstance(w["value"], list)
                else w["value"],
            }
            for w in s["wrong"]
        ]
        for text in s["inputs"]:
            # An exception is a reference bug (the API would answer 500), not a grade: report it by name.
            try:
                grade = ng.grade_exact_numeric(text, s["spec"], ref, wrong)
            except Exception as e:  # noqa: BLE001  (any exception is recorded, then diffed against the port)
                grade = {"crash": type(e).__name__}
            results.append({"section": s["name"], "input": text, "grade": grade})
    json.dump(results, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
