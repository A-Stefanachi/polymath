"""G2 fuzz run of one template (doc 07 section 7, G2; port of `fuzz` in reference/verifiers/verify_template.py).

For `fuzz.samples` seeds from `fuzz.seed_base` it runs `verify.verify_item` (generate, every verifier, render,
self-grade of reference spellings and misconceptions) and applies the template-level criteria: 0 failing or
skipped verifiers, rejection rate at most `fuzz.max_rejection_rate`, at least `fuzz.min_distinct_param_sets`
distinct parameter sets. The summary holds counts and seeds only, never rendered text or parameters, because it
is stored as a job result (doc 03 section 8.3).
"""

from __future__ import annotations

from typing import Any

from polymath_worker.content import verify


def fuzz_template(tpl: dict, samples: int | None = None) -> dict[str, Any]:
    spec = tpl.get("fuzz") or {}
    n = samples or int(spec.get("samples", 200))
    base = int(spec.get("seed_base", 0))
    failed_seeds: list[int] = []
    rejections, ms = 0, 0
    distinct: set[tuple[tuple[str, str], ...]] = set()
    for seed in range(base, base + n):
        try:
            r = verify.verify_item(tpl, seed)
        except RuntimeError:  # the parameter sampler found no draw that satisfies the constraints
            failed_seeds.append(seed)
            continue
        report = r["report"]
        rejections += report["generator"]["rejections"]
        distinct.add(tuple(sorted((k, str(v)) for k, v in r["item"]["params"].items())))
        ms += report["duration_ms"]
        if report["decision"] != "verified":
            failed_seeds.append(seed)
    rejection_rate = rejections / (n + rejections)
    failed_checks: list[str] = []
    if failed_seeds:
        failed_checks.append("seed_failures")
    if rejection_rate > float(spec.get("max_rejection_rate", 0.5)):
        failed_checks.append("rejection_rate")
    if len(distinct) < int(spec.get("min_distinct_param_sets", 1)):
        failed_checks.append("distinct_param_sets")
    return {
        "passed": not failed_checks,
        "samples": n,
        "failed_seeds": len(failed_seeds),
        "first_failing_seed": failed_seeds[0] if failed_seeds else None,
        "rejection_rate": round(rejection_rate, 3),
        "distinct_param_sets": len(distinct),
        "avg_ms": round(ms / n, 1),
        "failed_checks": failed_checks,
    }
