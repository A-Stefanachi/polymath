#!/usr/bin/env python3
"""Skill specs in content/syllabi/skill-specs must agree with the graph on metadata (00a H12)."""
from __future__ import annotations

import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
SPECS = ROOT / "content" / "syllabi" / "skill-specs"


def main() -> int:
    graph = {s["key"]: s for s in yaml.safe_load((ROOT / "content" / "mvp-skill-graph.yaml").read_text(encoding="utf-8"))["skills"]}
    errors, count = [], 0
    for path in sorted(SPECS.glob("T[1-6]*.yaml")):
        for spec in yaml.safe_load(path.read_text(encoding="utf-8")):
            count += 1
            skill = graph.get(spec["key"])
            if skill is None:
                errors.append(f"{spec['key']}: not in graph")
                continue
            for field in ("est_minutes", "task_kinds", "grader_types", "phone_suitable"):
                if spec[field] != skill[field]:
                    errors.append(f"{spec['key']}: {field} differs from graph")
    for e in errors:
        print("ERROR:", e)
    print(f"{count} specs checked, {len(errors)} error(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
