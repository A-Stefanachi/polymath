#!/usr/bin/env python3
"""Write content/syllabi/pillar-*.md from graph + planning docs. Planning only; not contract."""
from __future__ import annotations

import json
import textwrap
from collections import defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content" / "syllabi"
SYLLABI_BUNDLE = ROOT / "docs-site" / "assets" / "syllabi-data.js"
GRAPH = ROOT / "content" / "mvp-skill-graph.yaml"
LEAN = ROOT / "content" / "lean-skill-slice.yaml"
SPINE_PLAN = ROOT / "content" / "syllabi" / "spine-module-plan.yaml"
FOUNDATION_PLAN = ROOT / "content" / "syllabi" / "foundation-module-plan.yaml"
PLANNED_SKILLS = ROOT / "content" / "syllabi" / "spine-planned-skills.yaml"
TRACKS = ROOT / "content" / "capability-tracks.yaml"

SPINE_HOURS_NOTE = (
    "**Table note:** Core hours sum `est_minutes` from this syllabus plan (minimum contact-time sketch). "
    "The planning band above includes projects, rework, and review overlap [P].\n\n"
)

SPINE_PILLARS = [
    {
        "file": "pillar-T1-power-motion.md",
        "track": "power-motion",
        "title": "Power & motion (T1)",
        "order": 1,
        "prereq": "foundation (first-walk L1 evidenced)",
        "ladder": "L6 — prj.L6.bldc-esc-bench",
        "artifact": "Accepted L6 evidence: bench BLDC/ESC + thrust or load measurement with battery safety gates.",
        "nodes": ["pwr", "elec (extend)"],
        "domains": [
            "Li-ion cell safety, C-rate, charging boundaries (extends elec.semi.battery-safety).",
            "BLDC motor theory, ESC PWM, thrust/load measurement on bench.",
            "High-current wiring, connectors, EMC awareness at practical level.",
            "Propulsion matching intuition for later UAV track.",
        ],
        "promote_stubs": ["elec.semi.battery-safety", "phys.thermal.heat-transfer"],
        "new_modules_p": ["pwr.batt.li-ion-safe", "pwr.bldc.esc", "pwr.emc.practical"],
        "hours_p": "40–80 core skill hours + 8–15 h L6 project [P]",
        "graders_p": "measurement_check, numeric, human_review for high-current steps; no flight.",
        "boundary": "Bench only until T4; no manned flight.",
    },
    {
        "file": "pillar-T2-control.md",
        "track": "control",
        "title": "Control & estimation (T2)",
        "order": 2,
        "prereq": "foundation + T1 recommended",
        "ladder": "L7 — prj.L7.imu-ground-logger",
        "artifact": "Accepted L7: ground IMU logger + attitude plot + calibration log + closed-loop rig response against prediction.",
        "nodes": ["ctl", "sig", "phys"],
        "domains": [
            "Differential equations, poles, transfer functions and phase margin.",
            "PID on a real one-axis plant: identification, anti-windup, cascades.",
            "Quaternions, specific force, complementary filter, 1-D Kalman, EKF usage.",
            "IMU calibration, frame conventions, ground-only logging.",
            "Fourier/Nyquist literacy for sampling (stub promotion).",
            "Newton laws / rigid-body intuition (stub).",
        ],
        "promote_stubs": [
            "ctl.pid.pid-controller",
            "sig.freq.fourier-intuition",
            "sig.sampling.nyquist-aliasing",
            "phys.mech.newton-laws",
        ],
        "new_modules_p": ["ctl.sys", "ctl.pid.tuning", "ctl.est.complementary", "sig.imu.frames"],
        "hours_p": "80–130 core hours + L7 project and rig [P]",
        "graders_p": "log parsing, numeric compare on logged series, rubric on tuning write-ups.",
        "boundary": "Ground-only for L7; loops run on a clamped rig with commanded setpoints, never in flight. No seekers, target tracking, pursuit, intercept or terminal guidance.",
    },
    {
        "file": "pillar-T3-mechanical.md",
        "track": "mechanical",
        "title": "Mechanical design (T3)",
        "order": 3,
        "prereq": "foundation; T3 modules come before T4, and the L9 build comes after L8",
        "ladder": "L9 — prj.L9.custom-frame-cad",
        "artifact": "Accepted L9: drawing + CAD assembly + fabricated parts + fit + predicted vs measured deflection and first mode, compared with a flight FFT.",
        "nodes": ["mech", "matl"],
        "domains": [
            "Parametric CAD, tolerances, assemblies.",
            "Print/CNC trade-offs and DFM.",
            "Hand structural analysis, fatigue, bolted joints and vibration modes.",
            "Mass/CG budgeting for UAV integration.",
        ],
        "promote_stubs": ["mech.cad.parametric-sketch", "matl.mfg.pcb-fabrication"],
        "new_modules_p": ["mech.cad.assemblies", "mech.tol.fit", "matl.print.settings"],
        "hours_p": "50–90 core hours + L9 project [P]",
        "graders_p": "CAD manifest checklist + human_review; FEA not auto-graded in first ship.",
        "boundary": "No certified structural sign-off.",
    },
    {
        "file": "pillar-T4-robo.md",
        "track": "robo",
        "title": "UAV integration (T4)",
        "order": 4,
        "prereq": "T1, T2 and the T3 modules (not the L9 build)",
        "ladder": "L8 prj.L8.kit-quad-maiden; L12 prj.L12.mission-geofence-rtl",
        "artifact": "L8 maiden under checklist; L12 mission slice with geofence/RTL.",
        "nodes": ["robo", "sens", "net", "rf"],
        "domains": [
            "Legal vehicle route first, then assembly and one chosen flight stack (default PX4).",
            "Real multirotor physics, flight test method and manual recovery.",
            "Propulsion/weight/CG integration test matrix.",
            "Companion computer, telemetry, lossy IP.",
            "EU UAS ops module (default DE/EU) [P].",
            "Link budget literacy (stub rf.basics.link-budget).",
        ],
        "promote_stubs": ["sens.meas.calibration-uncertainty", "net.proto.ip-and-sockets", "rf.basics.link-budget"],
        "new_modules_p": ["robo.uav.physics", "robo.uav.propulsion", "robo.uav.ops-eu", "robo.uav.test"],
        "hours_p": "60–120 core hours + L8/L12 projects [P]",
        "graders_p": "checklist + log + human_review; flight_line safety acks.",
        "boundary": "Integration literacy; not airworthiness certification.",
    },
    {
        "file": "pillar-T5-cloud-twin.md",
        "track": "cloud-twin",
        "title": "Cloud twin (T5)",
        "order": 5,
        "prereq": "foundation + T4 recommended",
        "ladder": "L11 — prj.L11.telemetry-lakehouse",
        "artifact": "Accepted L11: device telemetry → replayable schema + a validated twin with state estimation, an uncertainty-based residual alert and one human-approved decision.",
        "nodes": ["sys", "ml", "sw"],
        "domains": [
            "Edge → secure uplink → lakehouse pipeline.",
            "Schema versioning, replay, alerting SLOs.",
            "Production ML/MLOps: evals, monitoring, cost/latency.",
            "A real digital twin: state model, calibration, residual alerts.",
            "Production LLM systems: structured outputs, retrieval, agent evals, prompt injection.",
            "Edge inference / quantization at device boundary.",
        ],
        "promote_stubs": ["sys.req.requirements", "ml.core.linear-regression", "ml.edge.quantization"],
        "new_modules_p": ["sys.telemetry.contracts", "sys.twin", "ml.ops.evals", "ml.llm", "ml.edge.deploy"],
        "hours_p": "65–120 core hours (leverages founder cloud strength) + L11 [P]",
        "graders_p": "repo + log verification, rubric on eval reports, automated schema tests.",
        "boundary": "No unverified AI efficacy claims (NG-07).",
    },
    {
        "file": "pillar-T6-governance.md",
        "track": "governance",
        "title": "Governance (T6)",
        "order": 6,
        "prereq": "foundation (parallel_ok with other tracks)",
        "ladder": "Module checkpoints (no single L6–L13 gate)",
        "artifact": "Checkpoint sets: export scenario MC + UAS ops ack + device threat model + CRA and CE checklist.",
        "nodes": ["def", "prof", "sec", "econ"],
        "domains": [
            "Export control literacy (EU Annex I awareness, workflow with counsel).",
            "Device threat modelling, zones/conduits, supply-chain/SBOM narrative.",
            "Dual-use product decomposition; defense integrator documentation habits.",
            "BOM costing and programme economics basics.",
            "EU product compliance: Cyber Resilience Act, CE marking, radio rules, product liability.",
        ],
        "promote_stubs": ["prof.law.export-control-literacy", "sec.hw.threat-modelling", "econ.cost.bom-costing"],
        "new_modules_p": ["def.export.scenarios", "sec.ot.zones", "prof.integrator.docs", "prof.eu"],
        "hours_p": "30–60 core hours [P]",
        "graders_p": "MC/short-answer scenario items; rubric_llm with human sign-off; no legal advice.",
        "boundary": "Literacy only; no weapons/EW enablement (NG-06, PRD). No evasion: design choices go to counsel, and structuring to sidestep a control is excluded.",
    },
]


