"""BL-0014: /healthz, HMAC signing with two-secret rotation, log redaction."""

import json
from datetime import UTC, datetime, timedelta

import pytest
import structlog
from fastapi.testclient import TestClient

from polymath_worker.hmac_auth import MAX_BODY_BYTES, REPLAY_WINDOW_S, HmacSecrets, sign
from polymath_worker.logging_config import REDACTED, configure_logging
from polymath_worker.main import create_app

NOW = 1_800_000_000.0
CURRENT, PREVIOUS = "current-secret", "previous-secret"
PATH = "/grade/symbolic"
VALID = json.dumps(
    {
        "response_text": "x^2",
        "reference": "x**2",
        "spec": {"variables": ["x"], "sample_domain": {"x": [0.3, 2.5]}},
    }
).encode()


def _client(previous=PREVIOUS, expires=None, current=CURRENT):
    secrets = HmacSecrets(current=current, previous=previous, previous_expires_at=expires)
    return TestClient(create_app(secrets, clock=lambda: NOW))


def _post(client, secret, body=b"{}", ts=NOW, path=PATH, signature=None):
    t = str(int(ts))
    sig = signature if signature is not None else sign(secret, t, "POST", path, body)
    headers = {"X-Polymath-Timestamp": t, "X-Polymath-Signature": sig, "Content-Type": "application/json"}
    return client.post(path, content=body, headers=headers)


def test_healthz_is_public_and_reports_git_sha(monkeypatch):
    monkeypatch.setenv("GIT_SHA", "abc1234")
    r = _client().get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "git_sha": "abc1234"}


def test_request_without_signature_is_401():
    assert _client().post(PATH, content=b"{}").status_code == 401


def test_wrong_signature_is_401():
    assert _post(_client(), "other-secret").status_code == 401


def test_current_secret_is_accepted_and_grades_a_request():
    r = _post(_client(), CURRENT, body=VALID)
    assert r.status_code == 200
    assert r.json()["status"] == "graded"


def test_previous_secret_is_accepted_during_rotation_window():
    expires = datetime.fromtimestamp(NOW + 3600, tz=UTC)
    assert _post(_client(expires=expires), PREVIOUS, body=VALID).status_code == 200


def test_previous_secret_is_rejected_after_rotation_window():
    expires = datetime.fromtimestamp(NOW, tz=UTC) - timedelta(seconds=1)
    assert _post(_client(expires=expires), PREVIOUS).status_code == 401


def test_signature_covers_body_and_path():
    c = _client()
    sig = sign(CURRENT, str(int(NOW)), "POST", PATH, b'{"a":1}')
    assert _post(c, CURRENT, body=b'{"a":2}', signature=sig).status_code == 401
    assert _post(c, CURRENT, path="/other", signature=sig).status_code == 401


def test_timestamp_window_boundary():
    c = _client()
    assert _post(c, CURRENT, body=VALID, ts=NOW - REPLAY_WINDOW_S).status_code == 200
    assert _post(c, CURRENT, ts=NOW - REPLAY_WINDOW_S - 1).status_code == 401
    assert _post(c, CURRENT, ts=NOW + REPLAY_WINDOW_S + 1).status_code == 401


def test_without_configured_secret_everything_is_rejected():
    assert _post(_client(current=None, previous=None), CURRENT).status_code == 401


def test_body_size_cap_boundary():
    c = _client()
    # At the cap the request passes the HMAC gate (and fails body validation); one byte over is 413.
    assert _post(c, CURRENT, body=b"x" * MAX_BODY_BYTES).status_code == 422
    assert _post(c, CURRENT, body=b"x" * (MAX_BODY_BYTES + 1)).status_code == 413


def test_logs_redact_sensitive_keys(capsys):
    configure_logging("INFO")
    structlog.get_logger().info(
        "evt",
        Authorization="Bearer x",
        nested={"token": "t", "ok": 1},
        items=[{"text": "learner answer"}],
        route="/r",
    )
    line = json.loads(capsys.readouterr().out.strip().splitlines()[-1])
    assert line["Authorization"] == REDACTED
    assert line["nested"] == {"token": REDACTED, "ok": 1}
    assert line["items"] == [{"text": REDACTED}]
    assert line["route"] == "/r" and line["msg"] == "evt"


@pytest.mark.parametrize("key", ["cookie", "apikey", "password", "response", "content"])
def test_each_listed_key_is_redacted(key, capsys):
    configure_logging("INFO")
    structlog.get_logger().info("evt", **{key: "secret-value"})
    assert "secret-value" not in capsys.readouterr().out
