#!/usr/bin/env python3
"""Ensure content/lean-skill-slice.yaml keys exist in mvp-skill-graph.yaml."""
from __future__ import annotations

import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
SLICE = ROOT / "content" / "lean-skill-slice.yaml"
GRAPH = ROOT / "content" / "mvp-skill-graph.yaml"


def main() -> int:
    slice_doc = yaml.safe_load(SLICE.read_text(encoding="utf-8"))
    graph = yaml.safe_load(GRAPH.read_text(encoding="utf-8"))
    keys = {s["key"] for s in graph["skills"]}
    wanted = slice_doc["skill_keys"]
    errors = []
    for k in wanted:
        if k not in keys:
            errors.append(f"missing skill key in graph: {k}")
    stubs = {s["key"] for s in graph["skills"] if s.get("status") == "stub"}
    for k in wanted:
        if k in stubs:
            errors.append(f"slice key is stub: {k}")
    if len(wanted) != slice_doc.get("count"):
        errors.append(f"count field {slice_doc.get('count')} != len(skill_keys) {len(wanted)}")
    if errors:
        for e in errors:
            print(e, file=sys.stderr)
        return 1
    print(f"OK: {len(wanted)} lean slice keys")
    return 0


if __name__ == "__main__":
    sys.exit(main())
