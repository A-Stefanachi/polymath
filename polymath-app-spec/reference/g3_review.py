#!/usr/bin/env python3
"""G3 human review of one template (doc 07 section 7, G3). There is no batch mode, on purpose.

usage: py -3 reference/g3_review.py tpl.math.order-pemdas [--check-only]

Renders 5 items, asks for your own hand-solved answer before showing the key, and compares the two.
Only a run with 0 disagreements writes provenance.review and the content/REVIEW-LOG.md row.
--check-only does the hand-solve for Phase -1 practice and writes nothing.
"""
from __future__ import annotations

import math
import re
import sys
from datetime import date
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "reference" / "verifiers"))
import tplkit  # noqa: E402

TEMPLATE_ROOT = ROOT / "content" / "templates"
LOG = ROOT / "content" / "REVIEW-LOG.md"
CHECKLIST = "g3_checklist_v1"


class NoDateLoader(yaml.SafeLoader):
    pass


NoDateLoader.yaml_implicit_resolvers = {
    k: [(t, r) for t, r in v if t != "tag:yaml.org,2002:timestamp"]
    for k, v in yaml.SafeLoader.yaml_implicit_resolvers.items()
}


def key_for(tpl: dict, item: dict) -> tuple[str, float | None]:
    ctx, opts = item["_ctx"], item["rendered"].get("options", [])
    if tpl["grader_type"] == "multiple_choice":
        return "abcd"[[item["_option_ids"][o["id"]] for o in opts].index(tplkit.correct_option_id(tpl, ctx))], None
    value = float(ctx[tpl["answer"]["value"]])
    return str(value), value


def agrees(typed: str, key: str, value: float | None) -> bool:
    if value is None:
        return typed.strip().lower() == key
    try:
        number = float(re.match(r"\s*[-+]?[\d.]+(?:e[-+]?\d+)?", typed, re.I).group())
    except (AttributeError, ValueError):
        return False
    return math.isclose(number, value, rel_tol=0.02, abs_tol=1e-6)


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    check_only = "--check-only" in sys.argv
    paths = [p for p in TEMPLATE_ROOT.rglob("*.yaml") if p.stem == args[0]]
    if not paths:
        sys.exit(f"no template {args[0]} under content/templates/")
    path = paths[0]
    doc = yaml.load(path.read_text(encoding="utf-8"), Loader=NoDateLoader)
    tpl = tplkit.load_template(path)
    base = int(doc["fuzz"]["seed_base"])
    seeds = [base + i for i in range(5)]
    disagreements = 0
    for seed in seeds:
        item = tplkit.generate_item(tpl, seed)
        print(f'\nSeed {seed}\n{item["rendered"]["stem_md"].strip()}')
        for i, o in enumerate(item["rendered"].get("options", [])):
            print(f'  {"abcd"[i]}) {o["text_md"]}')
        typed = input("Your hand-solved answer: ")
        key, value = key_for(tpl, item)
        if agrees(typed, key, value):
            print("Agrees with the key.")
        else:
            disagreements += 1
            print(f"DISAGREES. Key: {key}")
    print(f"\n{disagreements} disagreement(s) in {len(seeds)} items.")
    if check_only:
        return
    if disagreements:
        sys.exit("Nothing written. Find out which side is wrong, fix it, and run this again.")
    if input("Checklist g3_checklist_v1 passed for every item (doc 07 section 7, G3)? Type yes: ").strip() != "yes":
        sys.exit("Nothing written.")
    sha = tplkit.template_sha256(tpl)
    today = date.today().isoformat()
    doc.setdefault("provenance", {})["review"] = {
        "reviewer": "founder", "date": today, "template_sha256": sha, "checklist_version": CHECKLIST,
        "notes": f"Hand-solved seeds {seeds[0]} to {seeds[-1]}; 0 disagreements; logged in content/REVIEW-LOG.md.",
    }
    path.write_text(yaml.dump(doc, sort_keys=False, allow_unicode=True, width=120), encoding="utf-8")
    row = f'| {doc["key"]} | {doc["version"]} | {seeds[0]}–{seeds[-1]} | done {today} | 0 |'
    log = LOG.read_text(encoding="utf-8")
    pattern = rf'^\| {re.escape(doc["key"])} \|.*$'
    log = re.sub(pattern, row, log, flags=re.M) if re.search(pattern, log, re.M) else log.rstrip() + "\n" + row + "\n"
    LOG.write_text(log, encoding="utf-8")
    print(f'Reviewed {doc["key"]}: review block and log row written.')


if __name__ == "__main__":
    main()
