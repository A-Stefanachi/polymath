"""Item generation, verification and storage (BL-0017). AC-1: verified voltage-divider items with full
reports; AC-2: a wrong generator never yields a verified item; AC-3: the database refuses a verified item
without a report (NFR-03)."""

from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import Callable
from typing import Any

import pg8000.dbapi
import pytest
from queue_support import Db

from polymath_worker import pregenerate
from polymath_worker.content import item_writer, tplkit
from polymath_worker.job_queue import JobRow
from polymath_worker.run_worker import build_registry

# Doc 07 section 6 fields and their JSON types.
REPORT_FIELDS: dict[str, type | tuple[type, ...]] = {
    "report_version": int,
    "template_key": str,
    "template_version": int,
    "template_sha256": str,
    "seed": int,
    "params": dict,
    "generated_at": str,
    "toolchain": dict,
    "generator": dict,
    "verifiers": list,
    "self_grade": dict,
    "decision": str,
    "reasons": list,
    "duration_ms": int,
}

Make = Callable[..., dict[str, Any]]


def conn_of(db: Db) -> Any:
    return db._conn  # the writer takes the raw DB-API connection


def item_rows(db: Db, key: str) -> list[tuple[Any, ...]]:
    return db.execute(
        "select seed, status::text, verification_report, rendered, params, id::text from public.items"
        " where template_key = %s order by seed",
        (key,),
    )


def sqlstate(exc: pg8000.dbapi.Error) -> str:
    return str(exc.args[0]["C"])


def test_three_seeds_yield_three_verified_items_with_full_reports(db: Db, make_template: Make) -> None:
    """AC-1"""
    tpl = make_template("voltage-divider-vout", status="verified")
    written = item_writer.write_items(conn_of(db), tpl["key"], 1, [1, 2, 3])
    assert [w.status for w in written] == ["verified"] * 3
    rows = item_rows(db, tpl["key"])
    assert [r[0] for r in rows] == [1, 2, 3]
    for seed, status, report, rendered, params, item_id in rows:
        assert status == "verified"
        for field, typ in REPORT_FIELDS.items():
            assert field in report, field
            assert isinstance(report[field], typ), (field, report[field])
        assert report["report_version"] == 1
        assert report["decision"] == "verified" and report["reasons"] == []
        assert report["seed"] == seed and report["template_key"] == tpl["key"]
        assert report["template_sha256"] == tplkit.template_sha256(tpl)
        assert report["verifier"] == ["kcl-exact", "dimension", "window"]  # NFR-03 summary fields
        assert report["agreed"] is True
        assert {"id", "kind", "status", "ms"} <= set(report["verifiers"][0])
        assert report["self_grade"]["checked"] and report["self_grade"]["wrong_answers"]
        assert {"rejections", "method", "outputs"} == set(report["generator"])
        assert params == report["params"]
        assert "vout" not in json.dumps(rendered)  # the answer is not in the learner-visible part
        sec = db.execute(
            "select answer_key, solution from public.item_secrets where item_id = %s::uuid", (item_id,)
        )
        assert sec[0][0]["reference"] > 0 and sec[0][1]["steps"]


def _stored_solution(db: Db, key: str) -> dict[str, Any]:
    rows = item_rows(db, key)
    sec = db.execute("select solution from public.item_secrets where item_id = %s::uuid", (rows[0][5],))
    return sec[0][0]


def test_labelled_template_item_solution_carries_every_label(db: Db, make_template: Make) -> None:
    """BL-0204 (00a K5): labels are copied, filled in like text_md."""

    def label(t: dict[str, Any]) -> None:
        steps = t["solution"]["steps"]
        steps[0]["label"] = "Find the series current"
        steps[1]["label"] = "Take the drop across R2"

    tpl = make_template("labelled-steps", mutate=label)
    item_writer.write_items(conn_of(db), tpl["key"], 1, [1])
    steps = _stored_solution(db, tpl["key"])["steps"]
    assert [s["label"] for s in steps] == ["Find the series current", "Take the drop across R2"]
    assert all(s["text_md"] for s in steps)


def test_unlabelled_template_item_solution_carries_no_label(db: Db, make_template: Make) -> None:
    """BL-0204: existing items keep working without labels."""
    tpl = make_template("unlabelled-steps")
    item_writer.write_items(conn_of(db), tpl["key"], 1, [1])
    steps = _stored_solution(db, tpl["key"])["steps"]
    assert steps and all("label" not in s for s in steps)


def test_wrong_generator_expression_yields_no_verified_item(db: Db, make_template: Make) -> None:
    """AC-2"""

    def swap(t: dict) -> None:
        t["solution"]["generator"]["outputs"]["vout"] = "vin * r1 / (r1 + r2)"

    tpl = make_template("wrong-generator", mutate=swap)
    written = item_writer.write_items(conn_of(db), tpl["key"], 1, [1, 2, 3])
    assert [w.status for w in written] == ["draft"] * 3
    rows = item_rows(db, tpl["key"])
    assert len(rows) == 3
    for _seed, status, report, *_ in rows:
        assert status == "draft"
        assert report["decision"] == "rejected" and report["reasons"]
        assert report["agreed"] is False
    assert db.execute(
        "select count(*) from public.items where template_key = %s and status = 'verified'", (tpl["key"],)
    ) == [(0,)]