def skill_table(skills: list, lean: set[str], *, show_status: bool = False) -> str:
    if show_status:
        header = "| Skill key | Title | Tier | min | Phone | Graders | Graph | Lean |"
        sep = "|-----------|-------|------|-----|-------|---------|-------|------|"
    else:
        header = "| Skill key | Title | Tier | min | Phone | Graders | Lean |"
        sep = "|-----------|-------|------|-----|-------|---------|------|"
    lines = [header, sep]
    for s in sorted(skills, key=lambda x: x["key"]):
        graders = s.get("grader_types") or []
        g = ", ".join(graders[:2])
        if len(graders) > 2:
            g += "…"
        if not g:
            g = "—"
        row = (
            f"| `{s['key']}` | {s['title']} | {s['tier_target']} | {s['est_minutes']} | "
            f"{'yes' if s.get('phone_suitable') else 'no'} | {g} | "
        )
        if show_status:
            row += f"{s.get('status', 'planned')} | "
        row += f"{'yes' if s['key'] in lean else ''} |"
        lines.append(row)
    return "\n".join(lines)


def graph_by_key(g: dict) -> dict[str, dict]:
    return {s["key"]: s for s in g["skills"]}


def load_foundation_module_syllabus() -> dict[str, dict]:
    doc = yaml.safe_load(FOUNDATION_PLAN.read_text(encoding="utf-8"))
    return {m["key"]: m for m in doc["modules"]}


