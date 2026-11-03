"""Structured JSON logging with redaction (doc 03 section 10.2).

Keys named authorization, cookie, token, apikey, password, response, content or text are replaced
before any line is rendered, at any nesting depth, so a handler cannot log learner free text or a
credential by accident (CLAUDE.md rule 2.5).
"""

from __future__ import annotations

import logging
import os
from collections.abc import Mapping, MutableMapping, Sequence
from typing import Any

import structlog

REDACTED = "[redacted]"
REDACTED_KEYS = frozenset(
    {"authorization", "cookie", "token", "apikey", "password", "response", "content", "text"}
)


def _redact(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {k: REDACTED if str(k).lower() in REDACTED_KEYS else _redact(v) for k, v in value.items()}
    if isinstance(value, Sequence) and not isinstance(value, str | bytes | bytearray):
        return [_redact(v) for v in value]
    return value


def redact_processor(
    _logger: Any, _method: str, event_dict: MutableMapping[str, Any]
) -> MutableMapping[str, Any]:
    return _redact(event_dict)  # type: ignore[no-any-return]


def configure_logging(level: str = "INFO") -> None:
    logging.basicConfig(format="%(message)s", level=level.upper(), force=True)
    git_sha = os.environ.get("GIT_SHA", "unknown")
    env = os.environ.get("APP_ENV", "local")

    def add_static(_l: Any, _m: str, event_dict: MutableMapping[str, Any]) -> MutableMapping[str, Any]:
        event_dict.setdefault("git_sha", git_sha)
        event_dict.setdefault("env", env)
        return event_dict

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True, key="ts"),
            add_static,
            redact_processor,
            structlog.processors.EventRenamer("msg"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.getLevelName(level.upper())),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=False,
    )
