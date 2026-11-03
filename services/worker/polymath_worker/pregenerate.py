"""Job handler for `pregenerate_items` (BL-0017; doc 03 section 8.3, doc 07 section 6).

Payload (ids and numbers only, no content): {"template_key": str, "template_version": int,
"seed_start": int, "count": int}. The seeds are seed_start .. seed_start + count - 1: a deterministic rule,
so a retried or duplicated job produces the same items and the idempotent writer makes it a no-op. A list of
seeds would work too but grows the payload; a range keeps it small and the dedupe key can be built from it.
Template verification at sync time is `content_postprocess` (BL-0018), not this handler.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import Any

import structlog

from polymath_worker.content import item_writer
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


def make_handler(connect: Callable[[], Any]) -> Handler:
    """Handler factory; `connect` opens a database connection (one per job, closed afterwards)."""

    def run_sync(job: JobRow) -> dict[str, Any]:
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
