"""The queue tests never reach a non-local database by accident (no database needed to run these)."""

from __future__ import annotations

import pytest
from queue_support import LOCAL_TEST_DB_URL, resolve_test_db_url


def test_default_is_the_local_stack_and_ignores_database_url_privileged() -> None:
    env = {"DATABASE_URL_PRIVILEGED": "postgresql://x@example.invalid/db"}
    assert resolve_test_db_url(env) == LOCAL_TEST_DB_URL


@pytest.mark.parametrize("host", ["127.0.0.1", "localhost", "[::1]"])
def test_local_hosts_are_accepted(host: str) -> None:
    url = f"postgresql://postgres:postgres@{host}:54322/postgres"
    assert resolve_test_db_url({"POLYMATH_TEST_DB_URL": url}) == url


def test_remote_host_is_refused_without_the_override() -> None:
    url = "postgresql://u:p@db.example.invalid:5432/postgres"
    with pytest.raises(RuntimeError, match="non-local host"):
        resolve_test_db_url({"POLYMATH_TEST_DB_URL": url})
    assert resolve_test_db_url({"POLYMATH_TEST_DB_URL": url, "POLYMATH_TEST_DB_ALLOW_REMOTE": "1"}) == url
