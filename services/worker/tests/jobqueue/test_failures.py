"""BL-0016 acceptance: forced failures, backoff, timeout, ids-only payloads (in-process worker, real database)."""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import Any

from queue_support import TEST_KIND, Db, statuses

from polymath_worker.job_queue import HandlerRegistry, JobRow, Retryable, Worker


def _worker(database_url: str, handler: Callable[[JobRow], Any]) -> Worker:
    registry = HandlerRegistry()
    registry.register(TEST_KIND, handler)
    return Worker(database_url, registry)


def _row(db: Db, job_id: str) -> dict[str, Any]:
    rows = db.execute(
        "select status::text, attempts, error, payload, run_after > now() from public.jobs where id = %s::uuid",
        (job_id,),
    )
    status, attempts, error, payload, delayed = rows[0]
    return {"status": status, "attempts": attempts, "error": error, "payload": payload, "delayed": delayed}


def test_three_forced_failures_end_failed_with_error_text_and_ids_only_payload(
    database_url: str, db: Db, enqueue: Callable[..., list[str]], run_id: str
) -> None:
    (job_id,) = enqueue(1, max_attempts=3)
    before = _row(db, job_id)["payload"]
    calls = 0

    async def always_fails(job: JobRow) -> None:
        nonlocal calls
        calls += 1
        raise Retryable(f"forced failure {calls}")

    async def drive() -> None:
        worker = _worker(database_url, always_fails)
        try:
            for attempt in (1, 2, 3):
                assert await worker.poll_once() == 1
                await worker.wait_idle()
                row = _row(db, job_id)
                assert row["attempts"] == attempt
                if attempt < 3:
                    # Retryable below max_attempts: back to queued with a backoff delay (5 s * 2^attempts).
                    assert (row["status"], row["delayed"]) == ("queued", True)
                    db.execute("update public.jobs set run_after = now() where id = %s", (job_id,))
        finally:
            await worker._close()

    asyncio.run(drive())
    row = _row(db, job_id)
    assert row["status"] == "failed"
    assert row["error"] == "forced failure 3"
    assert row["payload"] == before == {"t": run_id, "seq": 0}


def test_non_retryable_error_fails_at_once_with_error_text(
    database_url: str, db: Db, enqueue: Callable[..., list[str]]
) -> None:
    (job_id,) = enqueue(1, max_attempts=3)

    async def boom(job: JobRow) -> None:
        raise ValueError("bad input shape")

    async def drive() -> None:
        worker = _worker(database_url, boom)
        try:
            assert await worker.poll_once() == 1
            await worker.wait_idle()
        finally:
            await worker._close()

    asyncio.run(drive())
    row = _row(db, job_id)
    assert (row["status"], row["attempts"], row["error"]) == ("failed", 1, "ValueError: bad input shape")


def test_handler_exceeding_timeout_is_cancelled_and_requeued(
    database_url: str, db: Db, enqueue: Callable[..., list[str]]
) -> None:
    (job_id,) = enqueue(1, timeout_s=5)

    async def never(job: JobRow) -> None:
        await asyncio.Event().wait()

    async def drive() -> None:
        worker = _worker(database_url, never)
        try:
            assert await worker.poll_once() == 1
            await worker.wait_idle()
        finally:
            await worker._close()

    asyncio.run(drive())
    row = _row(db, job_id)
    assert (row["status"], row["attempts"], row["error"]) == ("queued", 1, "handler timed out after 5s")


def test_per_kind_limit_bounds_concurrent_claims(
    database_url: str, db: Db, enqueue: Callable[..., list[str]]
) -> None:
    ids = enqueue(3)
    gate = asyncio.Event

    async def drive() -> int:
        release = gate()

        async def wait_for_release(job: JobRow) -> None:
            await release.wait()

        registry = HandlerRegistry()
        registry.register(TEST_KIND, wait_for_release, limit=2)
        worker = Worker(database_url, registry)
        try:
            first = await worker.poll_once()
            second = await worker.poll_once()  # both slots busy: claims nothing
            release.set()
            await worker.wait_idle()
            return first + second
        finally:
            await worker._close()

    assert asyncio.run(drive()) == 2
    states = [s for s, _ in statuses(db, ids).values()]
    assert sorted(states) == ["queued", "succeeded", "succeeded"]
