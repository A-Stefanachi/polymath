"""Job handler for `content_postprocess` (enqueued by content:sync, BL-0018; doc 07 sections 7 and 10, FR-060).

Payload (ids only): {"sync_run_id": uuid}. The job's templates are the rows whose `body._sync.fuzz_job_id` is
this job's id (written by content:sync). Each gets the G2 fuzz run (`content/fuzz.py`). The result is
{"passed": bool, "templates": {"key@version": summary}}; `passed` is true only when every template passed, and
the next content:sync reads it to move a reviewed template to `verified` (tools/content-sync/src/db.ts). The
handler writes nothing but the job result: no template status, no items. Seeds are deterministic, so a re-run
gives the same result and at-least-once delivery is harmless.
"""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import Callable
from typing import Any

import structlog

from polymath_worker.content import fuzz, item_writer
from polymath_worker.job_queue import DB_ERRORS, Handler, JobRow, Retryable, connect_database

log = structlog.get_logger("polymath_worker.postprocess")


class InvalidPayload(ValueError):
    pass


def parse_payload(payload: dict[str, Any]) -> str:
    run_id = payload.get("sync_run_id")
    if not isinstance(run_id, str):
        raise InvalidPayload("sync_run_id must be a uuid")
    try:
        return str(uuid.UUID(run_id))
    except ValueError as e:
        raise InvalidPayload("sync_run_id must be a uuid") from e


def templates_of_job(conn: Any, job_id: str) -> list[tuple[str, int]]:
    cur = conn.cursor()
    try:
        cur.execute(
            "select key, version from public.item_templates"
            " where body->'_sync'->>'fuzz_job_id' = %s and status <> 'retired' order by key, version",
            (job_id,),
        )
        return [(str(k), int(v)) for k, v in cur.fetchall()]
    finally:
        cur.close()


def make_handler(connect: Callable[[], Any]) -> Handler:
    """Handler factory; `connect` opens a database connection (one per job, closed before the fuzz runs)."""

    def run_sync(job: JobRow) -> dict[str, Any]:
        parse_payload(job.payload)
        conn = connect()
        try:
            loaded = []
            for key, version in templates_of_job(conn, str(job.id)):
                tpl, _status = item_writer.load_template(conn, key, version)
                loaded.append((f"{key}@{version}", tpl))
        except DB_ERRORS as e:
            raise Retryable(f"database error: {type(e).__name__}") from e
        finally:
            conn.close()
        summaries = {name: fuzz.fuzz_template(tpl) for name, tpl in loaded}
        passed = all(s["passed"] for s in summaries.values())
        for name, s in summaries.items():
            if not s["passed"]:
                log.warning(
                    "template_fuzz_failed",
                    template=name,
                    failed_checks=s["failed_checks"],
                    first_failing_seed=s["first_failing_seed"],
                )
        log.info("content_postprocess_done", templates=len(summaries), passed=passed)
        return {"passed": passed, "templates": summaries}

    async def handler(job: JobRow) -> dict[str, Any]:
        return await asyncio.to_thread(run_sync, job)

    return handler


def handler_for_url(database_url: str) -> Handler:
    return make_handler(lambda: connect_database(database_url))
