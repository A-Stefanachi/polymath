"""HMAC request signing with two-secret rotation (doc 03 sections 4.3 and 9).

Signed string: ``timestamp + "." + method + "." + path + "." + body`` (UTF-8), HMAC-SHA256, hex digest.
Headers: ``X-Polymath-Timestamp`` (unix seconds) and ``X-Polymath-Signature``. The docs fix a 60 s
replay window (doc 03 section 4.3) but not the header names or the signed string; those are this
task's choice and the web client (BL-0054) must match them.

Rotation: ``WORKER_HMAC_SECRET`` is current; ``WORKER_HMAC_SECRET_PREVIOUS`` is also accepted until
``WORKER_HMAC_SECRET_PREVIOUS_EXPIRES_AT`` (ISO 8601, optional; the operator sets it 24 h after the
switch and removes the variable afterwards). With no current secret the service rejects everything.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from starlette.types import ASGIApp, Message, Receive, Scope, Send

TIMESTAMP_HEADER = b"x-polymath-timestamp"
SIGNATURE_HEADER = b"x-polymath-signature"
REPLAY_WINDOW_S = 60
MAX_BODY_BYTES = 64 * 1024
PUBLIC_PATHS = frozenset({"/healthz"})


@dataclass(frozen=True)
class HmacSecrets:
    current: str | None
    previous: str | None = None
    previous_expires_at: datetime | None = None

    @classmethod
    def from_env(cls, env: dict[str, str]) -> HmacSecrets:
        expires = env.get("WORKER_HMAC_SECRET_PREVIOUS_EXPIRES_AT") or None
        parsed = datetime.fromisoformat(expires) if expires else None
        if parsed is not None and parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)
        return cls(
            current=env.get("WORKER_HMAC_SECRET") or None,
            previous=env.get("WORKER_HMAC_SECRET_PREVIOUS") or None,
            previous_expires_at=parsed,
        )

    def active(self, now: float) -> list[str]:
        out = [self.current] if self.current else []
        if self.previous and (
            self.previous_expires_at is None or now <= self.previous_expires_at.timestamp()
        ):
            out.append(self.previous)
        return out


def sign(secret: str, timestamp: str, method: str, path: str, body: bytes) -> str:
    msg = f"{timestamp}.{method}.{path}.".encode() + body
    return hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()


def _deny(status: int, code: str) -> tuple[Message, Message]:
    body = json.dumps({"error": {"code": code}}).encode()
    return (
        {
            "type": "http.response.start",
            "status": status,
            "headers": [(b"content-type", b"application/json")],
        },
        {"type": "http.response.body", "body": body},
    )


class HmacMiddleware:
    def __init__(self, app: ASGIApp, secrets: HmacSecrets, clock: Callable[[], float] = time.time) -> None:
        self.app = app
        self.secrets = secrets
        self.clock = clock

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["path"] in PUBLIC_PATHS:
            await self.app(scope, receive, send)
            return
        headers = dict(scope["headers"])
        body = b""
        more = True
        while more:
            msg = await receive()
            body += msg.get("body", b"")
            more = msg.get("more_body", False)
            if len(body) > MAX_BODY_BYTES:
                for m in _deny(413, "body_too_large"):
                    await send(m)
                return
        if not self._valid(scope, headers, body):
            for m in _deny(401, "invalid_signature"):
                await send(m)
            return

        sent = False

        async def replay() -> Message:
            nonlocal sent
            if sent:
                return await receive()
            sent = True
            return {"type": "http.request", "body": body, "more_body": False}

        await self.app(scope, replay, send)

    def _valid(self, scope: Scope, headers: dict[bytes, bytes], body: bytes) -> bool:
        now = self.clock()
        secrets = self.secrets.active(now)
        ts = headers.get(TIMESTAMP_HEADER, b"").decode("latin-1")
        sig = headers.get(SIGNATURE_HEADER, b"").decode("latin-1")
        if not secrets or not ts or not sig:
            return False
        try:
            ts_val = int(ts)
        except ValueError:
            return False
        if abs(now - ts_val) > REPLAY_WINDOW_S:
            return False
        # Every candidate is compared (no early exit) so timing does not reveal which secret matched.
        results = [
            hmac.compare_digest(sign(s, ts, scope["method"], scope["path"], body), sig) for s in secrets
        ]
        return any(results)
