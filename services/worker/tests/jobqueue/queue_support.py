"""Helpers shared by the queue tests: a small database handle, worker processes and waiting.

The tests take their database only from POLYMATH_TEST_DB_URL (see conftest.py); they never read
DATABASE_URL_PRIVILEGED, which may point at a real database.
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from collections.abc import Callable, Mapping
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from polymath_worker.job_queue import connect_database

TEST_KIND = "sweep_storage"  # no other test uses this kind
HERE = Path(__file__).parent
WORKER_ROOT = HERE.parent.parent


LOCAL_TEST_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
LOCAL_HOSTS = frozenset({"127.0.0.1", "localhost", "::1"})


def resolve_test_db_url(environ: Mapping[str, str]) -> str:
    """The test database URL; refuses a non-local host unless POLYMATH_TEST_DB_ALLOW_REMOTE=1."""
    url = environ.get("POLYMATH_TEST_DB_URL") or LOCAL_TEST_DB_URL
    host = urlsplit(url).hostname
    if host not in LOCAL_HOSTS and environ.get("POLYMATH_TEST_DB_ALLOW_REMOTE") != "1":
        raise RuntimeError(
            f"refusing to run queue tests against non-local host {host!r}; "
            "set POLYMATH_TEST_DB_ALLOW_REMOTE=1 to override"
        )
    return url


class Db:
    """Autocommit test connection: `execute` returns all rows (empty for statements without a result)."""

    def __init__(self, url: str) -> None:
        self._conn = connect_database(url)

    def execute(self, sql: str, params: tuple[Any, ...] = ()) -> list[tuple[Any, ...]]:
        cur = self._conn.cursor()
        try:
            cur.execute(sql, params)
            return [tuple(r) for r in cur.fetchall()] if cur.description else []
        finally:
            cur.close()

    def close(self) -> None:
        self._conn.close()


def start_worker(database_url: str, out_dir: Path, mode: str) -> subprocess.Popen[bytes]:
    # The test URL is passed explicitly; DATABASE_URL_PRIVILEGED is removed so the child cannot use it.
    env = {k: v for k, v in os.environ.items() if k != "DATABASE_URL_PRIVILEGED"}
    env.update({"POLYMATH_TEST_DB_URL": database_url, "PYTHONPATH": str(WORKER_ROOT)})
    return subprocess.Popen([sys.executable, str(HERE / "worker_proc.py"), str(out_dir), mode], env=env)


def wait_until(condition: Callable[[], bool], timeout_s: float = 30.0) -> None:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        if condition():
            return
        time.sleep(0.1)
    raise AssertionError(f"condition not met within {timeout_s}s")


def statuses(db: Db, ids: list[str]) -> dict[str, tuple[str, int]]:
    rows = db.execute(
        "select id::text, status::text, attempts from public.jobs where id = any(%s::uuid[])", (ids,)
    )
    return {r[0]: (r[1], r[2]) for r in rows}


def handled_ids(out_dir: Path) -> list[str]:
    log = out_dir / "handled.log"
    return log.read_text().split() if log.exists() else []