def iter_spine_skill_refs(spine: dict):
    for track_key, track in spine.get("tracks", {}).items():
        for mod in track.get("modules", []):
            mod_key = mod["key"]
            for sk in mod.get("skills", []):
                if isinstance(sk, str):
                    yield track_key, mod_key, sk, "graph"
                else:
                    yield track_key, mod_key, sk["key"], sk.get("status", "planned")


def write_spine_planned_skills_registry(spine: dict, by_key: dict[str, dict]) -> None:
    rows: list[dict] = []
    for track_key, mod_key, skill_key, spec in iter_spine_skill_refs(spine):
        if skill_key in by_key:
            continue
        row = {
            "key": skill_key,
            "track": track_key,
            "module": mod_key,
            "graph_status": "not_in_mvp_graph",
        }
        if isinstance(spec, dict):
            row["title"] = spec.get("title")
            row["tier_target"] = spec.get("tier_target")
        rows.append(row)
    rows.sort(key=lambda r: r["key"])
    doc = {
        "version": "1.0",
        "status": "planning",
        "description": "Spine-only skill keys from spine-module-plan.yaml not yet in mvp-skill-graph.yaml.",
        "regenerate": "python reference/generate_pillar_syllabi.py",
        "planned_skills": rows,
    }
    PLANNED_SKILLS.write_text(yaml.dump(doc, sort_keys=False, allow_unicode=True, width=120), encoding="utf-8")


