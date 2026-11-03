#!/usr/bin/env python3
"""Create content/templates/ for BL-0065/0066 (30 lean-slice templates). Run verify separately."""
from __future__ import annotations

import sys

import shutil
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content" / "templates"
SAMPLES = ROOT / "content" / "sample-problem-templates"

BASE_PROVENANCE = {
    "authors": ["founder"],
    "created": "2026-11-01",
    "llm_assistance": {
        "used": True,
        "roles": ["draft_template", "hints", "misconception_tags"],
        "model": "claude-sonnet-5-5",
        "prompt_version": "template_assist_v1",
    },
}

FUZZ = {"samples": 200, "seed_base": 5000, "max_rejection_rate": 0.9}

HINTS_DEFAULT = {
    "l1": "Restate what the question is asking in your own words.",
    "l2": "Write the defining equation or rule before you calculate.",
    "l3": "Compare your result to a quick estimate or limiting case.",
}


def write(path: Path, doc: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.dump(doc, sort_keys=False, allow_unicode=True, width=120), encoding="utf-8")


def mc_concept(
    key: str,
    skill: str,
    title: str,
    stem: str,
    correct_md: str,
    distractors: list[tuple[str, str, str]],
) -> dict:
    """Fixed multiple-choice (variant param keeps schema happy; stem unchanged)."""
    outputs: dict[str, str] = {"ans": "1"}
    opts = [{"id": "correct", "correct": True, "value_expr": "ans", "text_md": correct_md}]
    misconceptions = []
    for i, (tag, text, fb) in enumerate(distractors):
        outputs[f"w{i}"] = str(i + 2)
        opts.append(
            {
                "id": f"w{i}",
                "correct": False,
                "value_expr": f"w{i}",
                "text_md": text,
                "misconception_tag": tag,
                "feedback_md": fb,
            }
        )
        misconceptions.append({"tag": tag, "description": fb[:120]})
    return {
        "schema_version": 1,
        "key": key,
        "version": 1,
        "authoring_status": "ready",
        "skill_key": skill,
        "task_kind": "problem",
        "grader_type": "multiple_choice",
        "difficulty_prior": 0.3,
        "title": title,
        "license": "original",
        "source": "original",
        "provenance": dict(BASE_PROVENANCE),
        "delivery": {"contexts": ["phone", "desktop"], "est_seconds": 45, "phone_suitable": True, "offline_gradable": True},
        "parameters": [{"name": "variant", "type": "choice", "values": [1, 2], "description": "Reserved for future variants"}],
        "constraints": [],
        "render": {"stem_md": stem, "alt_text": title},
        "solution": {
            "generator": {"method": "closed_form", "outputs": outputs},
            "steps": [{"id": "s1", "text_md": "Select the option that matches the definition or rule."}],
        },
        "answer": {"n_shown": min(4, len(opts)), "shuffle": True, "options": opts[:4]},
        "verifiers": [
            {
                "id": "options-distinct",
                "kind": "distinct_options",
                "independence": "Pairwise separation of option values; exactly one correct.",
                "spec": {"correct_output": "ans"},
                "tolerance": {"rel": 0.01},
            },
            {
                "id": "answer-window",
                "kind": "bounds",
                "independence": "Sanity range on the keyed numeric tag for the correct option.",
                "spec": {"output": "ans", "lo": "0.5", "hi": "1.5"},
                "tolerance": {"rel": 0.0},
            },
        ],
        "hints": dict(HINTS_DEFAULT),
        "misconceptions": misconceptions,
        "fuzz": FUZZ,
    }


