"""CLI for the G2 fuzz run in CI and on a developer machine (BL-0052; doc 07 sections 7 and 10).

    python -m polymath_worker.content.fuzz_cli [--changed-since REF] [--samples N] [template.yaml ...]

Runs `fuzz.fuzz_template` (the one implementation, also used by the `content_postprocess` job) on the given
templates, or on every template under `polymath-app-spec/content/templates/`. With `--changed-since REF` only
templates changed since REF are run (the CI cap on run time); a change under `polymath_worker/content/`
(the generator or the verifiers) runs all of them. Prints one summary line per template.

Exit codes: 0 every template passed; 1 usage or load error; 2 a fuzz failure. Retired templates are skipped;
a `draft` template that fails is reported as WARN and does not fail the run (doc 07 section 10: the PR cannot
merge if a changed `ready` template fails). `--no-fuzz` is refused when `CI` is set.
"""

from __future__ import annotations

import argparse
import os
import subprocess  # nosec B404 - runs `git diff` with fixed arguments, never learner input
import sys
from pathlib import Path

from polymath_worker.content import fuzz, tplkit, verify

REPO_ROOT = Path(__file__).resolve().parents[4]
TEMPLATE_DIR = tplkit.CONTENT_DIR / "templates"
ENGINE_DIR = "services/worker/polymath_worker/content/"
EXIT_OK, EXIT_ERROR, EXIT_FUZZ_FAILED = 0, 1, 2


def changed_paths(ref: str) -> list[str] | None:
    """Repo-relative paths changed between `ref` and HEAD, or None when the ref cannot be resolved."""
    out = subprocess.run(  # nosec B603 B607 - fixed argv, ref passed after `--end-of-options`
        ["git", "diff", "--name-only", "--end-of-options", f"{ref}...HEAD"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if out.returncode != 0:
        return None
    return [line for line in out.stdout.splitlines() if line]


def select_templates(files: list[str], changed_since: str | None) -> list[Path]:
    if files:
        return [Path(f) for f in files]
    everything = sorted(TEMPLATE_DIR.rglob("*.yaml"))
    if not changed_since:
        return everything
    changed = changed_paths(changed_since)
    if changed is None:
        print(f"cannot resolve {changed_since!r}; fuzzing every template")
        return everything
    if any(p.startswith(ENGINE_DIR) for p in changed):
        print("generator or verifier code changed; fuzzing every template")
        return everything
    wanted = {(REPO_ROOT / p).resolve() for p in changed}
    return [p for p in everything if p.resolve() in wanted]


def format_summary(key: str, s: dict) -> str:
    line = (
        f"{'PASS' if s['passed'] else 'FAIL'} {key:46s} samples={s['samples']} failed_seeds={s['failed_seeds']}"
        f" rejection_rate={s['rejection_rate']} distinct={s['distinct_param_sets']} avg_ms={s['avg_ms']}"
    )
    if not s["passed"]:
        line += f" first_failing_seed={s['first_failing_seed']} failed_checks={','.join(s['failed_checks'])}"
    return line


def explain_first_failure(tpl: dict, seed: int | None) -> list[str]:
    if seed is None:
        return []
    try:
        return list(verify.verify_item(tpl, seed)["report"]["reasons"])[:3]
    except RuntimeError as e:
        return [str(e)]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="fuzz_cli", description="G2 fuzz run (200 seeded samples per template)")
    ap.add_argument("--samples", type=int, help="override fuzz.samples (local use)")
    ap.add_argument("--changed-since", metavar="REF", help="only templates changed since this git ref")
    ap.add_argument("--no-fuzz", action="store_true", help="skip the run (refused in CI)")
    ap.add_argument("files", nargs="*")
    args = ap.parse_args(argv)
    if args.no_fuzz:
        if os.environ.get("CI"):
            print("--no-fuzz is not allowed in CI (doc 07 section 10)", file=sys.stderr)
            return EXIT_ERROR
        print("fuzz skipped (--no-fuzz)")
        return EXIT_OK
    if args.samples is not None and args.samples < 1:
        print("--samples must be at least 1", file=sys.stderr)
        return EXIT_ERROR

    paths = select_templates(args.files, args.changed_since)
    if not paths:
        print("no changed templates to fuzz")
        return EXIT_OK
    failed = 0
    for path in paths:
        try:
            tpl = tplkit.load_template(path)
            key = str(tpl["key"])
        except (OSError, ValueError, KeyError, TypeError) as e:
            print(f"cannot load {path}: {type(e).__name__}: {e}", file=sys.stderr)
            return EXIT_ERROR
        status = tpl.get("authoring_status")
        if status == "retired":
            print(f"SKIP {key} (retired)")
            continue
        summary = fuzz.fuzz_template(tpl, args.samples)
        if status == "draft" and not summary["passed"]:
            print("WARN " + format_summary(key, summary)[5:] + " (draft template)")
            continue
        print(format_summary(key, summary))
        if not summary["passed"]:
            failed += 1
            for reason in explain_first_failure(tpl, summary["first_failing_seed"]):
                print(f"     seed {summary['first_failing_seed']}: {reason}")
    total = len(paths)
    print(f"{total - failed}/{total} templates passed the G2 fuzz run")
    return EXIT_FUZZ_FAILED if failed else EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