def resolve_module_skills(specs: list, by_key: dict[str, dict]) -> list[dict]:
    out: list[dict] = []
    for spec in specs:
        if isinstance(spec, str):
            spec = {"key": spec}
        key = spec["key"]
        gsk = by_key.get(key)
        if gsk:
            mins = gsk.get("est_minutes") or 0
            if mins == 0:
                mins = spec.get("est_minutes", 25)
            out.append(
                {
                    "key": key,
                    "title": gsk.get("title", spec.get("title", key)),
                    "tier_target": gsk.get("tier_target", spec.get("tier_target", "L1")),
                    "est_minutes": mins,
                    "phone_suitable": gsk.get("phone_suitable", spec.get("phone_suitable", False)),
                    "grader_types": gsk.get("grader_types") or spec.get("grader_types", ["multiple_choice"]),
                    "status": gsk.get("status", "draft"),
                }
            )
        else:
            out.append(
                {
                    "key": key,
                    "title": spec.get("title", key),
                    "tier_target": spec.get("tier_target", "L1"),
                    "est_minutes": spec.get("est_minutes", 25),
                    "phone_suitable": spec.get("phone_suitable", False),
                    "grader_types": spec.get("grader_types", ["multiple_choice"]),
                    "status": spec.get("status", "planned"),
                }
            )
    return out