def numeric_expr(
    key: str,
    skill: str,
    title: str,
    stem: str,
    params: list,
    outputs: dict,
    answer_key: str,
    unit: str,
    expr_checks: list[tuple[str, str]],
    steps: list[dict],
) -> dict:
    verifiers = [
        {
            "id": "sympy-exact",
            "kind": "sympy_exact",
            "independence": "Recomputes from closed form with sympy.",
            "spec": {"checks": [{"expr": e, "output": o} for e, o in expr_checks]},
            "tolerance": {"rel": 1e-9},
        },
    ]
    has_dim_params = any(p.get("unit") for p in params)
    if unit and has_dim_params:
        verifiers.append(
            {
                "id": "dimension",
                "kind": "pint_dimension",
                "independence": "Dimensional analysis on the result expression.",
                "spec": {"checks": [{"expr": expr_checks[0][0], "result_unit": unit}]},
                "tolerance": {"rel": 0.0},
            }
        )
    else:
        verifiers.append(
            {
                "id": "bounds",
                "kind": "bounds",
                "independence": "Range check on the numeric answer.",
                "spec": {"output": answer_key, "lo": "-1e6", "hi": "1e6"},
                "tolerance": {"rel": 0.0},
            }
        )
    return {
        "schema_version": 1,
        "key": key,
        "version": 1,
        "authoring_status": "ready",
        "skill_key": skill,
        "task_kind": "problem",
        "grader_type": "exact_numeric",
        "difficulty_prior": 0.35,
        "title": title,
        "license": "original",
        "source": "original",
        "provenance": dict(BASE_PROVENANCE),
        "delivery": {"contexts": ["phone", "desktop"], "est_seconds": 60, "phone_suitable": True, "offline_gradable": True},
        "parameters": params,
        "constraints": [],
        "render": {
            "stem_md": stem,
            "answer_prompt": f"Enter a value{' with unit (' + unit + ')' if unit else ''}.",
            "alt_text": title,
        },
        "solution": {"generator": {"method": "closed_form", "outputs": outputs}, "steps": steps},
        "answer": {
            "kind": "numeric",
            "value": answer_key,
            **(
                {"unit": unit, "accept_units": [unit], "bare_number_means": unit}
                if unit
                else {}
            ),
            "tolerance": {"rel": 0.02, "abs": 0.001},
        },
        "verifiers": verifiers,
        "hints": dict(HINTS_DEFAULT),
        "misconceptions": [{"tag": "mc.arithmetic", "description": "Arithmetic or unit slip."}],
        "fuzz": FUZZ,
    }


