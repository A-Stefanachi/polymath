"""Fixtures for the item generation and verification tests (BL-0017).

The database comes only from POLYMATH_TEST_DB_URL through `resolve_test_db_url` (never DATABASE_URL_PRIVILEGED,
which may point at a real database). The local stack is shared with other agents, so all fixture rows live in
the namespace module `elec.bl0017` / skill `elec.bl0017.divider` / templates `tpl.elec.bl0017-*`, and teardown
deletes exactly those rows, children first.
"""

from __future__ import annotations

import copy
import json
import os
import socket
import sys
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "jobqueue"))
from queue_support import Db, resolve_test_db_url

from polymath_worker.content import tplkit

SAMPLE_KEY = "tpl.elec.voltage-divider-vout"
MODULE_KEY = "elec.bl0017"
SKILL_KEY = "elec.bl0017.divider"
KEY_PREFIX = "tpl.elec.bl0017-"
# Columns that live outside item_templates.body (BL-0013): hoisted from the file.
HOISTED = ("key", "skill_key", "task_kind", "grader_type", "difficulty_prior", "version")


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


def _cleanup(db: Db) -> None:
    db.execute(
        "delete from public.item_secrets where item_id in"
        " (select id from public.items where template_key like %s)",
        (KEY_PREFIX + "%",),
    )
    db.execute("delete from public.items where template_key like %s", (KEY_PREFIX + "%",))
    db.execute("delete from public.item_templates where key like %s", (KEY_PREFIX + "%",))
    db.execute("delete from public.skills where key = %s", (SKILL_KEY,))
    db.execute("delete from public.modules where key = %s", (MODULE_KEY,))


@pytest.fixture(scope="module")
def db(database_url: str) -> Iterator[Db]:
    conn = Db(database_url)
    _cleanup(conn)  # leftovers of an interrupted run
    conn.execute(
        "insert into public.modules (key, node, module, title, order_index)"
        " values (%s, 'elec', 'bl0017', 'BL-0017 test module', 9999)",
        (MODULE_KEY,),
    )
    conn.execute(
        "insert into public.skills (key, node, module, title, tier_target, est_minutes, license, source, status,"
        " task_kinds, grader_types) values (%s, 'elec', 'bl0017', 'BL-0017 divider', 'L1', 10, 'original',"
        " 'original', 'draft', '{worked_example,retrieval}', '{exact_numeric}')",
        (SKILL_KEY,),
    )
    try:
        yield conn
    finally:
        _cleanup(conn)
        conn.close()


def sample_template() -> dict[str, Any]:
    return copy.deepcopy(tplkit.load_all()[SAMPLE_KEY])


def insert_template(db: Db, tpl: dict[str, Any], status: str) -> None:
    """Insert a template as the sync would: hoisted columns from the file, the rest as body."""
    body = {k: v for k, v in tpl.items() if k not in HOISTED}
    db.execute(
        "insert into public.item_templates (key, version, skill_key, task_kind, grader_type, difficulty_prior,"
        " status, body, license, source) values (%s, %s, %s, %s::public.task_kind, %s::public.grader_type, %s,"
        " %s::public.content_status, %s::jsonb, 'original', 'original')",
        (
            tpl["key"],
            tpl["version"],
            SKILL_KEY,
            tpl["task_kind"],
            tpl["grader_type"],
            tpl["difficulty_prior"],
            status,
            json.dumps(body),
        ),
    )


@pytest.fixture
def make_template(db: Db) -> Iterator[Callable[..., dict[str, Any]]]:
    """Insert a modified copy of the voltage-divider sample under a bl0017 key; removed after the test."""
    created: list[str] = []

    def _make(slug: str, status: str = "verified", mutate: Callable[[dict], None] | None = None) -> dict:
        tpl = sample_template()
        tpl["key"] = f"{KEY_PREFIX}{slug}"
        tpl["skill_key"] = SKILL_KEY
        if mutate:
            mutate(tpl)
        insert_template(db, tpl, status)
        created.append(tpl["key"])
        return tpl

    yield _make
    for key in created:
        db.execute(
            "delete from public.item_secrets where item_id in (select id from public.items where template_key = %s)",
            (key,),
        )
        db.execute("delete from public.items where template_key = %s", (key,))
        db.execute("delete from public.item_templates where key = %s", (key,))
