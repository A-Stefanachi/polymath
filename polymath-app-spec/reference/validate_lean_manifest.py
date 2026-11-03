#!/usr/bin/env python3
"""Cross-check lean-skill-slice, lean-template-manifest.yaml, and content/templates/."""
from __future__ import annotations

import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
SLICE = ROOT / "content" / "lean-skill-slice.yaml"
MANIFEST = ROOT / "content" / "lean-template-manifest.yaml"
TEMPLATES = ROOT / "content" / "templates"


def main() -> int:
    slice_doc = yaml.safe_load(SLICE.read_text(encoding="utf-8"))
    manifest = yaml.safe_load(MANIFEST.read_text(encoding="utf-8"))
    skill_keys = set(slice_doc["skill_keys"])
    errors: list[str] = []

    files = sorted(TEMPLATES.rglob("*.yaml")) if TEMPLATES.is_dir() else []
    by_key: dict[str, Path] = {}
    for p in files:
        doc = yaml.safe_load(p.read_text(encoding="utf-8"))
        k = doc.get("key")
        if k in by_key:
            errors.append(f"duplicate template key {k}: {p} and {by_key[k]}")
        by_key[k] = p
        sk = doc.get("skill_key")
        if sk not in skill_keys:
            errors.append(f"{k}: skill_key {sk} not in lean-skill-slice.yaml")

    expected_math = int(manifest.get("math_count", 15))
    expected_elec = int(manifest.get("elec_count", 15))
    if len(files) != expected_math + expected_elec:
        errors.append(f"expected {expected_math + expected_elec} template files, found {len(files)}")

    listed: set[str] = set()
    for sk, keys in (manifest.get("by_skill") or {}).items():
        if sk not in skill_keys:
            errors.append(f"manifest lists skill not in lean slice: {sk}")
        for tk in keys:
            listed.add(tk)
            if tk not in by_key:
                errors.append(f"manifest template {tk} has no file under content/templates/")

    for sk in skill_keys:
        keys = (manifest.get("by_skill") or {}).get(sk, [])
        if not keys:
            errors.append(f"lean skill {sk} has no template in manifest by_skill")
        if len(keys) < 1:
            continue

    orphans = set(by_key) - listed
    if orphans:
        errors.append(f"templates not listed in manifest: {sorted(orphans)}")

    math_n = sum(1 for p in files if yaml.safe_load(p.read_text(encoding="utf-8"))["key"].startswith("tpl.math."))
    elec_n = len(files) - math_n
    if math_n != expected_math:
        errors.append(f"math template count {math_n} != manifest math_count {expected_math}")
    if elec_n != expected_elec:
        errors.append(f"elec template count {elec_n} != manifest elec_count {expected_elec}")

    if errors:
        for e in errors:
            print(f"ERROR: {e}")
        return 1
    print(
        f"OK: {len(files)} lean templates cover {len(skill_keys)} skills "
        f"({expected_math} math + {expected_elec} elec)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
