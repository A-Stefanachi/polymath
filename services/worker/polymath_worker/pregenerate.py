"""Job handler for `pregenerate_items` (BL-0017; doc 03 section 8.3, doc 07 section 6).

Payload (ids and numbers only, no content): {"template_key": str, "template_version": int,
"seed_start": int, "count": int}. The seeds are seed_start .. seed_start + count - 1: a deterministic rule,
so a retried or duplicated job produces the same items and the idempotent writer makes it a no-op. A list of
seeds would work too but grows the payload; a range keeps it small and the dedupe key can be built from it.
BL-0043 adds a second payload shape, {"user_id", "skill_keys", "want"} (doc 03 section 8.3), which tops up a
user's per-skill stock of verified items with fresh seeds (`content/pool.py`).
Template verification at sync time is `content_postprocess` (BL-0018), not this handler.
"""

from __future__ import annotations

import asyncio
import re
import uuid
from collections.abc import Callable
from typing import Any

import structlog

from polymath_worker.content import item_writer, pool
from polymath_worker.job_queue import DB_ERRORS, Handler, JobRow, Retryable, connect_database

log = structlog.get_logger("polymath_worker.pregenerate")

MAX_COUNT = 200  # one job stays well inside its timeout (analytic items verify in tens of ms)
MAX_SEED = 2**53  # seeds are bigint in the database; keep them JSON-safe


class InvalidPayload(ValueError):
    pass


def parse_payload(payload: dict[str, Any]) -> tuple[str, int, list[int]]:
    key, version = payload.get("template_key"), payload.get("template_version")
    start, count = payload.get("seed_start"), payload.get("count")
    if not isinstance(key, str) or not key:
        raise InvalidPayload("template_key must be a non-empty string")
    for name, value in (("template_version", version), ("seed_start", start), ("count", count)):
        if not isinstance(value, int) or isinstance(value, bool):
            raise InvalidPayload(f"{name} must be an integer")
    assert isinstance(version, int) and isinstance(start, int) and isinstance(count, int)  # narrowed above
    if version < 1:
        raise InvalidPayload("template_version must be at least 1")
    if not 0 <= start <= MAX_SEED:
        raise InvalidPayload("seed_start out of range")
    if not 1 <= count <= MAX_COUNT:
        raise InvalidPayload(f"count must be between 1 and {MAX_COUNT}")
    return key, version, list(range(start, start + count))


MAX_WANT = 50  # stock target per skill in one job
MAX_SKILLS = 20
_SKILL_KEY = re.compile(r"^[a-z]+\.[a-z0-9-]+\.[a-z0-9-]+$")


def parse_pool_payload(payload: dict[str, Any]) -> tuple[str, list[str], int]:
    """BL-0043 payload {user_id, skill_keys, want} (doc 03 section 8.3): ids and numbers only."""
    user_id, skills, want = payload.get("user_id"), payload.get("skill_keys"), payload.get("want")
    try:
        user_id = str(uuid.UUID(user_id)) if isinstance(user_id, str) else None
    except ValueError:
        user_id = None
    if user_id is None:
        raise InvalidPayload("user_id must be a uuid")
    if not isinstance(skills, list) or not 1 <= len(skills) <= MAX_SKILLS:
        raise InvalidPayload(f"skill_keys must be a list of 1 to {MAX_SKILLS} keys")
    if not all(isinstance(s, str) and _SKILL_KEY.match(s) for s in skills):
        raise InvalidPayload("skill_keys must match the skill key pattern")
    if not isinstance(want, int) or isinstance(want, bool) or not 1 <= want <= MAX_WANT:
        raise InvalidPayload(f"want must be an integer between 1 and {MAX_WANT}")
    return user_id, list(dict.fromkeys(skills)), want


def make_handler(connect: Callable[[], Any]) -> Handler:
    """Handler factory; `connect` opens a database connection (one per job, closed afterwards)."""

    def run_pool(job: JobRow) -> dict[str, Any]:
        user_id, skills, want = parse_pool_payload(job.payload)
        conn = connect()
        try:
            result = {s: pool.top_up_skill(conn, user_id, s, want) for s in skills}
        except DB_ERRORS as e:
            raise Retryable(f"database error: {type(e).__name__}") from e
        finally:
            conn.close()
        log.info("pregenerate_items_pool_done", skills=len(skills), want=want)
        return {"skills": result}

    def run_sync(job: JobRow) -> dict[str, Any]:
        if "skill_keys" in job.payload:
            return run_pool(job)
        key, version, seeds = parse_payload(job.payload)
        conn = connect()
        try:
            written = item_writer.write_items(conn, key, version, seeds)
        except DB_ERRORS as e:
            raise Retryable(f"database error: {type(e).__name__}") from e
        finally:
            conn.close()
        counts: dict[str, int] = {}
        for w in written:
            counts[w.status] = counts.get(w.status, 0) + 1
        log.info(
            "pregenerate_items_done",
            template_key=key,
            template_version=version,
            requested=len(seeds),
            **counts,
        )
        return {"requested": len(seeds), "written": len(written), "by_status": counts}

    async def handler(job: JobRow) -> dict[str, Any]:
        return await asyncio.to_thread(run_sync, job)

    return handler


def handler_for_url(database_url: str) -> Handler:
    return make_handler(lambda: connect_database(database_url))
