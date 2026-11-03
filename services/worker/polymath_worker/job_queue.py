"""Postgres job queue worker loop (doc 03 sections 8.2 to 8.5, normative pseudocode in 8.4).

The database functions `claim_jobs`, `complete_job`, `fail_job` and `requeue_stale_jobs` own every state
transition (SKIP LOCKED, attempts, backoff, lease expiry). This module only drives them:

* poll tick: 200 ms while the last claim returned work, backing off to 5 s when idle;
* one asyncio task per claimed job, bounded per kind by the concurrency table of section 8.3;
* a handler is cancelled by the worker after `timeout_s`, well before the lease (`2 * timeout_s + 30 s`);
* a lease heartbeat refreshes `locked_at` while a handler runs;
* `requeue_stale_jobs` every 30 s and a liveness heartbeat every 5 min;
* on stop (SIGTERM) no new job is claimed and running handlers get a drain period.

Jobs carry ids, never content (CLAUDE.md rule 2.5): this module logs ids, kinds and counts only, never the
payload or the exception text. Handlers are at-least-once and must be idempotent (section 8.5). The worker
never writes `skill_state`, `review_log` or `sessions` (rule 2.8); this module touches `jobs` only.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import os
import socket
import threading
import time
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any
from urllib.parse import parse_qs, unquote, urlsplit

import pg8000.dbapi
import structlog

# Errors that mean "the database call failed": driver errors and socket errors.
DB_ERRORS: tuple[type[BaseException], ...] = (pg8000.dbapi.Error, OSError)


def connect_database(url_text: str) -> pg8000.dbapi.Connection:
    """Open an autocommit pg8000 connection from a postgresql:// URL (`sslmode=require` turns TLS on)."""
    url = urlsplit(url_text)
    sslmode = parse_qs(url.query).get("sslmode", ["prefer"])[0]
    conn = pg8000.dbapi.connect(
        user=unquote(url.username or ""),
        password=unquote(url.password) if url.password else None,
        host=url.hostname or "127.0.0.1",
        port=url.port or 5432,
        database=(url.path or "/postgres").lstrip("/") or "postgres",
        ssl_context=True if sslmode in ("require", "verify-ca", "verify-full") else None,
        timeout=30,
    )
    conn.autocommit = True
    return conn


log = structlog.get_logger("polymath_worker.job_queue")

# Concurrency per kind and per worker (doc 03 section 8.3). A kind absent here runs one at a time.
KIND_LIMITS: dict[str, int] = {
    "grade_attempt": 4,
    "verify_evidence": 2,
    "pregenerate_items": 2,
    "content_postprocess": 1,
    "send_push": 4,
    "export_user_data": 1,
    "delete_user_data": 1,
    "sweep_storage": 1,
    "prune_expired": 1,
    "nightly_maintenance": 1,
}

MAX_ERROR_CHARS = 1000


class Retryable(Exception):
    """Raised by a handler for a transient failure: the job is requeued with backoff."""


@dataclass(frozen=True)
class JobRow:
    """A claimed job. `payload` holds ids only (doc 03 section 8.3)."""

    id: uuid.UUID
    kind: str
    payload: dict[str, Any]
    attempts: int
    max_attempts: int
    timeout_s: int

    @property
    def trace_id(self) -> str | None:
        value = self.payload.get("trace_id")
        return value if isinstance(value, str) else None


Handler = Callable[[JobRow], Awaitable[dict[str, Any] | None]]


class HandlerRegistry:
    """Handlers by job kind. Only registered kinds are ever claimed."""

    def __init__(self) -> None:
        self._handlers: dict[str, Handler] = {}
        self._limits: dict[str, int] = {}

    def register(self, kind: str, handler: Handler, limit: int | None = None) -> None:
        if kind in self._handlers:
            raise ValueError(f"handler already registered for kind {kind}")
        effective = limit if limit is not None else KIND_LIMITS.get(kind, 1)
        if effective < 1:
            raise ValueError("limit must be at least 1")
        self._handlers[kind] = handler
        self._limits[kind] = effective

    def handler(self, kind: str) -> Handler | None:
        return self._handlers.get(kind)

    def limit(self, kind: str) -> int:
        return self._limits[kind]

    @property
    def kinds(self) -> list[str]:
        return sorted(self._handlers)


def new_worker_id() -> str:
    return f"{socket.gethostname()}:{os.getpid()}:{uuid.uuid4().hex[:8]}"


def lease_seconds(timeout_s: int) -> int:
    """Lease length used by `requeue_stale_jobs` (doc 03 section 8.5)."""
    return 2 * timeout_s + 30


