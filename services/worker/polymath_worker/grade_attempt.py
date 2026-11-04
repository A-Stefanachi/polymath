"""Job handler for `grade_attempt`, symbolic_equivalence attempts only (BL-0196; 00a J3, doc 03 sections 5.3 and 7.2).

Payload (ids only, CLAUDE.md rule 5): {"attempt_id": uuid}. Steps, each safe to repeat (jobs are at-least-once):

1. Load the attempt, its response and the item's answer key (the key never leaves this process).
2. If the attempt is still `pending`: grade it with the BL-0054 grader (SymPy and numeric sampling, never an LLM,
   rule 4) and write the grade with one conditional UPDATE (`... where grade_status = 'pending'`). The worker writes
   `attempts.grade`, `grade_status` and `graded_at` only, as the sequence diagram of doc 03 section 5.3 says
   ("tx update attempt grade, graded, complete_job"). It never writes `skill_state`, `review_log` or `sessions`
   (rule 8).
3. If the grade is `graded`, call the HMAC-signed apply callback of the web app, which runs the TypeScript domain
   code under the `state_applied_at` compare-and-set. A failed callback is retried with the job; whatever remains
   unapplied is applied by the next `GET /attempts/{id}` (section 5.3).

Failure (section 7.2): an infrastructure fault retries the job; the third failed try (or an unreadable answer key,
which retrying cannot fix) sets `grade_status = 'error'`, which no learner state ever counts. Other grader types
are left alone until BL-0085 (the job fails without touching the attempt).
"""

from __future__ import annotations

import asyncio
import json
import time
import urllib.error
import urllib.request
import uuid
from collections.abc import Callable
from typing import Any

import pydantic
import structlog

from polymath_worker import symbolic_grade
from polymath_worker.hmac_auth import SIGNATURE_HEADER, TIMESTAMP_HEADER, sign
from polymath_worker.job_queue import DB_ERRORS, Handler, JobRow, Retryable, connect_database
from polymath_worker.symbolic_grade import InvalidReference, SymbolicGradeRequest

log = structlog.get_logger("polymath_worker.grade_attempt")

SYMBOLIC = "symbolic_equivalence"
GRADER_VERSION = "sympy-worker/1"
MAX_GRADE_TRIES = 3  # "after three failures the attempt is in status error" (BL-0196)
APPLY_PATH = "/api/internal/apply-grade"
APPLY_TIMEOUT_S = 10
# Grader detail keys that may be stored and returned; the reference is never one of them (mirrors the web app).
SAFE_DETAIL = ("method", "form", "parse_error")

Grader = Callable[[SymbolicGradeRequest], dict[str, Any]]
Applier = Callable[[str], None]


class InvalidPayload(ValueError):
    pass


class UnsupportedGrader(Exception):
    """The attempt needs a grader this lean handler does not have (code and SPICE belong to BL-0085)."""


class ApplyFailed(Exception):
    pass


def parse_payload(payload: dict[str, Any]) -> str:
    value = payload.get("attempt_id")
    if not isinstance(value, str):
        raise InvalidPayload("attempt_id must be a uuid")
    try:
        return str(uuid.UUID(value))
    except ValueError as e:
        raise InvalidPayload("attempt_id must be a uuid") from e


def stored_grade(g: dict[str, Any]) -> dict[str, Any]:
    """The api Grade as stored (00a D2): score and correct are null unless the status is `graded`."""
    graded = g["status"] == "graded"
    return {
        "status": g["status"],
        "score": g["score"] if graded else None,
        "correct": g["correct"] if graded else None,
        "mastery_eligible": graded,
        "graders": [
            {
                "type": x["type"],
                "score": x["score"] if graded else 0,
                "detail": {k: v for k, v in x["detail"].items() if k in SAFE_DETAIL},
            }
            for x in g["graders"]
        ],
        "feedback": g["feedback"],
        "misconception_tags": list(g["misconception_tags"]),
    }


def _one(conn: Any, sql: str, params: tuple[Any, ...]) -> tuple[Any, ...] | None:
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        return tuple(cur.fetchone()) if cur.description and cur.rowcount else None
    finally:
        cur.close()


def _exec(conn: Any, sql: str, params: tuple[Any, ...]) -> None:
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
    finally:
        cur.close()


def set_error(conn: Any, attempt_id: str) -> None:
    """Marks a still-pending attempt `error`; a graded attempt is never downgraded."""
    _exec(
        conn,
        "update public.attempts set grade_status = 'error', graded_at = now()"
        " where id = %s::uuid and grade_status = 'pending'",
        (attempt_id,),
    )


