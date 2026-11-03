#!/usr/bin/env python3
"""Readiness of the lean template pool for the learning loop (00a H1, H2; doc 07 section 3.4).

validate_lean_manifest.py checks that every skill has a key listed. This checks that the pool can do the job.
Exit 1 until every skill passes. Failures are the remaining BL-0065 and BL-0066 work, not a broken tool.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "reference" / "verifiers"))
import tplkit  # noqa: E402

SEEDS = 50
CONCEPT_STATIC = "concept_static"


def distinct_stems(tpl: dict) -> int:
    return len({tplkit.generate_item(tpl, tpl["fuzz"]["seed_base"] + s)["rendered"]["stem_md"] for s in range(SEEDS)})


def constant_key(tpl: dict) -> bool:
    """An `ans: '1'` output is a placeholder: no verifier can see the option text that holds the real answer."""
    if tpl["grader_type"] != "multiple_choice":
        return False
    outputs = tpl["solution"]["generator"].get("outputs") or {}
    return bool(outputs) and all(str(v).replace(".", "").lstrip("-").isdigit() for v in outputs.values())


def main() -> int:
    base = ROOT / "content" / "templates"
    templates = {**tplkit.load_all(base / "math"), **tplkit.load_all(base / "elec")}
    skills: dict[str, list[dict]] = {}
    for tpl in templates.values():
        skills.setdefault(tpl["skill_key"], []).append(tpl)
    failing = 0
    for skill, tpls in sorted(skills.items()):
        variants = any(distinct_stems(t) > 1 for t in tpls) or all(t.get(CONCEPT_STATIC) for t in tpls)
        checks = {
            "fresh variants": variants,
            "2+ solution steps": any(len(t["solution"].get("steps", [])) >= 2 for t in tpls),
            "constructed response": any(t["grader_type"] != "multiple_choice" for t in tpls) or all(t.get(CONCEPT_STATIC) for t in tpls),
            "checked keys": not any(constant_key(t) and not t.get(CONCEPT_STATIC) for t in tpls),
            "4+ option MC": all(t["answer"].get("n_shown", 4) >= 4 for t in tpls if t["grader_type"] == "multiple_choice"),
        }
        missing = [name for name, ok in checks.items() if not ok]
        failing += bool(missing)
        print(f'{"ok  " if not missing else "FAIL"} {skill}: {", ".join(missing) or "ready"}')
    print(f"{len(skills) - failing} of {len(skills)} skills ready")
    return 1 if failing else 0


if __name__ == "__main__":
    sys.exit(main())
