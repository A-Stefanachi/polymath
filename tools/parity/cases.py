"""Case list shared by both parity runners: the numeric and complex sections of grader_vectors.json
(doc 08 section 4.1) plus tools/parity/extra-cases.json, which probes units, prefixes and number forms
the shared vectors do not reach. The TypeScript runner reads the same two files with its own loader."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VECTORS = (
    ROOT
    / "polymath-app-spec"
    / "reference"
    / "verifiers"
    / "tests"
    / "grader_vectors.json"
)
EXTRA = Path(__file__).resolve().parent / "extra-cases.json"


def sections() -> list[dict]:
    """Each section: name, spec, reference, wrong (list), inputs (list of strings)."""
    vectors = json.loads(VECTORS.read_text(encoding="utf-8"))
    out = [
        {
            "name": f"vectors:{key}",
            "spec": vectors[key]["spec"],
            "reference": vectors[key]["reference"],
            "wrong": [],
            "inputs": [c["input"] for c in vectors[key]["cases"]],
        }
        for key in ("numeric", "complex")
    ]
    for s in json.loads(EXTRA.read_text(encoding="utf-8"))["sections"]:
        out.append({**s, "wrong": s.get("wrong", [])})
    return out
