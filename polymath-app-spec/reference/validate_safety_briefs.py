#!/usr/bin/env python3
"""Every project with a safety_gate step must have content/safety/{project_key}.md with brief_version."""
from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
LADDER = ROOT / "content" / "project-ladder.yaml"
SAFETY_DIR = ROOT / "content" / "safety"
CANONICAL_VERSION = "2026-10-31-1"  # doc 10 section 5.3


def parse_front_matter(text: str) -> dict:
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end < 0:
        return {}
    block = text[3:end].strip()
    return yaml.safe_load(block) or {}


def main() -> int:
    ladder = yaml.safe_load(LADDER.read_text(encoding="utf-8"))
    errors: list[str] = []
    for proj in ladder.get("projects", []):
        pk = proj["key"]
        steps = proj.get("steps", [])
        if not any(s.get("safety_gate") for s in steps):
            continue
        path = SAFETY_DIR / f"{pk}.md"
        if not path.is_file():
            errors.append(f"missing brief: {path.relative_to(ROOT)} (project has safety_gate steps)")
            continue
        meta = parse_front_matter(path.read_text(encoding="utf-8"))
        if meta.get("project_key") != pk:
            errors.append(f"{path.name}: front matter project_key must be {pk!r}")
        ver = meta.get("brief_version")
        if ver != CANONICAL_VERSION:
            errors.append(f"{path.name}: brief_version must be {CANONICAL_VERSION!r}, got {ver!r}")
        body = path.read_text(encoding="utf-8")
        if not re.search(r"check question|Check question", body, re.I):
            errors.append(f"{path.name}: include check questions for acknowledgement step")
    if errors:
        for e in errors:
            print(f"ERROR: {e}")
        print(f"FAIL: {len(errors)} safety brief issue(s)")
        return 1
    print(f"OK: safety briefs for projects with safety_gate ({SAFETY_DIR.relative_to(ROOT)}/)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