def main() -> None:
    sys.exit("Retired 2 Nov 2026: it would overwrite hand-edited templates. Edit content/templates/ directly.")
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    copies = [
        ("tpl.elec.voltage-divider-vout.yaml", "elec/tpl.elec.voltage-divider-vout.yaml"),
        ("tpl.elec.series-parallel-req-mc.yaml", "elec/tpl.elec.series-parallel-req-mc.yaml"),
    ]
    for src, dest in copies:
        dest_path = OUT / dest
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(SAMPLES / src, dest_path)

    specs: list[tuple[str, dict]] = []

    # --- 15 math templates (9 skills) ---
    math = [
        (
            "math/tpl.math.order-pemdas.yaml",
            mc_concept(
                "tpl.math.order-pemdas",
                "math.alg.order-of-operations",
                "Order of operations",
                "Evaluate $2 + 3 \\times 4$.",
                "$14$",
                [("mc.add-first", "$20$", "Multiply before adding unless parentheses say otherwise.")],
            ),
        ),
        (
            "math/tpl.math.order-parens.yaml",
            mc_concept(
                "tpl.math.order-parens",
                "math.alg.order-of-operations",
                "Parentheses first",
                "Evaluate $(2 + 3) \\times 4$.",
                "$20$",
                [("mc.no-parens", "$14$", "Work inside parentheses before multiplying.")],
            ),
        ),
        (
            "math/tpl.math.units-kilo.yaml",
            mc_concept(
                "tpl.math.units-kilo",
                "math.alg.units-and-prefixes",
                "Kilo to milli",
                "How many milliamps are in $2\\ \\text{A}$?",
                "$2000\\ \\text{mA}$",
                [("mc.off-3", "$20\\ \\text{mA}$", "Each amp is $1000\\ \\text{mA}$.")],
            ),
        ),
        (
            "math/tpl.math.units-mega.yaml",
            mc_concept(
                "tpl.math.units-mega",
                "math.alg.units-and-prefixes",
                "Mega to kilo",
                "$3\\ \\text{M}\\Omega$ equals how many $\\text{k}\\Omega$?",
                "$3000\\ \\text{k}\\Omega$",
                [("mc.wrong", "$3\\ \\text{k}\\Omega$", "Mega is $10^6$; kilo is $10^3$.")],
            ),
        ),
        (
            "math/tpl.math.solve-linear-v1.yaml",
            mc_concept(
                "tpl.math.solve-linear-v1",
                "math.alg.solve-linear",
                "Two-step linear",
                "Solve: $3x + 6 = 15$.",
                "$3$",
                [("mc.forget-sub", "$5$", "Subtract 6 from both sides before dividing by 3.")],
            ),
        ),
        (
            "math/tpl.math.solve-linear-v2.yaml",
            mc_concept(
                "tpl.math.solve-linear-v2",
                "math.alg.solve-linear",
                "Simple linear",
                "Solve: $x/2 = 4$.",
                "$8$",
                [("mc.half", "$2$", "Multiply both sides by 2.")],
            ),
        ),
        (
            "math/tpl.math.rearrange-ohm.yaml",
            numeric_expr(
                "tpl.math.rearrange-ohm",
                "math.alg.rearrange-formulas",
                "Rearrange Ohm's law for R",
                "Given $V = I R$, find $R$ when $V={{v|tex:V}}$ and $I={{i|tex:A}}$.",
                [
                    {"name": "v", "type": "float", "min": 1.0, "max": 12.0, "step": 0.5},
                    {"name": "i", "type": "float", "min": 0.01, "max": 2.0, "step": 0.01, "nonzero": True},
                ],
                {"r_ohm": "v / i"},
                "r_ohm",
                "ohm",
                [("v / i", "r_ohm")],
                [{"id": "s1", "text_md": "Divide both sides by $I$: $R = V/I = {{r_ohm|tex:ohm}}$."}],
            ),
        ),
        (
            "math/tpl.math.rearrange-power.yaml",
            mc_concept(
                "tpl.math.rearrange-power",
                "math.alg.rearrange-formulas",
                "Isolate I in P=VI",
                "From $P=VI$, which expression gives $I$?",
                "$I = P/V$",
                [("mc.flip", "$I = V/P$", "Divide $P$ by $V$, not the other way around.")],
            ),
        ),
        (
            "math/tpl.math.ratios-percent.yaml",
            mc_concept(
                "tpl.math.ratios-percent",
                "math.alg.ratios-proportions",
                "Percent of value",
                "What is $25\\%$ of $80$?",
                "$20$",
                [("mc.decimal", "$0.25$", "That is the fraction, not the part of 80.")],
            ),
        ),
        (
            "math/tpl.math.ratios-split.yaml",
            mc_concept(
                "tpl.math.ratios-split",
                "math.alg.ratios-proportions",
                "Ratio split",
                "Divide $12$ in ratio $1:2$. What is the larger share?",
                "$8$",
                [("mc.equal", "$6$", "The parts are not equal when the ratio is 1:2.")],
            ),
        ),
        (
            "math/tpl.math.linear-slope.yaml",
            mc_concept(
                "tpl.math.linear-slope",
                "math.alg.linear-functions",
                "Slope from points",
                "A line through $(0,0)$ and $(2,6)$ has slope:",
                "$3$",
                [("mc.recip", "$1/3$", "Slope is rise over run: $\\Delta y / \\Delta x$.")],
            ),
        ),
        (
            "math/tpl.math.linear-intercept.yaml",
            mc_concept(
                "tpl.math.linear-intercept",
                "math.alg.linear-functions",
                "y-intercept",
                "For $y = 2x + 5$, the $y$-intercept is:",
                "$5$",
                [("mc.slope", "$2$", "That is the slope, not where the line crosses the $y$-axis.")],
            ),
        ),
        (
            "math/tpl.math.systems-x.yaml",
            mc_concept(
                "tpl.math.systems-x",
                "math.alg.systems-2x2",
                "2×2 system",
                "If $x+y=5$ and $x-y=1$, what is $x$?",
                "$3$",
                [("mc.y", "$2$", "That would be $y$, not $x$.")],
            ),
        ),
        (
            "math/tpl.math.exponents-square.yaml",
            mc_concept(
                "tpl.math.exponents-square",
                "math.alg.exponents-roots",
                "Square",
                "What is $5^2$?",
                "$25$",
                [("mc.double", "$10$", "$5^2$ means $5 \\times 5$.")],
            ),
        ),
        (
            "math/tpl.math.quadratics-roots.yaml",
            mc_concept(
                "tpl.math.quadratics-roots",
                "math.alg.quadratics",
                "Factor roots",
                "Which pair are roots of $x^2 - 5x + 6 = 0$?",
                "$2$ and $3$",
                [("mc.sign", "$-2$ and $-3$", "Check the sum and product of the roots.")],
            ),
        ),
    ]
    specs.extend(math)

    # --- 13 generated elec + 2 copied = 15 elec ---
    elec = [
        (
            "elec/tpl.elec.lab-esd.yaml",
            mc_concept(
                "tpl.elec.lab-esd",
                "elec.meas.lab-safety-esd",
                "ESD wrist strap",
                "Before handling a bare MOSFET, you should:",
                "Use an ESD wrist strap tied to bench ground",
                [("mc.skip", "Touch the PCB edge only", "ESD can destroy sensitive gates before you feel a shock.")],
            ),
        ),
        (
            "elec/tpl.elec.lab-probe.yaml",
            mc_concept(
                "tpl.elec.lab-probe",
                "elec.meas.lab-safety-esd",
                "Probe reference",
                "When probing a powered breadboard, first:",
                "Confirm supply limits and probe ground reference",
                [("mc.hot", "Probe any node with one hand only — no ground check", "Know your ground clip reference before touching nodes.")],
            ),
        ),
        (
            "elec/tpl.elec.schematic-gnd.yaml",
            mc_concept(
                "tpl.elec.schematic-gnd",
                "elec.meas.schematic-reading",
                "Ground symbol",
                "The ground symbol on a schematic means:",
                "The reference node at 0 V for that circuit",
                [("mc.earth", "Connection to mains earth only", "It is the circuit reference, not necessarily mains earth.")],
            ),
        ),
        (
            "elec/tpl.elec.schematic-series.yaml",
            mc_concept(
                "tpl.elec.schematic-series",
                "elec.meas.schematic-reading",
                "Series current",
                "Two resistors drawn in series share:",
                "The same current",
                [("mc.voltage", "The same voltage", "Series elements carry the same current; voltage divides.")],
            ),
        ),
        (
            "elec/tpl.elec.charge-current.yaml",
            numeric_expr(
                "tpl.elec.charge-current",
                "elec.dc.charge-current-voltage",
                "Charge and current",
                "If $Q={{q|tex:C}}$ passes in $t={{t|tex:s}}$, what is the average current?",
                [
                    {"name": "q", "type": "float", "min": 0.5, "max": 10.0, "step": 0.5, "unit": "C"},
                    {"name": "t", "type": "float", "min": 0.1, "max": 5.0, "step": 0.1, "nonzero": True, "unit": "s"},
                ],
                {"i": "q / t"},
                "i",
                "A",
                [("q / t", "i")],
                [{"id": "s1", "text_md": "Average current is charge over time: $I = Q/t = {{i|tex:A}}$."}],
            ),
        ),
        (
            "elec/tpl.elec.ohms-law-v.yaml",
            numeric_expr(
                "tpl.elec.ohms-law-v",
                "elec.dc.ohms-law",
                "Ohm's law for V",
                "Find $V$ for $R={{r|tex:\\Omega}}$ and $I={{i|tex:A}}$ using $V=IR$.",
                [
                    {"name": "r", "type": "float", "min": 100.0, "max": 10000.0, "step": 10.0, "nonzero": True, "unit": "ohm"},
                    {"name": "i", "type": "float", "min": 0.001, "max": 0.1, "step": 0.001, "nonzero": True, "unit": "A"},
                ],
                {"v": "r * i"},
                "v",
                "V",
                [("r * i", "v")],
                [{"id": "s1", "text_md": "Multiply: $V = IR = {{v|tex:V}}$."}],
            ),
        ),
        (
            "elec/tpl.elec.ohms-law-r.yaml",
            numeric_expr(
                "tpl.elec.ohms-law-r",
                "elec.dc.ohms-law",
                "Ohm's law for R",
                "Find $R$ when $V=12\\ \\text{V}$ and $I=0.03\\ \\text{A}$.",
                [{"name": "variant", "type": "choice", "values": [1, 2], "description": "Reserved"}],
                {"r_ohm": "400"},
                "r_ohm",
                "ohm",
                [("400", "r_ohm")],
                [{"id": "s1", "text_md": "$R = V/I = 12/0.03 = {{r_ohm|tex:ohm}}$."}],
            ),
        ),
        (
            "elec/tpl.elec.power-diss.yaml",
            numeric_expr(
                "tpl.elec.power-diss",
                "elec.dc.power-energy",
                "Electrical power",
                "Power: $P = V I$ with $V={{v|tex:V}}$, $I={{i|tex:A}}$.",
                [
                    {"name": "v", "type": "choice", "unit": "V", "values": [3.3, 5, 9, 12]},
                    {"name": "i", "type": "float", "min": 0.01, "max": 0.5, "step": 0.01, "nonzero": True, "unit": "A"},
                ],
                {"p": "v * i"},
                "p",
                "W",
                [("v * i", "p")],
                [{"id": "s1", "text_md": "$P = VI = {{p|tex:W}}$."}],
            ),
        ),
        (
            "elec/tpl.elec.energy-joule.yaml",
            numeric_expr(
                "tpl.elec.energy-joule",
                "elec.dc.power-energy",
                "Energy from power",
                "Energy delivered in $t=60\\ \\text{s}$ at $P=2\\ \\text{W}$?",
                [{"name": "variant", "type": "choice", "values": [1, 2], "description": "Reserved"}],
                {"energy_j": "120"},
                "energy_j",
                "J",
                [("120", "energy_j")],
                [{"id": "s1", "text_md": "$E = Pt = 2 \\times 60 = {{energy_j|tex:J}}$."}],
            ),
        ),
        (
            "elec/tpl.elec.parallel-pair.yaml",
            mc_concept(
                "tpl.elec.parallel-pair",
                "elec.dc.series-parallel",
                "Parallel pair",
                "Two $100\\ \\Omega$ resistors in parallel equal:",
                "$50\\ \\Omega$",
                [("mc.series", "$200\\ \\Omega$", "Parallel resistance is smaller than either resistor.")],
            ),
        ),
        (
            "elec/tpl.elec.kirchhoff-kcl.yaml",
            mc_concept(
                "tpl.elec.kirchhoff-kcl",
                "elec.dc.kirchhoff-laws",
                "KCL at node",
                "At a node with no storage, the sum of currents:",
                "Is zero (in = out)",
                [("mc.sum-v", "Equals the node voltage", "KCL is about current, not voltage.")],
            ),
        ),
        (
            "elec/tpl.elec.nodal-unknown.yaml",
            mc_concept(
                "tpl.elec.nodal-unknown",
                "elec.dc.nodal-analysis",
                "Nodal analysis",
                "Nodal analysis assigns unknowns at:",
                "Nodes (junctions)",
                [("mc.branch", "Branches only", "Junction voltages are the usual unknowns.")],
            ),
        ),
        (
            "elec/tpl.elec.thevenin-model.yaml",
            mc_concept(
                "tpl.elec.thevenin-model",
                "elec.dc.thevenin-norton",
                "Thevenin model",
                "A Thevenin equivalent uses:",
                "A voltage source in series with a resistor",
                [("mc.parallel", "A current source in parallel only", "Thevenin is a Thevenin voltage plus series R.")],
            ),
        ),
    ]
    specs.extend(elec)

    for rel, doc in specs:
        write(OUT / rel, doc)

    count = len(list(OUT.rglob("*.yaml")))
    print(f"Wrote {count} templates under {OUT.relative_to(ROOT)} (target 30 lean production templates)")


if __name__ == "__main__":
    main()
