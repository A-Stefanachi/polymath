"""BL-0196: the symbolic `grade_attempt` handler and the answer key's misconceptions (00a J3, J4).

Runs against the local database with the real SymPy grader process; the apply callback is a recording fake (the
HMAC round trip with the real web app is covered by the web tests and the stack run in progress.md). Fixture rows
live under the bl0017 namespace of conftest.py plus throwaway users, and are removed after each test.
"""

from __future__ import annotations

import asyncio
import copy
import json
import uuid
from collections.abc import Callable, Iterator
from typing import Any

import pytest
from conftest import KEY_PREFIX, SKILL_KEY, insert_template
from queue_support import Db

from polymath_worker import grade_attempt, symbolic_grade
from polymath_worker.content import item_writer, tplkit
from polymath_worker.job_queue import JobRow, Retryable

SAMPLE = "tpl.math.derivative-product-sine"
TPL_KEY = f"{KEY_PREFIX}symbolic"


def conn_of(db: Db) -> Any:
    return db._conn


@pytest.fixture(scope="module", autouse=True)
def _grader() -> Iterator[None]:
    yield
    symbolic_grade.grader.close()


class Fx:
    def __init__(self, db: Db) -> None:
        self.db = db
        self.users: list[str] = []
        tpl = copy.deepcopy(tplkit.load_all()[SAMPLE])
        tpl["key"], tpl["skill_key"] = TPL_KEY, SKILL_KEY
        insert_template(db, tpl, "verified")
        written = item_writer.write_items(conn_of(db), TPL_KEY, 1, [1])
        self.item_id = written[0].item_id
        self.key: dict[str, Any] = db.execute(
            "select answer_key from public.item_secrets where item_id = %s::uuid", (self.item_id,)
        )[0][0]

    def attempt(self, response: dict[str, Any]) -> str:
        user = str(uuid.uuid4())
        self.users.append(user)
        self.db.execute(
            "insert into auth.users (id, aud, role, email) values (%s::uuid, 'authenticated', 'authenticated', %s)",
            (user, f"bl0196-{user}@example.invalid"),
        )
        return str(
            self.db.execute(
                "insert into public.attempts (user_id, item_id, started_at, submitted_at, response, client_attempt_id)"
                " values (%s::uuid, %s::uuid, now() - interval '1 min', now(), %s::jsonb, gen_random_uuid())"
                " returning id::text",
                (user, self.item_id, json.dumps(response)),
            )[0][0]
        )

    def state(self, attempt_id: str) -> tuple[str, dict[str, Any] | None]:
        row = self.db.execute(
            "select grade_status::text, grade from public.attempts where id = %s::uuid", (attempt_id,)
        )[0]
        return row[0], row[1]


@pytest.fixture
def fx(db: Db) -> Iterator[Fx]:
    f = Fx(db)
    yield f
    for user in f.users:
        db.execute("delete from public.attempts where user_id = %s::uuid", (user,))
        db.execute("delete from auth.users where id = %s::uuid", (user,))
    db.execute("delete from public.item_secrets where item_id = %s::uuid", (f.item_id,))
    db.execute("delete from public.items where template_key = %s", (TPL_KEY,))
    db.execute("delete from public.item_templates where key = %s", (TPL_KEY,))


def job(attempt_id: str, attempts: int = 1) -> JobRow:
    return JobRow(uuid.uuid4(), "grade_attempt", {"attempt_id": attempt_id}, attempts, 5, 120)


def run(handler: Any, j: JobRow) -> dict[str, Any]:
    return asyncio.run(handler(j))  # type: ignore[no-any-return]


def handler_for(
    db: Db, url: str, applied: list[str], grade: Callable[..., dict[str, Any]] | None = None
) -> Any:
    return grade_attempt.make_handler(
        lambda: grade_attempt.connect_database(url), grade or symbolic_grade.grader.grade, applied.append
    )


def test_answer_key_carries_each_misconception_tag_and_expression(fx: Fx) -> None:
    """J4: tag and wrong-answer expression evaluated for the item's parameters, next to the reference."""
    tags = [m["tag"] for m in fx.key["misconceptions"]]
    assert tags == [
        "mc.product-rule-as-product-of-derivatives",
        "mc.chain-rule-missing-inner-derivative",
    ]
    assert all(
        m["expr"] and "wrong_answer_expr" not in m and "**" not in m["expr"] for m in fx.key["misconceptions"]
    )
    assert fx.key["reference"]


