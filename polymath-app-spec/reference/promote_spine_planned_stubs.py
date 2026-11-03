#!/usr/bin/env python3
"""Promote spine-module-plan skills from spine-planned-skills.yaml into the MVP graph as stubs.

Wires each new stub to the previous skill in its spine module (or the track promote_stub anchor).
Run once for curriculum completion; then regenerate syllabi and validators.

Usage (repo root):
  python reference/promote_spine_planned_stubs.py [--dry-run]
"""
from __future__ import annotations

import argparse
import re
from datetime import date
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
GRAPH = ROOT / "content" / "mvp-skill-graph.yaml"
SPINE = ROOT / "content" / "syllabi" / "spine-module-plan.yaml"
PLANNED = ROOT / "content" / "syllabi" / "spine-planned-skills.yaml"
TRACKS = ROOT / "content" / "capability-tracks.yaml"

KEY_RE = re.compile(r"^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$")


def load_yaml(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def track_anchors(tracks_doc: dict, by_key: dict) -> dict[str, str]:
    out: dict[str, str] = {}
    for tr in tracks_doc.get("tracks", []):
        if tr.get("key") == "foundation":
            continue
        for stub_key in tr.get("promote_stubs", []):
            if stub_key in by_key:
                out[tr["key"]] = stub_key
                break
    return out


def skill_spec(sk: str | dict) -> tuple[str, dict]:
    if isinstance(sk, str):
        return sk, {"key": sk}
    return sk["key"], sk


def make_description(title: str) -> str:
    t = title.strip().rstrip(".")
    if not t:
        return "Spine curriculum placeholder; not served until promoted to draft."
    return f"{t}; spine curriculum placeholder until promoted to draft."


def stub_entry(key: str, spec: dict, prereq: str, min_tier: str) -> dict:
    node, module, _slug = key.split(".", 2)
    title = spec.get("title") or key.split(".")[-1].replace("-", " ").title()
    return {
        "key": key,
        "title": title,
        "description": make_description(title),
        "node": node,
        "module": module,
        "status": "stub",
        "tier_target": spec.get("tier_target", "L1"),
        "est_minutes": 0,
        "prerequisites": [
            {"skill": prereq, "strength": "hard", "min_tier": min_tier},
        ],
        "task_kinds": [],
        "grader_types": [],
        "phone_suitable": False,
        "license": "original",
        "source": "Polymath spine-module-plan (planning stub; doc 15).",
    }


def bump_minor(version: str) -> str:
    major, minor = version.split(".", 1)
    return f"{major}.{int(minor.split('.')[0]) + 1}.0"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    graph = load_yaml(GRAPH)
    spine = load_yaml(SPINE)
    planned_doc = load_yaml(PLANNED)
    tracks_doc = load_yaml(TRACKS)

    by_key = {s["key"]: s for s in graph["skills"]}
    planned_keys = {r["key"] for r in planned_doc.get("planned_skills", [])}
    anchors = track_anchors(tracks_doc, by_key)

    to_add: list[dict] = []
    for track_key, track in spine.get("tracks", {}).items():
        track_anchor = anchors.get(track_key)
        modules = sorted(track.get("modules", []), key=lambda m: m.get("order", 999))
        for mod in modules:
            last: str | None = None
            for sk in mod.get("skills", []):
                key, spec = skill_spec(sk)
                if not KEY_RE.match(key):
                    raise SystemExit(f"invalid key: {key}")
                if key in by_key:
                    last = key
                    continue
                if key not in planned_keys:
                    raise SystemExit(f"spine skill {key} not in graph or planned registry")
                prereq = last or track_anchor
                if not prereq:
                    raise SystemExit(f"no anchor for spine stub {key} in track {track_key}")
                if prereq not in by_key and prereq not in {s["key"] for s in to_add}:
                    raise SystemExit(f"anchor {prereq} missing for {key}")
                min_tier = by_key.get(prereq, {}).get("tier_target", "L1")
                entry = stub_entry(key, spec, prereq, min_tier)
                to_add.append(entry)
                by_key[key] = entry
                last = key

    if not to_add:
        print("Nothing to promote (planned registry empty or already in graph).")
        return 0

    print(f"Promoting {len(to_add)} spine skills as stubs (dry_run={args.dry_run}).")
    for s in to_add:
        print(f"  + {s['key']} -> {s['prerequisites'][0]['skill']}")

    if args.dry_run:
        return 0

    graph["skills"].extend(to_add)
    graph["graph_version"] = bump_minor(str(graph.get("graph_version", "0.2.0")))
    graph["as_of"] = date.today().isoformat()

    GRAPH.write_text(yaml.dump(graph, sort_keys=False, allow_unicode=True, width=1000), encoding="utf-8")
    print(f"Wrote {GRAPH.name} graph_version={graph['graph_version']} (+{len(to_add)} stubs)")
    print("Next: python reference/generate_pillar_syllabi.py && python reference/validate_graph.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
