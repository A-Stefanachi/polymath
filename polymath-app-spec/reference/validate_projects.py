#!/usr/bin/env python3
"""Validate content/project-ladder.yaml against schemas/project.schema.json and the structural rules of
docs/10-build-projects-and-verification-spec.md.

Usage:
    python3 reference/validate_projects.py [--yaml PATH] [--schema PATH] [--graph PATH] [--quiet]

Requires: pip install jsonschema pyyaml --break-system-packages
Exit code 0 when there are no errors, 1 otherwise. Warnings never fail the run.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

try:
    import yaml
    from jsonschema import Draft202012Validator
except ImportError:  # pragma: no cover
    print("Missing dependency. Run: pip install jsonschema pyyaml --break-system-packages", file=sys.stderr)
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent
PROJECT_KEY_RE = re.compile(r"^prj\.L([0-9])\.[a-z0-9-]+$")
STEP_KEY_RE = re.compile(r"^(prj\.L[0-9]\.[a-z0-9-]+)#s([0-9]{2})$")
SKILL_KEY_RE = re.compile(r"^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$")
SESSION_RANGES = {"micro": (1, 20), "focus": (45, 120), "lab": (120, 240)}
MVP_LEVELS = {0, 1, 2, 3, 4, 5}
PHOTO_LIKE_NONCE_REQUIRED = {"A1", "A2", "A3"}
MODULE_EXEMPT = {"elec.opamp"}  # 00a E2; math modules are exempt by node


def load_yaml(path: Path):
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def graph_skill_keys(path: Path) -> set[str] | None:
    if not path.exists():
        return None
    data = load_yaml(path)
    return {s["key"] for s in data.get("skills", []) if isinstance(s, dict) and "key" in s}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--yaml", default=str(ROOT / "content" / "project-ladder.yaml"))
    ap.add_argument("--schema", default=str(ROOT / "schemas" / "project.schema.json"))
    ap.add_argument("--graph", default=str(ROOT / "content" / "mvp-skill-graph.yaml"))
    ap.add_argument("--quiet", action="store_true")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    errors: list[str] = []
    warnings: list[str] = []
    long_substeps: list[str] = []

    import json

    schema = json.loads(Path(args.schema).read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    doc = load_yaml(Path(args.yaml))

    # 1. JSON Schema validation
    validator = Draft202012Validator(schema)
    for err in sorted(validator.iter_errors(doc), key=lambda e: list(e.absolute_path)):
        loc = "/".join(str(p) for p in err.absolute_path) or "<root>"
        errors.append(f"schema: {loc}: {err.message[:300]}")

    projects = doc.get("projects", []) if isinstance(doc, dict) else []
    known_skills = graph_skill_keys(Path(args.graph))
    if known_skills is None:
        warnings.append(f"skill graph not found at {args.graph}; skill keys checked for format only")

    seen_projects: set[str] = set()
    seen_levels: set[int] = set()
    total_steps = 0
    total_min = 0
    per_project = []

    for p in projects:
        pk = p.get("key", "<missing>")
        m = PROJECT_KEY_RE.match(pk)
        if not m:
            errors.append(f"{pk}: project key does not match prj.L{{0-9}}.{{slug}}")
        else:
            if int(m.group(1)) != p.get("ladder_level"):
                errors.append(f"{pk}: ladder_level {p.get('ladder_level')} does not match key level {m.group(1)}")
        if pk in seen_projects:
            errors.append(f"{pk}: duplicate project key")
        seen_projects.add(pk)
        if p.get("ladder_level") in seen_levels:
            errors.append(f"{pk}: duplicate ladder_level {p.get('ladder_level')}")
        seen_levels.add(p.get("ladder_level"))

        # skill keys format and existence
        def check_skill(k: str, where: str) -> None:
            if not SKILL_KEY_RE.match(k):
                errors.append(f"{where}: skill key '{k}' violates the contract regex")
            elif known_skills is not None and k not in known_skills:
                errors.append(f"{where}: skill key '{k}' not found in the skill graph")

        for k in p.get("prerequisite_skill_keys", []):
            check_skill(k, f"{pk} prerequisite_skill_keys")
        for g in p.get("grants_tier", []):
            check_skill(g["skill_key"], f"{pk} grants_tier")

        steps = p.get("steps", [])
        positions = [s.get("position") for s in steps]
        if positions != list(range(1, len(steps) + 1)):
            errors.append(f"{pk}: step positions must be 1..{len(steps)} in file order, got {positions}")

        step_skill_union: set[str] = set()
        sums = {"micro": 0, "focus": 0, "lab": 0}
        any_nonce_a1 = False
        micro_count = 0
        seen_step_keys: set[str] = set()
        for s in steps:
            sk = s.get("key", "<missing>")
            sm = STEP_KEY_RE.match(sk)
            if not sm:
                errors.append(f"{sk}: step key does not match {{project key}}#sNN")
            else:
                if sm.group(1) != pk:
                    errors.append(f"{sk}: step key prefix is not the project key {pk}")
                if int(sm.group(2)) != s.get("position"):
                    errors.append(f"{sk}: NN ({sm.group(2)}) does not equal position {s.get('position')}")
            if sk in seen_step_keys:
                errors.append(f"{sk}: duplicate step key")
            seen_step_keys.add(sk)

            st = s.get("session_type")
            est = s.get("est_min", 0)
            if st in SESSION_RANGES:
                lo, hi = SESSION_RANGES[st]
                if not (lo <= est <= hi):
                    errors.append(f"{sk}: est_min {est} outside {st} range {lo}-{hi}")
                sums[st] += est
                if st == "micro":
                    micro_count += 1
                if st == "micro" and s.get("context") == "bench":
                    errors.append(f"{sk}: micro steps cannot use bench context (sessions_micro_not_bench)")

            # substeps
            subs = s.get("substeps")
            if st in ("focus", "lab") and s.get("context") == "bench" and not subs:
                errors.append(f"{sk}: bench focus/lab steps must define substeps (savepoints)")
            if subs:
                total_sub = sum(x["est_min"] for x in subs)
                if total_sub != est:
                    errors.append(f"{sk}: substeps sum to {total_sub} but est_min is {est}")
                for x in subs:
                    if x["est_min"] > 30 and not (x.get("passive") or x.get("buffer")):
                        errors.append(f"{sk}: substep '{x['title']}' exceeds 30 min and is neither passive nor buffer")
                    if 20 < x["est_min"] <= 30 and not (x.get("passive") or x.get("buffer")):
                        long_substeps.append(f"{sk}: '{x['title']}' {x['est_min']} min")
                if st == "micro":
                    warnings.append(f"{sk}: micro step has substeps (unnecessary)")

            for k in s.get("skill_keys", []):
                check_skill(k, sk)
                step_skill_union.add(k)

            # evidence
            ev = s.get("evidence_required", [])
            kinds = [e["kind"] for e in ev]
            for e in ev:
                if e["min_assurance"] in PHOTO_LIKE_NONCE_REQUIRED and e["nonce_channel"] == "none":
                    errors.append(f"{sk}: evidence '{e['label']}' has assurance {e['min_assurance']} but no nonce channel")
                if e["min_assurance"] == "A1":
                    any_nonce_a1 = True
                if e["kind"] in ("photo", "video") and e["min_assurance"] == "A5":
                    errors.append(f"{sk}: photo/video evidence '{e['label']}' cannot be A5")
                if e["kind"] in ("measurement", "note") and e["min_assurance"] in ("A1", "A2", "A3", "A4"):
                    errors.append(f"{sk}: measurement/note evidence '{e['label']}' must be A5")
                if e["kind"] == "photo" and e["nonce_channel"] not in ("paper_in_frame", "silkscreen_text", "file_header"):
                    errors.append(f"{sk}: photo '{e['label']}' needs a nonce channel visible in the frame or file name")
                if e["kind"] in ("measurement", "note") and not e.get("fields"):
                    errors.append(f"{sk}: {e['kind']} evidence '{e['label']}' needs structured fields")
                names = [f["name"] for f in e.get("fields", [])]
                if len(names) != len(set(names)):
                    errors.append(f"{sk}: duplicate field names in '{e['label']}'")
            if len(kinds) == 0:
                errors.append(f"{sk}: no evidence_required")

            # every blocking evidence should have at least one check that references its kind family
            check_ids = [c["id"] for c in s.get("automated_checks", [])]
            if "log" in kinds and not any(c.startswith(("log.", "logic.", "firmware.")) for c in check_ids):
                errors.append(f"{sk}: log evidence without a log/logic/firmware check")
            if "scope_capture" in kinds and not any(c.startswith(("waveform.", "logic.", "spice.")) for c in check_ids):
                errors.append(f"{sk}: scope_capture evidence without a waveform/logic/spice check")
            if "photo" in kinds and "photo.nonce_ocr" not in check_ids and "photo.basic_checks" not in check_ids:
                errors.append(f"{sk}: photo evidence without a photo check")
            if "repo" in kinds and not any(c.startswith(("firmware.", "spice.", "kicad.")) for c in check_ids) \
                    and "note.rubric" not in check_ids:
                warnings.append(f"{sk}: repo evidence with no automated check")
            if any(c.startswith("kicad.") for c in check_ids):
                for c in s["automated_checks"]:
                    if c["id"].startswith("kicad.") and c["id"] != "kicad.dfm_profile" and c["grader_type"] != "drc_erc":
                        errors.append(f"{sk}: {c['id']} should use grader_type drc_erc")
            for c in s["automated_checks"]:
                if c["id"].startswith("spice.") and c["grader_type"] != "spice_compare":
                    errors.append(f"{sk}: {c['id']} should use grader_type spice_compare")
                if c["id"] == "note.rubric" and c["grader_type"] != "rubric_llm":
                    errors.append(f"{sk}: note.rubric must use rubric_llm")
                if c["id"] in ("firmware.host_tests", "firmware.build", "firmware.isr_lint") and c["grader_type"] != "code_tests":
                    errors.append(f"{sk}: {c['id']} should use code_tests")
                if c["id"] == "note.rubric" and c["on_fail"] == "reject":
                    errors.append(f"{sk}: rubric_llm must never reject on its own (contract section 7.8)")

            if s.get("safety_gate") is None and st in ("focus", "lab") and s.get("context") == "bench":
                # soldering, supplies and hot parts steps must be gated; others are only recommended
                if re.search(r"\b(solder\w*|battery|regulator|power-up|hot)\b|\b9 V\b", s.get("instruction", ""), re.I) and not s.get("safety_gate"):
                    warnings.append(f"{sk}: mentions hazards in its instruction but has no safety_gate")

            if "TODO" in str(s) or "TBD" in str(s) or "PLACEHOLDER" in str(s).upper():
                errors.append(f"{sk}: contains placeholder text")

        # project level checks
        total_all = sum(sums.values())
        ts = p.get("time_split_min", {})
        for k in ("micro", "focus", "lab"):
            if ts.get(k) != sums[k]:
                errors.append(f"{pk}: time_split_min.{k} is {ts.get(k)} but steps sum to {sums[k]}")
        if abs(p.get("est_hours", 0) - total_all / 60.0) > 0.06:
            errors.append(f"{pk}: est_hours {p.get('est_hours')} but steps sum to {total_all / 60.0:.2f} h")
        if not any_nonce_a1:
            errors.append(f"{pk}: no step has an A1 (instrumented, nonce-bearing) evidence item")
        if micro_count < 3:
            errors.append(f"{pk}: fewer than 3 micro steps (phone-suitable work is needed)")
        if sums["micro"] / max(total_all, 1) < 0.08:
            warnings.append(f"{pk}: micro minutes are under 8 percent of the project")

        # gate tier and reuse references
        if p.get("ladder_level") == 0 and p.get("tier_gate") != "L0":
            errors.append(f"{pk}: ladder level 0 must have tier_gate L0")
        if p.get("ladder_level", 0) >= 1 and p.get("tier_gate") != "L1":
            errors.append(f"{pk}: ladder level >= 1 must have tier_gate L1 in the MVP")
        step_pos = {x["key"]: x["position"] for x in steps}
        for x in steps:
            ref = x.get("reuses_challenge_from")
            if ref:
                if ref not in step_pos:
                    errors.append(f"{x['key']}: reuses_challenge_from '{ref}' is not a step of this project")
                elif step_pos[ref] >= x["position"]:
                    errors.append(f"{x['key']}: reuses_challenge_from must refer to an earlier step")
            # attempt-scope parameters need a challenge-carrying A1-A3 evidence slot
            if any(pv["scope"] == "attempt" for pv in x.get("param_variation", [])):
                if not any(e["min_assurance"] in ("A1", "A2", "A3") for e in x["evidence_required"]):
                    errors.append(f"{x['key']}: attempt-scope parameters need an A1-A3 evidence slot")
        proj_params = [pv["name"] for x in steps for pv in x.get("param_variation", [])]
        if len(proj_params) != len(set(proj_params)):
            errors.append(f"{pk}: parameter names must be unique within a project")

        granted = {g["skill_key"] for g in p.get("grants_tier", [])}
        allowed = step_skill_union | set(p.get("prerequisite_skill_keys", []))
        for g in granted - allowed:
            errors.append(f"{pk}: grants_tier skill '{g}' is not practised in any step and is not a prerequisite")
        if p.get("ladder_level", 0) >= 1 and any(g["tier"] == "L0" for g in p["grants_tier"]):
            errors.append(f"{pk}: ladder level >= 1 projects must grant L1, not L0")
        if p.get("ladder_level") == 0 and any(g["tier"] != "L0" for g in p["grants_tier"]):
            errors.append(f"{pk}: ladder level 0 may only grant L0")
        if p.get("status") == "verified":
            errors.append(f"{pk}: status verified is not allowed before a bench build has been run")

        for it in p.get("bom", []):
            if it["approx_cost_usd"] <= 0:
                errors.append(f"{pk}: BOM item '{it['part']}' has non-positive cost")
        # guided variant (docs/10 section 3.2, 00f F-05/F-10): week-1 first win; only in ladder level 0, only gated by the safety brief
        for x in steps:
            if x.get("guided_variant"):
                if p.get("ladder_level") != 0:
                    errors.append(f"{x['key']}: guided_variant is only allowed in ladder level 0 projects")
                if not x.get("safety_gate"):
                    errors.append(f"{x['key']}: a guided_variant step must set safety_gate true")
                if x.get("session_type") == "micro" and x.get("context") == "bench":
                    errors.append(f"{x['key']}: guided_variant micro step cannot be bench")
                if x.get("est_min", 0) > 60:
                    errors.append(f"{x['key']}: a guided_variant step should take at most 60 minutes (a first win, not a project)")
                if any(g["tier"] != "L0" for g in p.get("grants_tier", [])):
                    errors.append(f"{x['key']}: guided_variant steps give L0 credit only")
                if not any(y.get("safety_gate") and not y.get("guided_variant") and y.get("session_type") == "micro" for y in steps):
                    errors.append(f"{x['key']}: a guided_variant step needs a non-guided micro safety-brief step in the same project")
        # last step should be a debrief note (L0-L4) or capstone summary (L5)
        last = steps[-1] if steps else None
        if last and not any(e["kind"] == "note" for e in last["evidence_required"]):
            errors.append(f"{pk}: final step must collect a note (debrief)")
        if not any(s.get("safety_gate") for s in steps):
            errors.append(f"{pk}: at least one step must set safety_gate true")

        # safety-skill wiring (00a E1): soldering and battery steps must carry the safety skills
        prereqs = set(p.get("prerequisite_skill_keys", []))
        solder_steps = []
        for x in steps:
            texts = [x.get("title", "")] + [(sub if isinstance(sub, str) else sub.get("title", "")) for sub in x.get("substeps", [])]
            if any("solder" in t.lower() for t in texts):
                solder_steps.append(x)
        if solder_steps:
            if "elec.meas.soldering-safety" not in prereqs:
                errors.append(f"{pk}: soldering steps present but elec.meas.soldering-safety is not a prerequisite_skill_keys entry")
            for x in solder_steps:
                if "elec.meas.soldering-safety" not in x.get("skill_keys", []):
                    errors.append(f"{x['key']}: soldering step must list elec.meas.soldering-safety in skill_keys")
        if any("battery" in i["part"].lower() for i in p.get("bom", [])):
            if "elec.semi.battery-safety" not in prereqs:
                errors.append(f"{pk}: battery in the BOM but elec.semi.battery-safety is not a prerequisite_skill_keys entry")

        cost = sum(i["approx_cost_usd"] for i in p.get("bom", []))
        per_project.append((pk, len(steps), total_all, sums, round(cost)))
        total_steps += len(steps)
        total_min += total_all

    # module coverage (doc 05 section 3, 00a E2): every non-exempt module with L1 skills is touched by a project step.
    # Exempt in v1: the math modules (not bench or code modules) and elec.opamp (applied evidence comes from checkpoints).
    if Path(args.graph).exists():
        gdoc = load_yaml(Path(args.graph))
        step_skills = {k for p in projects for st in p.get("steps", []) for k in st.get("skill_keys", [])}
        for m in gdoc.get("modules", []):
            mk = m["key"]
            if m["node"] == "math" or mk in MODULE_EXEMPT:
                continue
            l1 = [x["key"] for x in gdoc["skills"] if x.get("status") not in ("stub", "needs_human_review") and f"{x['node']}.{x['module']}" == mk and x.get("tier_target") in ("L1", "L2", "L3")]
            if l1 and not any(k in step_skills for k in l1):
                errors.append(f"module {mk}: has L1 skills but no project step references any of them (add a step or add the module to MODULE_EXEMPT and doc 05)")

    missing_levels = MVP_LEVELS - seen_levels
    if missing_levels:
        errors.append(f"ladder levels missing from the file: {sorted(missing_levels)}")

    if not args.quiet:
        print("Projects:", len(projects), " Steps:", total_steps, " Total est hours: %.1f" % (total_min / 60.0))
        for pk, n, tot, sums, cost in per_project:
            print(f"  {pk}: {n} steps, {tot} min ({tot / 60:.1f} h) micro={sums['micro']} focus={sums['focus']} lab={sums['lab']}, BOM about {cost} USD (unverified)")
    if long_substeps:
        print(f"NOTE: {len(long_substeps)} substeps are 21-30 min (allowed; target is 20 or less). Use --verbose to list.")
        if args.verbose:
            for x in long_substeps:
                print("  long substep:", x)
    for w in warnings:
        print("WARNING:", w)
    for e in errors:
        print("ERROR:", e)
    print(f"{len(errors)} error(s), {len(warnings)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
