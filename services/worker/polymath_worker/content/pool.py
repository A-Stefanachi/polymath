"""Per-user stock top-up for `pregenerate_items` (BL-0043; doc 03 section 8.3, doc 06 section 3.8, ADR-019).

For each requested skill the stock is the number of unserved, verified, practice-pool items owned by the
user. When it is below `want`, items are generated with fresh seeds and stored through `item_writer`, which
verifies each one first, so only verified items ever count as stock (CLAUDE.md rule 3).

A seed is never reused for a (user, template): the used set is every seed of an item row the user owns for
that template (any status, so a rejected seed is not retried either) plus every seed the user was served from
the shared pool (`session_tasks`, `attempts`). Seeds are the smallest unused positive integers, so a retried job picks the
same seeds and the idempotent writer makes it a no-op. The worker only reads `session_tasks` and `attempts`;
it never writes learner state (rule 8).
"""

from __future__ import annotations

from typing import Any

import structlog

from polymath_worker.content import item_writer

log = structlog.get_logger("polymath_worker.content.pool")

# Rejected or unbuildable seeds cost attempts; stop after this many per missing item (small parameter spaces, R-05).
ATTEMPTS_PER_ITEM = 3

_STOCK_SQL = (
    "select t.key, t.version, count(i.id) from public.item_templates t"
    " left join public.items i on i.template_key = t.key and i.template_version = t.version"
    "  and i.user_id = %s::uuid and i.status = 'verified' and i.retired_at is null"
    "  and not exists (select 1 from public.session_tasks st where st.item_id = i.id)"
    "  and not exists (select 1 from public.attempts a where a.item_id = i.id)"
    " where t.skill_key = %s and t.status = 'verified' and t.pool = 'practice'"
    "  and t.version = (select max(v.version) from public.item_templates v where v.key = t.key"
    "                   and v.status = 'verified')"
    " group by t.key, t.version order by t.key"
)
_USED_SEEDS_SQL = (
    "select seed from public.items where template_key = %s and user_id = %s::uuid"
    " union select i.seed from public.session_tasks st join public.items i on i.id = st.item_id"
    "  where st.user_id = %s::uuid and i.template_key = %s"
    " union select i.seed from public.attempts a join public.items i on i.id = a.item_id"
    "  where a.user_id = %s::uuid and i.template_key = %s"
)


def template_stock(conn: Any, user_id: str, skill_key: str) -> list[tuple[str, int, int]]:
    """(template key, version, unserved verified items owned by the user) for the skill's usable templates."""
    return [(r[0], r[1], r[2]) for r in item_writer._rows(conn, _STOCK_SQL, (user_id, skill_key))]


def used_seeds(conn: Any, user_id: str, template_key: str) -> set[int]:
    rows = item_writer._rows(
        conn, _USED_SEEDS_SQL, (template_key, user_id, user_id, template_key, user_id, template_key)
    )
    return {r[0] for r in rows}


def fresh_seeds(used: set[int], n: int) -> list[int]:
    """The n smallest positive integers not in `used`."""
    out: list[int] = []
    candidate = 1
    while len(out) < n:
        if candidate not in used:
            out.append(candidate)
        candidate += 1
    return out


def top_up_skill(conn: Any, user_id: str, skill_key: str, want: int) -> dict[str, int]:
    """Generate verified items until the user's stock for the skill reaches `want`; returns counts."""
    stock = template_stock(conn, user_id, skill_key)
    before = sum(s[2] for s in stock)
    if not stock:
        log.warning("pregenerate_no_verified_template", skill_key=skill_key)
        return {"stock_before": 0, "generated": 0, "stock_after": 0}
    counts = {key: n for key, _, n in stock}
    versions = {key: v for key, v, _ in stock}
    missing = want - before
    generated = 0
    tried: dict[str, set[int]] = {}
    budget = max(missing, 0) * ATTEMPTS_PER_ITEM
    while generated < missing and budget > 0:
        key = min(counts, key=lambda k: (counts[k], k))  # spread over templates, least stocked first
        seeds = fresh_seeds(used_seeds(conn, user_id, key) | tried.setdefault(key, set()), 1)
        tried[key].update(seeds)  # a seed that produced no row (no valid draw) is not retried either
        budget -= 1
        written = item_writer.write_items(conn, key, versions[key], seeds, user_id)
        if any(w.status == "verified" for w in written):
            counts[key] += 1
            generated += 1
    if generated < missing:
        log.warning("pregenerate_short", skill_key=skill_key, wanted=want, stock=before + generated)
    return {"stock_before": before, "generated": generated, "stock_after": before + generated}