def test_misconception_response_is_incorrect_with_its_tag_and_no_reference(
    db: Db, fx: Fx, database_url: str
) -> None:
    """AC-3: equivalent to a misconception expression -> incorrect, that tag; the reference is not in the grade."""
    wrong = fx.key["misconceptions"][1]
    attempt = fx.attempt({"kind": "symbolic", "expression": wrong["expr"]})
    applied: list[str] = []
    run(handler_for(db, database_url, applied), job(attempt))
    status, grade = fx.state(attempt)
    assert status == "graded" and grade is not None
    assert grade["correct"] is False and grade["score"] == 0
    assert grade["misconception_tags"] == [wrong["tag"]]
    assert grade["feedback"] == wrong["feedback_md"]
    assert fx.key["reference"] not in json.dumps(grade)
    assert applied == [attempt]  # a graded attempt is handed to the apply callback


def test_correct_response_is_graded_and_replay_regrades_nothing(db: Db, fx: Fx, database_url: str) -> None:
    """AC-1: graded once; a re-delivered job keeps the stored grade and only repeats the (idempotent) callback."""
    attempt = fx.attempt({"kind": "symbolic", "expression": fx.key["reference"].replace("**", "^")})
    applied: list[str] = []
    calls: list[str] = []

    def counting(req: Any) -> dict[str, Any]:
        calls.append(req.response_text)
        return symbolic_grade.grader.grade(req)

    h = handler_for(db, database_url, applied, counting)
    run(h, job(attempt))
    first = fx.state(attempt)
    run(h, job(attempt))
    assert first[0] == "graded" and first[1] is not None and first[1]["correct"] is True
    assert fx.state(attempt) == first
    assert len(calls) == 1
    assert applied == [attempt, attempt]


def test_failed_callback_retries_the_job_but_keeps_the_grade(db: Db, fx: Fx, database_url: str) -> None:
    attempt = fx.attempt({"kind": "symbolic", "expression": fx.key["reference"]})

    def down(_: str) -> None:
        raise grade_attempt.ApplyFailed("apply-grade call failed: URLError")

    h = grade_attempt.make_handler(
        lambda: grade_attempt.connect_database(database_url), symbolic_grade.grader.grade, down
    )
    with pytest.raises(Retryable):
        run(h, job(attempt))
    assert fx.state(attempt)[0] == "graded"


@pytest.mark.parametrize(("tries", "expected"), [(1, "pending"), (2, "pending"), (3, "error")])
def test_third_failing_grade_leaves_the_attempt_in_error(
    db: Db, fx: Fx, database_url: str, tries: int, expected: str
) -> None:
    """AC-4 and the boundary: tries 1 and 2 retry, the third stops with status error and no grade."""
    attempt = fx.attempt({"kind": "symbolic", "expression": "x"})

    def broken(_: Any) -> dict[str, Any]:
        raise RuntimeError("grader process died")

    applied: list[str] = []
    h = handler_for(db, database_url, applied, broken)
    if expected == "pending":
        with pytest.raises(Retryable):
            run(h, job(attempt, tries))
    else:
        assert run(h, job(attempt, tries)) == {"status": "error"}
    status, grade = fx.state(attempt)
    assert (status, grade) == (expected, None)
    assert applied == []


def test_unreadable_response_is_an_error_without_retry(db: Db, fx: Fx, database_url: str) -> None:
    attempt = fx.attempt({"kind": "numeric", "value": 1})
    assert run(handler_for(db, database_url, []), job(attempt)) == {"status": "error"}
    assert fx.state(attempt)[0] == "error"


def test_invalid_input_is_stored_without_score_and_not_applied(db: Db, fx: Fx, database_url: str) -> None:
    attempt = fx.attempt({"kind": "symbolic", "expression": "import os"})
    applied: list[str] = []
    run(handler_for(db, database_url, applied), job(attempt))
    status, grade = fx.state(attempt)
    assert status == "invalid_input" and grade is not None
    assert grade["score"] is None and grade["correct"] is None
    assert applied == []


@pytest.mark.parametrize("payload", [{}, {"attempt_id": 5}, {"attempt_id": "not-a-uuid"}])
def test_payload_must_be_an_attempt_uuid(payload: dict[str, Any]) -> None:
    with pytest.raises(grade_attempt.InvalidPayload):
        grade_attempt.parse_payload(payload)
