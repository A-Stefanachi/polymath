#!/usr/bin/env python3
"""Spine curriculum vs MVP graph: promote stubs, planned registry, module plan keys."""
from __future__ import annotations

import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
GRAPH = ROOT / "content" / "mvp-skill-graph.yaml"
SPINE = ROOT / "content" / "syllabi" / "spine-module-plan.yaml"
PLANNED = ROOT / "content" / "syllabi" / "spine-planned-skills.yaml"
TRACKS = ROOT / "content" / "capability-tracks.yaml"
FOUNDATION_PLAN = ROOT / "content" / "syllabi" / "foundation-module-plan.yaml"


def skill_keys_from_module_skills(skills: list) -> list[str]:
    out: list[str] = []
    for sk in skills:
        if isinstance(sk, str):
            out.append(sk)
        else:
            out.append(sk["key"])
    return out


def main() -> int:
    graph = yaml.safe_load(GRAPH.read_text(encoding="utf-8"))
    spine = yaml.safe_load(SPINE.read_text(encoding="utf-8"))
    tracks_doc = yaml.safe_load(TRACKS.read_text(encoding="utf-8"))
    planned_doc = yaml.safe_load(PLANNED.read_text(encoding="utf-8")) if PLANNED.is_file() else {}

    by_key = {s["key"]: s for s in graph["skills"]}
    graph_modules = {m["key"] for m in graph["modules"]}
    errors: list[str] = []

    # promote_stubs on capability tracks must exist in graph
    for tr in tracks_doc.get("tracks", []):
        if tr.get("key") == "foundation":
            continue
        for stub_key in tr.get("promote_stubs", []):
            if stub_key not in by_key:
                errors.append(f"promote_stub missing from graph: {stub_key} (track {tr['key']})")
            elif by_key[stub_key].get("status") != "stub":
                pass  # promoted or draft is OK

    # foundation module plan keys should match graph module keys for active foundation skills
    fnd = yaml.safe_load(FOUNDATION_PLAN.read_text(encoding="utf-8"))
    for mod in fnd.get("modules", []):
        mk = mod["key"]
        if mk not in graph_modules:
            errors.append(f"foundation-module-plan key not in graph modules: {mk}")

    # spine plan skills: in graph OR listed in spine-planned-skills.yaml
    registry = {r["key"] for r in planned_doc.get("planned_skills", [])}
    seen_plan: set[str] = set()
    for track_key, track in spine.get("tracks", {}).items():
        for mod in track.get("modules", []):
            for key in skill_keys_from_module_skills(mod.get("skills", [])):
                if key in seen_plan:
                    continue
                seen_plan.add(key)
                if key in by_key:
                    continue
                if key not in registry:
                    errors.append(
                        f"spine skill `{key}` not in graph and not in spine-planned-skills.yaml "
                        f"(track {track_key}, module {mod['key']})"
                    )

    # registry must not list keys that exist in graph
    for row in planned_doc.get("planned_skills", []):
        k = row["key"]
        if k in by_key:
            errors.append(f"spine-planned-skills lists graph key (remove or promote): {k}")

    # registry should match exactly the not-in-graph keys from spine plan
    plan_missing = seen_plan - set(by_key) - registry
    if plan_missing:
        for k in sorted(plan_missing):
            errors.append(f"regenerate spine-planned-skills.yaml; missing registry entry: {k}")
    extra_registry = registry - (seen_plan - set(by_key))
    if extra_registry:
        for k in sorted(extra_registry):
            errors.append(f"stale spine-planned-skills entry (not in spine plan): {k}")

    if errors:
        for e in errors:
            print(e, file=sys.stderr)
        return 1
    print(
        f"OK: spine coherence ({len(seen_plan)} plan skill refs, "
        f"{len(registry)} planned-only, {len(by_key)} graph keys)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