def write_foundation(g: dict, lean: set[str], module_syllabus: dict[str, dict]) -> None:
    mods = {m["key"]: m for m in g["modules"]}
    by_mod: dict[str, list] = defaultdict(list)
    by_node: dict[str, list] = defaultdict(list)
    for s in g["skills"]:
        mk = f"{s['node']}.{s['module']}"
        if s.get("status") in ("stub", "needs_human_review") or mk not in module_syllabus:  # T1-T6 and bridge skills render in their own pillar
            continue
        by_mod[mk].append(s)
        by_node[s["node"]].append(s)

    parts = [
        "# Pillar T0 — Foundation (first walk)\n\n",
        "Status: v1.0, 1 Nov 2026. **Planning / curriculum; not a contract change.** "
        "Track key: `foundation` in `content/capability-tracks.yaml`. "
        "Authoritative skill graph: `content/mvp-skill-graph.yaml`. "
        "Module plan: `content/syllabi/foundation-module-plan.yaml`. "
        "Projects: `content/project-ladder.yaml` L0–L5.\n\n",
        "## Pillar purpose\n\n",
        "Take one adult from near-zero to **working knowledge (L1)** in **math essentials**, "
        "**electronics**, and **embedded software**, evidenced by unaided checkpoints, "
        "verified practice, and accepted project evidence through the sensor-logging capstone.\n\n",
        "## L1 competence artifact (product display)\n\n",
        "- **Capstone path:** L3 I2C sensor + UART log → L4 FSM/ISR device → filtered/calibrated data (doc 05 §6.3).\n",
        "- **L5 KiCad board** ships late (M5) but is part of the foundation track scope.\n",
        "- **Strict-unaided** checkpoints and tutor-off weeks when D2/D4 ship (doc 11).\n\n",
        "## Pillar totals [P]\n\n",
        "| Node | Skills | Core hours (sum est_minutes) | Modules |\n",
        "|------|--------|------------------------------|---------|\n",
    ]
    for node in ("math", "elec", "sw"):
        sk = by_node[node]
        mins = sum(s["est_minutes"] for s in sk)
        mod_count = len({f"{s['node']}.{s['module']}" for s in sk})
        parts.append(f"| `{node}` | {len(sk)} | {mins/60:.1f} h | {mod_count} |\n")
    parts.append(
        f"| **All foundation** | **142** | "
        f"**{sum(s['est_minutes'] for v in by_mod.values() for s in v) / 60:.1f} h** | **17** |\n\n"
    )
    parts.append("\nPlanning range with reviews/projects overlap: **160–300 h** (doc 05 §6.2).\n\n")
    parts.append("## Lean slice within this pillar\n\n")
    parts.append(
        f"- **19 skills** in `content/lean-skill-slice.yaml` (mostly `math.alg` + `elec.dc` + safety/measurement roots).\n"
        "- **~30 verified templates** before go/no-go (BL-0065/0066).\n"
        "- Remaining modules stay on the map as `draft` until authored.\n\n"
    )
    parts.append("## Discipline overview\n\n")
    for node, title in (
        ("math", "Mathematics essentials"),
        ("elec", "Electronics"),
        ("sw", "Software & embedded firmware"),
    ):
        sk = by_node[node]
        parts.append(f"### `{node}` — {title}\n\n")
        parts.append(f"{len(sk)} skills. Modules (meet order): ")
        mod_keys = sorted({f"{s['node']}.{s['module']}" for s in sk}, key=lambda k: mods[k]["order"])
        parts.append(", ".join(f"`{k}`" for k in mod_keys) + ".\n\n")

    parts.append("## Module syllabi\n\n")
    for mk in sorted(mods, key=lambda k: mods[k]["order"]):
        m = mods[mk]
        skills = by_mod.get(mk, [])
        meta = module_syllabus.get(mk, {})
        mins = sum(s["est_minutes"] for s in skills)
        parts.append(f"### `{mk}` — {m['title']}\n\n")
        parts.append(
            f"**Order:** {m['order']} · **Node:** `{m['node']}` · **Skills:** {len(skills)} · "
            f"**Core:** ~{mins/60:.1f} h [P]\n\n"
        )
        parts.append("**Outcomes (after this module):**\n")
        for o in meta.get("outcomes", ["(Authoring pending — apply doc 05 §10 checklist.)"]):
            parts.append(f"- {o}\n")
        parts.append(f"\n**Evidence path:** {meta.get('evidence', 'See doc 10 §8.3.')}\n")
        parts.append(f"**Projects (ladder touch):** {meta.get('projects', '—')}\n")
        parts.append(f"**Checkpoints / assessment:** {meta.get('checkpoint', 'Module-end unaided checkpoint (D4).')}\n")
        if meta.get("hard_task"):
            parts.append(f"**Hard task (unaided):** {meta['hard_task']}\n")
        parts.append(f"**Confusable set:** {meta.get('confusables', 'none')}\n")
        parts.append(f"**Template plan [P]:** {meta.get('templates_p', '~2 verified templates per gated skill.')}\n")
        parts.append("\n**Skills:**\n\n")
        parts.append(skill_table(skills, lean) + "\n\n")

    parts.append("## Capstone skill map (doc 05 §6.3)\n\n")
    parts.append(textwrap.dedent("""
        | Ladder | Terminal skills |
        |--------|-----------------|
        | L0 blink | `elec.semi.led-current-limit`, `sw.fw.gpio-output`, `elec.meas.breadboard-build` |
        | L1 RC/divider | `elec.rc.filter-bench`, `elec.rc.spice-rc`, `elec.meas.measure-vs-simulate` |
        | L2 switch/reg | `elec.semi.mosfet-switch`, `elec.semi.regulator-dissipation`, `elec.semi.inductive-load` |
        | L3 sensor | `sw.fw.i2c-sensor-read`, `sw.fw.uart-logging`, `sw.fw.logic-analyzer`, `sw.fsm.nonblocking-timing` |
        | L4 FSM/ISR | `sw.fsm.fsm-testing`, `sw.fw.isr-shared-data`, `sw.fw.debounce` |
        | L5 filter/cal | `sw.fw.exponential-filter`, `sw.fw.moving-average`, `sw.fw.sensor-calibration` |
        | L5 KiCad | `elec.pcb.kicad-schematic-erc` (stub until promoted) |
    """).strip() + "\n")

    (OUT / "pillar-T0-foundation.md").write_text("".join(parts), encoding="utf-8")


