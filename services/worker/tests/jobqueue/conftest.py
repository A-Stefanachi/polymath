"""Fixtures for the job queue integration tests (BL-0016).

The database comes only from POLYMATH_TEST_DB_URL (default: the local Supabase stack). DATABASE_URL_PRIVILEGED
is never read here, because in some environments it points at a real database. The stack is shared, so every
job these tests create carries a run-unique dedupe key and is deleted exactly when the test ends; the tests
use the job kind `sweep_storage` (no other test uses it) and never touch other rows.
"""

from __future__ import annotations

import json
import os
import socket
import uuid
from collections.abc import Callable, Iterator
from urllib.parse import urlsplit

import pytest
from queue_support import TEST_KIND, Db, resolve_test_db_url


@pytest.fixture(scope="session")
def database_url() -> str:
    try:
        url = resolve_test_db_url(os.environ)
    except RuntimeError as e:
        pytest.fail(str(e), pytrace=False)  # a refused URL fails the run, it is not a skip
    parts = urlsplit(url)
    try:
        with socket.create_connection((parts.hostname or "127.0.0.1", parts.port or 5432), timeout=1):
            pass
    except OSError:
        pytest.skip("no test database reachable: run `supabase start` or set POLYMATH_TEST_DB_URL")
    return url


@pytest.fixture
def run_id() -> str:
    return uuid.uuid4().hex[:12]


@pytest.fixture
def db(database_url: str, run_id: str) -> Iterator[Db]:
    conn = Db(database_url)
    try:
        yield conn
    finally:
        # Delete exactly the rows this test created.
        conn.execute("delete from public.jobs where dedupe_key like %s", (f"bl0016-{run_id}-%",))
        conn.close()


@pytest.fixture
def enqueue(db: Db, run_id: str) -> Callable[..., list[str]]:
    def _enqueue(count: int, *, timeout_s: int = 60, max_attempts: int = 3) -> list[str]:
        ids: list[str] = []
        for i in range(count):
            payload = json.dumps({"t": run_id, "seq": i})
            rows = db.execute(
                "select public.enqueue_job(%s, %s::jsonb, null, %s, 0::smallint, now(), %s, %s)",
                (TEST_KIND, payload, f"bl0016-{run_id}-{i}", max_attempts, timeout_s),
            )
            ids.append(str(rows[0][0]))
        return ids

    return _enqueue
