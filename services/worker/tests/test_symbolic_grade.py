"""BL-0054: POST /grade/symbolic against the shared grader vectors, the size limit and injection input."""

import json
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from polymath_worker.hmac_auth import HmacSecrets, sign
from polymath_worker.main import create_app
from polymath_worker.symbolic_grade import GraderProcess, SymbolicGradeRequest

NOW = 1_800_000_000.0
SECRET = "test-secret"
PATH = "/grade/symbolic"
VECTORS = json.loads(
    (Path(__file__).parents[3] / "polymath-app-spec/reference/verifiers/tests/grader_vectors.json").read_text(
        encoding="utf-8"
    )
)["symbolic"]

client = TestClient(create_app(HmacSecrets(current=SECRET), clock=lambda: NOW))


def grade(text: str, spec: dict | None = None, reference: str | None = None):
    body = json.dumps(
        {
            "response_text": text,
            "reference": reference or VECTORS["reference"],
            "spec": spec or VECTORS["spec"],
        }
    ).encode()
    ts = str(int(NOW))
    return client.post(
        PATH,
        content=body,
        headers={
            "X-Polymath-Timestamp": ts,
            "X-Polymath-Signature": sign(SECRET, ts, "POST", PATH, body),
            "Content-Type": "application/json",
        },
    )


@pytest.mark.parametrize("case", VECTORS["cases"], ids=lambda c: c["input"][:30])
def test_symbolic_vectors_ac1(case):
    """AC-1: every symbolic vector of grader_vectors.json gives the expected correct/invalid result."""
    r = grade(case["input"])
    assert r.status_code == 200
    body = r.json()
    assert body["correct"] is case["correct"]
    assert (body["status"] == "invalid_input") is bool(case.get("invalid", False))


def test_5000_character_expression_is_invalid_input_quickly_ac2():
    """AC-2: 5000 characters -> invalid_input in under 1 s, not a wrong answer."""
    started = time.perf_counter()
    r = grade("x+" * 2500)
    elapsed = time.perf_counter() - started
    assert r.status_code == 200
    assert r.json()["status"] == "invalid_input"
    assert elapsed < 1.0


def test_length_limit_boundary_is_200_characters():
    at_limit = "x*x" + " " * 197  # 200 characters, readable (the 300-node cap is a separate limit)
    assert len(at_limit) == 200
    assert grade(at_limit).json()["status"] == "graded"
    past = grade("x*x" + " " * 198)  # 201 characters
    assert past.json()["status"] == "invalid_input"
    assert "200 characters" in past.json()["feedback"]


@pytest.mark.parametrize(
    "text",
    [
        '__import__("os")',
        "__import__('os').system('id')",
        "().__class__.__bases__",
        "open('/etc/passwd')",
        "x; import os",
    ],
)
def test_malicious_input_is_invalid_input_and_not_executed_ac4(text):
    """AC-4: injection strings are invalid_input; nothing is executed."""
    r = grade(text)
    assert r.status_code == 200
    assert r.json()["status"] == "invalid_input"
    assert r.json()["correct"] is False


def test_stuck_grade_is_killed_and_the_next_call_gets_a_fresh_process():
    """A grade that outlives the hard limit is invalid_input (never wrong) and does not poison later calls."""
    g = GraderProcess(hard_timeout_s=0.0)
    req = SymbolicGradeRequest.model_validate(
        {"response_text": "x", "reference": "x", "spec": VECTORS["spec"]}
    )
    try:
        assert g.grade(req)["graders"][0]["detail"] == {"method": "timeout"}
        g._hard_timeout_s = 30.0
        assert g.grade(req)["correct"] is True
    finally:
        g.close()


def test_unreadable_reference_is_a_422_without_detail():
    r = grade("x", reference="__import__('os')")
    assert r.status_code == 422
    assert "os" not in r.text


def test_spec_without_interval_for_a_variable_is_rejected():
    assert grade("x", spec={"variables": ["x"], "sample_domain": {}}).status_code == 422