def write_spine(p: dict, track_plan: dict, by_key: dict[str, dict], lean: set[str]) -> None:
    modules = track_plan.get("modules", [])
    by_node: dict[str, list] = defaultdict(list)
    all_skills: list[dict] = []
    for mod in modules:
        resolved = resolve_module_skills(mod.get("skills", []), by_key)
        all_skills.extend(resolved)
        by_node[mod["node"]].extend(resolved)

    body = [
        f"# Pillar {p['title']}\n\n",
        "Status: v1.0, 1 Nov 2026. **Spine planning only** — ships after first-walk L1 + go/no-go (doc 15, `00d` §8). "
        "Not loaded by v1 `content:sync`. Module plan: `content/syllabi/spine-module-plan.yaml`.\n\n",
        f"**Track key:** `{p['track']}` · **Order:** {p['order']} · **Prerequisites:** {p['prereq']}\n\n",
        "## Competence artifact\n\n",
        p["artifact"] + "\n\n",
        "## Primary ladder project(s)\n\n",
        p["ladder"] + "\n\n",
        "## Pillar purpose\n\n",
    ]
    for d in p["domains"]:
        body.append(f"- {d}\n")
    body.append("\n## Pillar totals [P]\n\n")
    body.append("| Node | Skills | Core hours (sum est_minutes) | Modules |\n")
    body.append("|------|--------|------------------------------|---------|\n")
    node_names = sorted(by_node.keys())
    for node in node_names:
        sk = by_node[node]
        mins = sum(s["est_minutes"] for s in sk)
        mod_count = len({m["key"] for m in modules if m["node"] == node})
        body.append(f"| `{node}` | {len(sk)} | {mins / 60:.1f} h | {mod_count} |\n")
    total_mins = sum(s["est_minutes"] for s in all_skills)
    body.append(
        f"| **Track total** | **{len(all_skills)}** | **{total_mins / 60:.1f} h** | **{len(modules)}** |\n\n"
    )
    body.append(SPINE_HOURS_NOTE)
    body.append(f"Planning band (projects/review overlap): **{p['hours_p']}**\n\n")
    body.append("## Promote from MVP stubs\n\n")
    for s in p["promote_stubs"]:
        body.append(f"- `{s}`\n")
    body.append("\n## New module keys (authoring) [P]\n\n")
    for m in p["new_modules_p"]:
        body.append(f"- `{m}`\n")
    body.append(f"\n## Graders & evidence [P]\n\n{p['graders_p']}\n\n")
    body.append(f"## Boundaries\n\n{p['boundary']}\n\n")

    body.append("## Discipline overview\n\n")
    for node in node_names:
        sk = by_node[node]
        mod_keys = [m["key"] for m in sorted(modules, key=lambda x: x["order"]) if m["node"] == node]
        body.append(f"### `{node}`\n\n")
        body.append(f"{len(sk)} skills across modules: {', '.join(f'`{k}`' for k in mod_keys)}.\n\n")

    body.append("## Module syllabi\n\n")
    for mod in sorted(modules, key=lambda x: x["order"]):
        resolved = resolve_module_skills(mod.get("skills", []), by_key)
        mins = sum(s["est_minutes"] for s in resolved)
        body.append(f"### `{mod['key']}` — {mod['title']}\n\n")
        body.append(
            f"**Order:** {mod['order']} · **Node:** `{mod['node']}` · **Skills:** {len(resolved)} · "
            f"**Core:** ~{mins / 60:.1f} h [P]\n\n"
        )
        body.append("**Outcomes (after this module):**\n")
        for o in mod.get("outcomes", ["(Authoring pending.)"]):
            body.append(f"- {o}\n")
        body.append(f"\n**Evidence path:** {mod.get('evidence', 'See doc 15.')}\n")
        body.append(f"**Projects (ladder touch):** {mod.get('projects', '—')}\n")
        body.append(f"**Checkpoints / assessment:** {mod.get('checkpoint', 'Module-end checkpoint when track ships.')}\n")
        if mod.get("hard_task"):
            body.append(f"**Hard task (unaided):** {mod['hard_task']}\n")
        body.append(f"**Confusable set:** {mod.get('confusables', 'none')}\n")
        body.append(f"**Template plan [P]:** {mod.get('templates_p', '~2 verified templates per gated skill.')}\n")
        body.append("\n**Skills:**\n\n")
        body.append(skill_table(resolved, lean, show_status=True) + "\n\n")

    cap = track_plan.get("capstone_map", "").strip()
    if cap:
        body.append("## Ladder skill map [P]\n\n")
        body.append(cap + "\n\n")

    body.append("## Sequencing notes\n\n")
    body.append(
        "- Same pedagogy as foundation: verified templates, strict-unaided checkpoints, project credit caps (contract §7).\n"
        "- Hardware phases: `docs/17-hardware-tools-and-bom.md`, `content/hardware-phases.yaml`.\n"
        "- Sketch projects: `content/extended-project-ladder-sketch.yaml`.\n"
        "- Regenerate this file after editing `spine-module-plan.yaml` or promoting stubs in `mvp-skill-graph.yaml`.\n"
    )
    (OUT / p["file"]).write_text("".join(body), encoding="utf-8")


