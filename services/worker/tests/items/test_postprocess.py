"""content_postprocess, the G2 fuzz run after content:sync (doc 07 sections 7 and 10). Needed by BL-0032: without
it no synced template can reach `verified`. The voltage-divider sample passes all 200 samples; a wrong generator
fails with its first failing seed; templates of other jobs are not touched; the result holds no content."""

from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import Callable
from typing import Any

import pytest
from queue_support import Db

from polymath_worker import postprocess
from polymath_worker.job_queue import JobRow
from polymath_worker.run_worker import build_registry

Make = Callable[..., dict[str, Any]]


def tag_job(db: Db, key: str, job_id: uuid.UUID) -> None:
    """What content:sync writes for a template whose G2 run belongs to this job."""
    db.execute(
        "update public.item_templates set body = jsonb_set(body, '{_sync}', %s::jsonb) where key = %s",
        (json.dumps({"fuzz_job_id": str(job_id), "sha256": "x"}), key),
    )


def job_row(job_id: uuid.UUID) -> JobRow:
    return JobRow(
        id=job_id,
        kind="content_postprocess",
        payload={"sync_run_id": str(uuid.uuid4())},
        attempts=1,
        max_attempts=3,
        timeout_s=120,
    )


def test_registered(database_url: str) -> None:
    assert "content_postprocess" in build_registry(database_url).kinds


def test_sample_passes_200_samples_and_other_jobs_templates_are_ignored(
    db: Db, make_template: Make, database_url: str
) -> None:
    job_id, other = uuid.uuid4(), uuid.uuid4()
    good = make_template("fuzz-good", status="needs_human_review")
    elsewhere = make_template("fuzz-other", status="needs_human_review")
    tag_job(db, good["key"], job_id)
    tag_job(db, elsewhere["key"], other)

    result = asyncio.run(postprocess.handler_for_url(database_url)(job_row(job_id)))

    assert result["passed"] is True
    assert list(result["templates"]) == [f"{good['key']}@1"]
    summary = result["templates"][f"{good['key']}@1"]
    assert summary["samples"] == 200
    assert summary["failed_seeds"] == 0
    assert summary["failed_checks"] == []
    assert summary["distinct_param_sets"] > 1
    # The handler writes only the job result: no items, template status unchanged.
    assert db.execute("select count(*) from public.items where template_key = %s", (good["key"],))[0][0] == 0
    status = db.execute("select status::text from public.item_templates where key = %s", (good["key"],))
    assert status[0][0] == "needs_human_review"
    # Counts and seeds only (job results carry no rendered text or parameters, doc 03 section 8.3).
    text = json.dumps(result)
    assert "stem" not in text and "params" not in text


def test_wrong_generator_fails_with_first_failing_seed(
    db: Db, make_template: Make, database_url: str
) -> None:
    def swap(t: dict) -> None:
        t["solution"]["generator"]["outputs"]["vout"] = "vin * r1 / (r1 + r2)"

    job_id = uuid.uuid4()
    good = make_template("fuzz-good2", status="needs_human_review")
    bad = make_template("fuzz-bad", status="needs_human_review", mutate=swap)
    tag_job(db, good["key"], job_id)
    tag_job(db, bad["key"], job_id)

    result = asyncio.run(postprocess.handler_for_url(database_url)(job_row(job_id)))

    assert result["passed"] is False
    summary = result["templates"][f"{bad['key']}@1"]
    assert "seed_failures" in summary["failed_checks"]
    assert summary["first_failing_seed"] == bad["fuzz"]["seed_base"]
    assert result["templates"][f"{good['key']}@1"]["passed"] is True


@pytest.mark.parametrize("payload", [{}, {"sync_run_id": "nope"}, {"sync_run_id": 3}])
def test_invalid_payload_is_refused(payload: dict[str, Any]) -> None:
    with pytest.raises(postprocess.InvalidPayload):
        postprocess.parse_payload(payload)
