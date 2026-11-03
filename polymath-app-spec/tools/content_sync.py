#!/usr/bin/env python3
"""Reference content:sync dry-run (BL-0018 subset). Validates G0, hashes templates, reports upserts.

Exit codes (doc 07 §10 subset):
  0 success, no validation errors
  1 validation failure (all-or-nothing for templates)
  2 usage error

Production app replaces this with Postgres upserts + verify_template jobs.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "reference" / "verifiers"))
import tplkit  # noqa: E402

CONTENT = ROOT / "content"
TEMPLATES = CONTENT / "templates"


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_validate_templates() -> int:
    p = subprocess.run([sys.executable, str(ROOT / "reference" / "validate_templates.py")], cwd=ROOT)
    return p.returncode


def main() -> int:
    ap = argparse.ArgumentParser(description="content:sync reference dry-run")
    ap.add_argument("--dry-run", action="store_true", default=True, help="default; no DB writes")
    args = ap.parse_args()

    if not TEMPLATES.is_dir():
        print("content/templates/ missing; the lean pool is authored by hand", file=sys.stderr)
        return 2

    if run_validate_templates() != 0:
        print("G0 template validation failed", file=sys.stderr)
        return 1

    graph = subprocess.run([sys.executable, str(ROOT / "reference" / "validate_graph.py")], cwd=ROOT)
    if graph.returncode != 0:
        return 1

    review_log = (ROOT / "content" / "REVIEW-LOG.md").read_text(encoding="utf-8")
    rows = []
    for path in sorted(TEMPLATES.rglob("*.yaml")):
        import yaml

        doc = yaml.safe_load(path.read_text(encoding="utf-8"))
        if doc.get("license") is None or doc.get("source") is None:
            print(f"FAIL missing license/source: {path}", file=sys.stderr)
            return 1
        review = (doc.get("provenance") or {}).get("review") or {}
        status = "needs_human_review"
        row = re.search(rf"^\| {re.escape(doc['key'])} \|[^|]*\|[^|]*\| done [^|]*\| 0 \|", review_log, re.M)
        if review.get("template_sha256") == tplkit.template_sha256(tplkit.load_template(path)) and row:
            status = "reviewed_awaiting_g2"  # doc 07 section 8: only the real sync sets verified, after the G2 job passes
        rows.append(
            {
                "key": doc["key"],
                "version": doc["version"],
                "skill_key": doc["skill_key"],
                "sha256": sha256_file(path),
                "item_templates_status": status,
                "path": str(path.relative_to(ROOT)).replace("\\", "/"),
            }
        )

    summary = {
        "dry_run": args.dry_run,
        "templates": len(rows),
        "created": len(rows),
        "updated": 0,
        "unchanged": 0,
        "verify_jobs_enqueued": sum(1 for r in rows if r["item_templates_status"] == "reviewed_awaiting_g2"),
    }
    print(json.dumps(summary, indent=2))
    for r in rows[:5]:
        print(f"  would upsert {r['key']} v{r['version']} -> {r['item_templates_status']}")
    if len(rows) > 5:
        print(f"  ... and {len(rows) - 5} more")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