def write_readme() -> None:
    text = """# Capability pillar syllabi

Status: v1.0, 1 Nov 2026. **Curriculum planning** — complements `docs/05-skill-graph-and-curriculum-spec.md` and `content/capability-tracks.yaml`.

| Pillar | File | Track |
|--------|------|-------|
| T0 Foundation | [pillar-T0-foundation.md](pillar-T0-foundation.md) | `foundation` — full first walk (17 modules, 142 skills) |
| T1 Power & motion | [pillar-T1-power-motion.md](pillar-T1-power-motion.md) | `power-motion` — module syllabi from spine plan |
| T2 Control | [pillar-T2-control.md](pillar-T2-control.md) | `control` |
| T3 Mechanical | [pillar-T3-mechanical.md](pillar-T3-mechanical.md) | `mechanical` |
| T4 UAV / robo | [pillar-T4-robo.md](pillar-T4-robo.md) | `robo` |
| T5 Cloud twin | [pillar-T5-cloud-twin.md](pillar-T5-cloud-twin.md) | `cloud-twin` |
| T6 Governance | [pillar-T6-governance.md](pillar-T6-governance.md) | `governance` |

Spine module source (T1–T6): [spine-module-plan.yaml](spine-module-plan.yaml). Foundation (T0): [foundation-module-plan.yaml](foundation-module-plan.yaml). Planned spine keys not in the graph: [spine-planned-skills.yaml](spine-planned-skills.yaml).

Regenerate pillar markdown after graph or spine plan edits:

```bash
python3 reference/generate_pillar_syllabi.py
```

Lean slice cross-ref: `content/lean-skill-slice.yaml`.

Docs site (offline): `docs-site/assets/syllabi-data.js` is regenerated with the markdown bundle for `syllabi.html`.
"""
    (OUT / "README.md").write_text(text, encoding="utf-8")


def write_syllabi_bundle() -> None:
    """Embed pillar markdown for docs-site/syllabi.html (works on file://, no HTTP server)."""
    data: dict[str, str] = {}
    for path in sorted(OUT.glob("pillar-*.md")):
        data[path.name] = path.read_text(encoding="utf-8")
    payload = json.dumps(data, ensure_ascii=False)
    SYLLABI_BUNDLE.parent.mkdir(parents=True, exist_ok=True)
    SYLLABI_BUNDLE.write_text(
        "/* Auto-generated by reference/generate_pillar_syllabi.py — do not edit. */\n"
        "window.POLYMATH_SYLLABI = "
        + payload
        + ";\n",
        encoding="utf-8",
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    g = yaml.safe_load(GRAPH.read_text(encoding="utf-8"))
    lean = set(yaml.safe_load(LEAN.read_text(encoding="utf-8"))["skill_keys"])
    spine = yaml.safe_load(SPINE_PLAN.read_text(encoding="utf-8"))
    tracks = spine.get("tracks", {})
    by_key = graph_by_key(g)
    module_syllabus = load_foundation_module_syllabus()
    write_spine_planned_skills_registry(spine, by_key)
    write_foundation(g, lean, module_syllabus)
    for p in SPINE_PILLARS:
        plan = tracks.get(p["track"], {})
        if not plan.get("modules"):
            raise SystemExit(f"No modules in spine plan for track {p['track']}")
        write_spine(p, plan, by_key, lean)
    write_readme()
    write_syllabi_bundle()
    print(f"Wrote {len(list(OUT.glob('pillar-*.md')))} pillar files to {OUT}")
    print(f"Wrote docs-site bundle {SYLLABI_BUNDLE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