def grade_pending(conn: Any, attempt_id: str, response: Any, key: Any, grade: Grader) -> str:
    """Grades and stores; returns the resulting grade_status. Raises InvalidReference or ValueError for data faults."""
    if (
        not isinstance(response, dict)
        or response.get("kind") != "symbolic"
        or not isinstance(response.get("expression"), str)
    ):
        raise ValueError("response is not a symbolic response")
    if not isinstance(key, dict) or key.get("grader_type") != SYMBOLIC:
        raise ValueError("answer key missing or malformed")
    try:
        req = SymbolicGradeRequest(
            response_text=response["expression"],
            reference=key["reference"],
            spec=key["answer_spec"],
            misconceptions=key.get("misconceptions", []),
        )
    except (pydantic.ValidationError, KeyError, TypeError) as e:
        raise ValueError("answer key missing or malformed") from e
    grade_json = stored_grade(grade(req))
    status = grade_json["status"]
    _exec(
        conn,
        "update public.attempts set grade = %s::jsonb, grade_status = %s::public.grade_status, graded_at = now(),"
        " grader_version = %s where id = %s::uuid and grade_status = 'pending'",
        (json.dumps(grade_json), status, GRADER_VERSION, attempt_id),
    )
    return str(status)


def http_applier(base_url: str, secret: str, clock: Callable[[], float] = time.time) -> Applier:
    """Signed POST to the web app's apply-grade endpoint (headers and signed string as in hmac_auth)."""

    def apply(attempt_id: str) -> None:
        body = json.dumps({"attempt_id": attempt_id}).encode()
        ts = str(int(clock()))
        req = urllib.request.Request(
            base_url.rstrip("/") + APPLY_PATH,
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                TIMESTAMP_HEADER.decode(): ts,
                SIGNATURE_HEADER.decode(): sign(secret, ts, "POST", APPLY_PATH, body),
            },
        )
        if req.type not in ("http", "https"):
            raise ApplyFailed("INTERNAL_APPLY_URL must be http or https")
        try:
            with urllib.request.urlopen(req, timeout=APPLY_TIMEOUT_S) as res:  # nosec B310 - scheme checked above
                if res.status != 200:
                    raise ApplyFailed(f"apply-grade answered {res.status}")
        except (urllib.error.URLError, OSError) as e:
            raise ApplyFailed(f"apply-grade call failed: {type(e).__name__}") from e

    return apply


def applier_from_env(env: dict[str, str]) -> Applier | None:
    base, secret = env.get("INTERNAL_APPLY_URL"), env.get("INTERNAL_APPLY_HMAC_SECRET")
    return http_applier(base, secret) if base and secret else None


def make_handler(connect: Callable[[], Any], grade: Grader, apply: Applier | None) -> Handler:
    """`apply` None means the callback is not configured: the grade is stored and the web app's poll applies it."""

    def run_sync(job: JobRow) -> dict[str, Any]:
        attempt_id = parse_payload(job.payload)
        conn = connect()
        try:
            row = _one(
                conn,
                "select a.grade_status::text, a.response, t.grader_type::text, s.answer_key"
                " from public.attempts a join public.items i on i.id = a.item_id"
                " join public.item_templates t on t.key = i.template_key and t.version = i.template_version"
                " left join public.item_secrets s on s.item_id = i.id where a.id = %s::uuid",
                (attempt_id,),
            )
            if row is None:
                return {"skipped": "attempt_not_found"}
            status, response, grader_type, key = row
            if grader_type != SYMBOLIC:
                raise UnsupportedGrader(grader_type)
            try:
                if status == "pending":
                    status = grade_pending(conn, attempt_id, response, key, grade)
            except (InvalidReference, ValueError):
                set_error(conn, attempt_id)  # a data fault: retrying cannot help
                log.error("grade_attempt_data_fault", attempt_id=attempt_id)
                return {"status": "error"}
            except DB_ERRORS:
                raise
            except Exception as e:
                if job.attempts >= MAX_GRADE_TRIES:
                    set_error(conn, attempt_id)
                    log.error("grade_attempt_gave_up", attempt_id=attempt_id, error_type=type(e).__name__)
                    return {"status": "error"}
                raise Retryable(f"grader failed: {type(e).__name__}") from e
            if status == "graded" and apply is not None:
                try:
                    apply(attempt_id)
                except ApplyFailed as e:
                    raise Retryable(str(e)) from e
            return {"status": status}
        except DB_ERRORS as e:
            raise Retryable(f"database error: {type(e).__name__}") from e
        finally:
            conn.close()

    async def handler(job: JobRow) -> dict[str, Any]:
        return await asyncio.to_thread(run_sync, job)

    return handler


def handler_for_url(database_url: str, env: dict[str, str]) -> Handler:
    return make_handler(
        lambda: connect_database(database_url), symbolic_grade.grader.grade, applier_from_env(env)
    )
