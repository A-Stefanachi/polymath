"""Per-user item pool top-up (BL-0043; FR-031, ADR-019, doc 06 section 3.8).
AC-1: 10 generated items for one skill have 10 distinct seeds and all are verified.
AC-2: a user served seeds {1,2,3} never receives them again (50 draws).
AC-3 (the shortage trigger enqueues a priority-100 job) is the web integration test pool-store.test.ts."""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import Callable, Iterator
from typing import Any

import pytest
from conftest import SKILL_KEY
from queue_support import Db

from polymath_worker import pregenerate
from polymath_worker.content import pool
from polymath_worker.job_queue import JobRow

Make = Callable[..., dict[str, Any]]


@pytest.fixture
def user(db: Db, make_template: Make) -> Iterator[str]:  # after make_template: torn down first (FK to items)
    uid = str(uuid.uuid4())
    db.execute(
        "insert into auth.users (id, aud, role, email) values (%s, 'authenticated', 'authenticated', %s)",
        (uid, f"bl0043-{uid}@example.invalid"),
    )
    yield uid
    db.execute("delete from auth.users where id = %s", (uid,))


def conn_of(db: Db) -> Any:
    return db._conn


def seeds_of(db: Db, uid: str) -> list[int]:
    rows = db.execute(
        "select seed from public.items where user_id = %s and status = 'verified' order by seed", (uid,)
    )
    return [r[0] for r in rows]


def mark_served(db: Db, uid: str) -> None:
    """Serve every item the user owns: one attempt per item not yet attempted (the worker never writes
    sessions; an attempt is the other record of a served item)."""
    rows = db.execute(
        "select id::text from public.items i where user_id = %s and not exists"
        " (select 1 from public.attempts a where a.item_id = i.id)",
        (uid,),
    )
    for (item_id,) in rows:
        db.execute(
            "insert into public.attempts (user_id, item_id, started_at, submitted_at, response, client_attempt_id)"
            " values (%s, %s, now(), now(), '{}'::jsonb, gen_random_uuid())",
            (uid, item_id),
        )


def test_ten_items_have_ten_distinct_seeds_and_are_verified(db: Db, make_template: Make, user: str) -> None:
    """AC-1"""
    make_template("pool-a", status="verified")
    result = pool.top_up_skill(conn_of(db), user, SKILL_KEY, 10)
    assert result == {"stock_before": 0, "generated": 10, "stock_after": 10}
    rows = db.execute("select seed, status::text from public.items where user_id = %s", (user,))
    assert len(rows) == 10
    assert len({r[0] for r in rows}) == 10
    assert {r[1] for r in rows} == {"verified"}


def test_top_up_only_fills_the_shortfall(db: Db, make_template: Make, user: str) -> None:
    make_template("pool-b", status="verified")
    pool.top_up_skill(conn_of(db), user, SKILL_KEY, 3)
    result = pool.top_up_skill(conn_of(db), user, SKILL_KEY, 5)
    assert result == {"stock_before": 3, "generated": 2, "stock_after": 5}
    assert pool.top_up_skill(conn_of(db), user, SKILL_KEY, 5)["generated"] == 0  # a repeat job is a no-op


def test_served_seeds_are_never_drawn_again_over_50_draws(db: Db, make_template: Make, user: str) -> None:
    """AC-2"""
    make_template("pool-c", status="verified")
    pool.top_up_skill(conn_of(db), user, SKILL_KEY, 3)
    assert seeds_of(db, user) == [1, 2, 3]
    mark_served(db, user)
    drawn: list[int] = []
    for _ in range(50):
        before = set(seeds_of(db, user))
        pool.top_up_skill(conn_of(db), user, SKILL_KEY, 1)
        new = set(seeds_of(db, user)) - before
        assert len(new) == 1
        drawn.extend(new)
        mark_served(db, user)
    assert len(drawn) == 50 and len(set(drawn)) == 50
    assert not set(drawn) & {1, 2, 3}


def test_no_stock_without_a_verified_template(db: Db, make_template: Make, user: str) -> None:
    """Rule 3: a template that is not verified yields no pool items, not even needs_human_review ones."""
    make_template("pool-d", status="needs_human_review")
    result = pool.top_up_skill(conn_of(db), user, SKILL_KEY, 4)
    assert result == {"stock_before": 0, "generated": 0, "stock_after": 0}
    assert db.execute("select count(*) from public.items where user_id = %s", (user,))[0][0] == 0


def test_fresh_seeds_skips_used() -> None:
    assert pool.fresh_seeds({1, 2, 4}, 3) == [3, 5, 6]


def test_handler_runs_the_pool_payload(db: Db, make_template: Make, user: str, database_url: str) -> None:
    make_template("pool-e", status="verified")
    job = JobRow(
        id=uuid.uuid4(),
        kind="pregenerate_items",
        payload={"user_id": user, "skill_keys": [SKILL_KEY], "want": 2},
        attempts=1,
        max_attempts=3,
        timeout_s=60,
    )
    result = asyncio.run(pregenerate.handler_for_url(database_url)(job))
    assert result == {"skills": {SKILL_KEY: {"stock_before": 0, "generated": 2, "stock_after": 2}}}


@pytest.mark.parametrize(
    ("want", "ok"), [(0, False), (1, True), (pregenerate.MAX_WANT, True), (pregenerate.MAX_WANT + 1, False)]
)
def test_pool_payload_want_limits(want: int, ok: bool) -> None:
    payload = {"user_id": str(uuid.uuid4()), "skill_keys": ["elec.dc.ohm"], "want": want}
    if ok:
        assert pregenerate.parse_pool_payload(payload)[2] == want
    else:
        with pytest.raises(pregenerate.InvalidPayload):
            pregenerate.parse_pool_payload(payload)


@pytest.mark.parametrize(
    "bad",
    [
        {"user_id": "nope"},
        {"skill_keys": []},
        {"skill_keys": ["Bad Key"]},
        {"skill_keys": "elec.dc.ohm"},
        {"want": True},
    ],
)
def test_pool_payload_rejects_bad_fields(bad: dict[str, Any]) -> None:
    payload = {"user_id": str(uuid.uuid4()), "skill_keys": ["elec.dc.ohm"], "want": 1} | bad
    with pytest.raises(pregenerate.InvalidPayload):
        pregenerate.parse_pool_payload(payload)