def test_verified_item_requires_verified_template(db: Db, make_template: Make) -> None:
    tpl = make_template("template-under-review", status="needs_human_review")
    written = item_writer.write_items(conn_of(db), tpl["key"], 1, [1])
    assert written[0].status == "needs_human_review"
    assert (
        item_rows(db, tpl["key"])[0][2]["decision"] == "verified"
    )  # the engine agreed; the template is not approved


def test_skipped_sandbox_verifier_gives_needs_human_review(db: Db, make_template: Make) -> None:
    def add_code_verifier(t: dict) -> None:
        t["verifiers"].append({"id": "ref-code", "kind": "reference_code_passes", "spec": {}})

    tpl = make_template("needs-sandbox", mutate=add_code_verifier)
    written = item_writer.write_items(conn_of(db), tpl["key"], 1, [1])
    assert written[0].status == "needs_human_review"
    report = item_rows(db, tpl["key"])[0][2]
    assert [v["status"] for v in report["verifiers"]] == ["pass", "pass", "pass", "skipped"]
    assert report["decision"] == "rejected" and report["verifier"] == ["kcl-exact", "dimension", "window"]


def test_rerun_neither_duplicates_nor_changes_a_verified_item(db: Db, make_template: Make) -> None:
    tpl = make_template("idempotent")
    first = item_writer.write_items(conn_of(db), tpl["key"], 1, [1, 2])
    before = item_rows(db, tpl["key"])
    again = item_writer.write_items(conn_of(db), tpl["key"], 1, [1, 2, 3])
    after = item_rows(db, tpl["key"])
    assert [w.item_id for w in again[:2]] == [w.item_id for w in first]
    assert all(w.untouched for w in again[:2]) and again[2].created
    assert after[:2] == before  # same ids, same report (including generated_at)
    assert len(after) == 3
    assert db.execute(
        "select count(*) from public.item_secrets s join public.items i on i.id = s.item_id where i.template_key = %s",
        (tpl["key"],),
    ) == [(3,)]


def test_unknown_and_retired_templates_are_refused(db: Db, make_template: Make) -> None:
    with pytest.raises(item_writer.TemplateNotUsable):
        item_writer.write_items(conn_of(db), "tpl.elec.bl0017-missing", 1, [1])
    tpl = make_template("retired-one", status="retired")
    with pytest.raises(item_writer.TemplateNotUsable):
        item_writer.write_items(conn_of(db), tpl["key"], 1, [1])


def test_database_refuses_verified_item_without_report(db: Db, make_template: Make) -> None:
    """AC-3 / NFR-03"""
    tpl = make_template("db-guard", status="needs_human_review")
    item_writer.write_items(conn_of(db), tpl["key"], 1, [1])
    item_id = item_rows(db, tpl["key"])[0][5]
    update = (
        "update public.items set status = 'verified', verification_report = %s::jsonb where id = %s::uuid"
    )
    with pytest.raises(pg8000.dbapi.DatabaseError) as null_report:
        db.execute(
            "update public.items set status = 'verified', verification_report = null where id = %s::uuid",
            (item_id,),
        )
    assert sqlstate(null_report.value) == "23502"  # the column is NOT NULL: not-null violation comes first
    for report in (
        "{}",
        '{"verifier": []}',
        '{"agreed": true}',
    ):  # each key is required, one missing is enough
        with pytest.raises(pg8000.dbapi.DatabaseError) as missing:
            db.execute(update, (report, item_id))
        assert sqlstate(missing.value) == "23514", report
    db.execute(update, ('{"verifier": [], "agreed": true}', item_id))  # both keys present: accepted
    assert item_rows(db, tpl["key"])[0][1] == "verified"


@pytest.mark.parametrize(
    ("count", "ok"),
    [(0, False), (1, True), (pregenerate.MAX_COUNT, True), (pregenerate.MAX_COUNT + 1, False)],
)
def test_payload_count_limits(count: int, ok: bool) -> None:
    payload = {"template_key": "tpl.elec.x", "template_version": 1, "seed_start": 5, "count": count}
    if ok:
        assert pregenerate.parse_payload(payload)[2] == list(range(5, 5 + count))
    else:
        with pytest.raises(pregenerate.InvalidPayload):
            pregenerate.parse_payload(payload)


@pytest.mark.parametrize(
    "bad",
    [{"template_key": ""}, {"template_version": 0}, {"seed_start": -1}, {"seed_start": True}, {"count": "3"}],
)
def test_payload_rejects_bad_fields(bad: dict[str, Any]) -> None:
    payload = {"template_key": "tpl.elec.x", "template_version": 1, "seed_start": 0, "count": 1} | bad
    with pytest.raises(pregenerate.InvalidPayload):
        pregenerate.parse_payload(payload)


def test_pregenerate_items_handler_is_registered_and_writes_items(
    db: Db, make_template: Make, database_url: str
) -> None:
    assert "pregenerate_items" in build_registry(database_url).kinds
    tpl = make_template("handler")
    handler = pregenerate.handler_for_url(database_url)
    job = JobRow(
        id=uuid.uuid4(),
        kind="pregenerate_items",
        payload={"template_key": tpl["key"], "template_version": 1, "seed_start": 10, "count": 2},
        attempts=1,
        max_attempts=3,
        timeout_s=60,
    )
    result = asyncio.run(handler(job))
    assert result == {"requested": 2, "written": 2, "by_status": {"verified": 2}}
    assert [r[0] for r in item_rows(db, tpl["key"])] == [10, 11]
