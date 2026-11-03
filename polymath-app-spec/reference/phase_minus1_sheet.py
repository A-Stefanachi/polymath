#!/usr/bin/env python3
"""Phase -1 problem sheets (00d section 4.2). Writes problems to stdout and the answer key to stderr.

usage: py -3 reference/phase_minus1_sheet.py <seed-day> <problems-per-skill> [week ...] > sheet.md 2> key.txt
Weeks select the skill cohorts of 00d section 4.2; with no week given, every cohort is used (the baseline).
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "reference" / "verifiers"))
import tplkit  # noqa: E402

COHORTS = {
    1: ["tpl.math.order-pemdas", "tpl.math.units-kilo", "tpl.math.solve-linear-v1"],
    2: ["tpl.math.rearrange-ohm", "tpl.elec.charge-current", "tpl.elec.ohms-law-v"],
    3: ["tpl.elec.power-diss", "tpl.elec.series-parallel-req-mc", "tpl.elec.voltage-divider-vout"],
}


def main() -> None:
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    day, per_skill = int(sys.argv[1]), int(sys.argv[2])
    weeks = [int(w) for w in sys.argv[3:]] or sorted(COHORTS)
    base = ROOT / "content" / "templates"
    templates = {**tplkit.load_all(base / "math"), **tplkit.load_all(base / "elec")}
    number = 0
    for week in weeks:
        for key in COHORTS[week]:
            tpl = templates[key]
            for k in range(per_skill):
                number += 1
                item = tplkit.generate_item(tpl, day * 100 + k)
                ctx, opts = item["_ctx"], item["rendered"].get("options", [])
                if tpl["grader_type"] == "multiple_choice":
                    answer = "abcd"[[item["_option_ids"][o["id"]] for o in opts].index(tplkit.correct_option_id(tpl, ctx))]
                else:
                    unit = tpl["answer"].get("unit", "").replace("dimensionless", "")
                    answer = f'{ctx[tpl["answer"]["value"]]} {unit}'.strip()
                print(f'{number}. [{tpl["skill_key"]}] {item["rendered"]["stem_md"].strip()}\n')
                for i, o in enumerate(opts):
                    print(f'   {"abcd"[i]}) {o["text_md"]}')
                print(f'   {item["rendered"]["answer_prompt"]}\n')
                print(f"{number}: {answer}", file=sys.stderr)


if __name__ == "__main__":
    main()