class Worker:
    def __init__(
        self,
        conninfo: str,
        registry: HandlerRegistry,
        *,
        worker_id: str | None = None,
        poll_busy_s: float = 0.2,
        poll_idle_max_s: float = 5.0,
        requeue_every_s: float = 30.0,
        heartbeat_every_s: float = 300.0,
        drain_timeout_s: float = 25.0,
    ) -> None:
        self._conninfo = conninfo
        self._registry = registry
        self.worker_id = worker_id or new_worker_id()
        self._poll_busy_s = poll_busy_s
        self._poll_idle_max_s = poll_idle_max_s
        self._requeue_every_s = requeue_every_s
        self._heartbeat_every_s = heartbeat_every_s
        self._drain_timeout_s = drain_timeout_s
        self._conn: pg8000.dbapi.Connection | None = None
        self._conn_lock = threading.Lock()
        self._running: dict[str, int] = {}
        self._tasks: set[asyncio.Task[None]] = set()
        self._stopping = asyncio.Event()
        self.last_heartbeat_at: float | None = None

    # -- connection -----------------------------------------------------------------------------
    # pg8000 is a synchronous driver: every statement runs in a thread (asyncio.to_thread) on one shared
    # autocommit connection, serialised by a lock. Statements are short, so one connection is enough.

    def _execute(self, sql: str, params: tuple[Any, ...]) -> list[tuple[Any, ...]]:
        with self._conn_lock:
            try:
                if self._conn is None:
                    self._conn = connect_database(self._conninfo)
                cur = self._conn.cursor()
                try:
                    cur.execute(sql, params)
                    return [tuple(r) for r in cur.fetchall()] if cur.description else []
                finally:
                    cur.close()
            except DB_ERRORS:
                # Drop the connection so the next call reconnects; the caller sees the error.
                self._drop_connection()
                raise

    def _drop_connection(self) -> None:
        conn, self._conn = self._conn, None
        if conn is not None:
            with contextlib.suppress(*DB_ERRORS):
                conn.close()

    async def _query(self, sql: str, *params: Any) -> list[tuple[Any, ...]]:
        return await asyncio.to_thread(self._execute, sql, params)

    async def _close(self) -> None:
        with self._conn_lock:
            self._drop_connection()

    # -- database calls (the only SQL of this module) --------------------------------------------

    async def claim(self, kinds: list[str], limit: int) -> list[JobRow]:
        rows = await self._query(
            "select id, kind, payload, attempts, max_attempts, timeout_s "
            "from public.claim_jobs(%s, %s::text[], %s)",
            self.worker_id,
            kinds,
            limit,
        )
        return [JobRow(*row) for row in rows]

    async def _complete(self, job: JobRow, result: dict[str, Any] | None) -> bool:
        rows = await self._query(
            "select public.complete_job(%s::uuid, %s, %s::jsonb)",
            job.id,
            self.worker_id,
            json.dumps(result or {}),
        )
        return bool(rows and rows[0][0])

    async def _fail(self, job: JobRow, error: str, retryable: bool) -> str | None:
        rows = await self._query(
            "select public.fail_job(%s::uuid, %s, %s, %s)::text",
            job.id,
            self.worker_id,
            error[:MAX_ERROR_CHARS],
            retryable,
        )
        return rows[0][0] if rows else None

    async def requeue_stale(self) -> int:
        rows = await self._query("select public.requeue_stale_jobs()")
        return int(rows[0][0]) if rows else 0

    async def _refresh_lease(self, job: JobRow) -> None:
        await self._query(
            "update public.jobs set locked_at = now(), updated_at = now() "
            "where id = %s::uuid and status = 'running' and locked_by = %s",
            job.id,
            self.worker_id,
        )

    # -- one job ----------------------------------------------------------------------------------

    async def _lease_heartbeat(self, job: JobRow) -> None:
        interval = lease_seconds(job.timeout_s) / 3
        while True:
            await asyncio.sleep(interval)
            try:
                await self._refresh_lease(job)
            except DB_ERRORS:
                # A missed refresh is harmless: the lease is far longer than the interval.
                log.warning("lease_refresh_failed", job_id=str(job.id), kind=job.kind)

    async def _run_job(self, job: JobRow) -> None:
        handler = self._registry.handler(job.kind)
        ctx = {"job_id": str(job.id), "kind": job.kind, "attempt": job.attempts, "trace_id": job.trace_id}
        beat = asyncio.create_task(self._lease_heartbeat(job))
        try:
            try:
                if handler is None:  # claim only asks for registered kinds; defensive
                    raise LookupError(f"no handler for kind {job.kind}")
                result = await asyncio.wait_for(handler(job), job.timeout_s)
            except asyncio.CancelledError:
                # Drain period over: hand the job back instead of waiting for the lease.
                await asyncio.shield(self._fail(job, "worker shutdown before completion", True))
                log.warning("job_interrupted", **ctx)
                raise
            except TimeoutError:
                await self._fail(job, f"handler timed out after {job.timeout_s}s", True)
                log.warning("job_timeout", **ctx)
            except Retryable as e:
                status = await self._fail(job, str(e), True)
                log.warning("job_retryable_error", error_type=type(e).__name__, status=status, **ctx)
            except Exception as e:  # noqa: BLE001 - any handler error fails the job (doc 03 section 8.4)
                status = await self._fail(job, f"{type(e).__name__}: {e}", False)
                log.error("job_failed", error_type=type(e).__name__, status=status, **ctx)
            else:
                if await self._complete(job, result):
                    log.info("job_succeeded", **ctx)
                else:
                    # The lease was lost (requeued or taken over); the other attempt owns the outcome.
                    log.warning("job_complete_ignored", **ctx)
        finally:
            beat.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await beat

    def _spawn(self, job: JobRow) -> None:
        self._running[job.kind] = self._running.get(job.kind, 0) + 1

        async def runner() -> None:
            try:
                await self._run_job(job)
            except asyncio.CancelledError:
                raise
            except DB_ERRORS as e:
                # The outcome could not be recorded; the lease expiry requeues the job (at-least-once).
                log.error(
                    "job_outcome_unrecorded", job_id=str(job.id), kind=job.kind, error_type=type(e).__name__
                )
            finally:
                self._running[job.kind] -= 1

        task = asyncio.create_task(runner())
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    # -- loop -------------------------------------------------------------------------------------

    async def poll_once(self) -> int:
        """Claim up to the free slots of each kind and spawn their tasks; returns the number claimed.

        `claim_jobs` bounds the total across the kinds it is given, so each kind is claimed on its own to
        keep the per-kind concurrency limit of section 8.3 exact.
        """
        claimed = 0
        for kind in self._registry.kinds:
            slots = self._registry.limit(kind) - self._running.get(kind, 0)
            if slots <= 0:
                continue
            jobs = await self.claim([kind], slots)
            for job in jobs:
                self._spawn(job)
            claimed += len(jobs)
        return claimed

    async def wait_idle(self) -> None:
        """Wait until every spawned job task has finished (used by tests and by the drain)."""
        while self._tasks:
            await asyncio.wait(set(self._tasks))

    async def _poll_loop(self) -> None:
        delay = self._poll_busy_s
        while not self._stopping.is_set():
            try:
                claimed = await self.poll_once()
                delay = (
                    self._poll_busy_s
                    if claimed
                    else min(max(delay * 2, self._poll_busy_s), self._poll_idle_max_s)
                )
            except DB_ERRORS as e:
                log.error("poll_failed", error_type=type(e).__name__)
                delay = self._poll_idle_max_s
            with contextlib.suppress(TimeoutError):
                await asyncio.wait_for(self._stopping.wait(), delay)

    async def _every(self, seconds: float, action: Callable[[], Awaitable[None]]) -> None:
        while not self._stopping.is_set():
            with contextlib.suppress(TimeoutError):
                await asyncio.wait_for(self._stopping.wait(), seconds)
            if self._stopping.is_set():
                return
            try:
                await action()
            except DB_ERRORS as e:
                log.error(
                    "ticker_failed", action=getattr(action, "__name__", "?"), error_type=type(e).__name__
                )

    async def _requeue_tick(self) -> None:
        n = await self.requeue_stale()
        if n:
            log.warning("stale_jobs_requeued", count=n)

    async def _heartbeat_tick(self) -> None:
        # The specification names no heartbeat table (doc 03 sections 8.4 and 8.6 say "row/metric"), so the
        # heartbeat is a structured log line plus an in-process timestamp until a migration adds the row.
        self.last_heartbeat_at = time.time()
        log.info("worker_heartbeat", worker_id=self.worker_id, running=dict(self._running))

    def request_stop(self) -> None:
        """SIGTERM handler: stop claiming; `run` then drains."""
        self._stopping.set()

    async def run(self) -> None:
        log.info("worker_started", worker_id=self.worker_id, kinds=self._registry.kinds)
        await self._heartbeat_tick()
        loops = [
            asyncio.create_task(self._poll_loop()),
            asyncio.create_task(self._every(self._requeue_every_s, self._requeue_tick)),
            asyncio.create_task(self._every(self._heartbeat_every_s, self._heartbeat_tick)),
        ]
        try:
            await self._stopping.wait()
        finally:
            await asyncio.gather(*loops, return_exceptions=True)
            await self._drain()
            await self._close()
            log.info("worker_stopped", worker_id=self.worker_id)

    async def _drain(self) -> None:
        if not self._tasks:
            return
        log.info("worker_draining", running=dict(self._running), grace_s=self._drain_timeout_s)
        _, pending = await asyncio.wait(set(self._tasks), timeout=self._drain_timeout_s)
        for task in pending:
            task.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)
