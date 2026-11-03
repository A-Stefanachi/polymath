"""FastAPI app of the worker: /healthz (public) and /grade/symbolic (HMAC-protected stub)."""

from __future__ import annotations

import os
import time
import uuid
from collections.abc import Awaitable, Callable

import structlog
from fastapi import FastAPI, Request, Response

from polymath_worker.hmac_auth import HmacMiddleware, HmacSecrets
from polymath_worker.logging_config import configure_logging


def create_app(
    secrets: HmacSecrets | None = None,
    clock: Callable[[], float] = time.time,
) -> FastAPI:
    configure_logging(os.environ.get("LOG_LEVEL", "INFO"))
    log = structlog.get_logger("polymath_worker")
    app = FastAPI(title="Polymath worker", docs_url=None, redoc_url=None, openapi_url=None)

    @app.middleware("http")
    async def access_log(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        start = time.perf_counter()
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        response = await call_next(request)
        log.info(
            "request",
            request_id=request_id,
            route=request.url.path,
            method=request.method,
            status=response.status_code,
            duration_ms=round((time.perf_counter() - start) * 1000, 2),
        )
        return response

    @app.get("/healthz")
    async def healthz() -> dict[str, str]:
        return {"status": "ok", "git_sha": os.environ.get("GIT_SHA", "unknown")}

    @app.post("/grade/symbolic")
    async def grade_symbolic() -> dict[str, str]:
        # Stub: the SymPy grader arrives with BL-0054.
        return {"status": "not_implemented", "detail": "POST /grade/symbolic is implemented by BL-0054"}

    app.add_middleware(
        HmacMiddleware,
        secrets=secrets if secrets is not None else HmacSecrets.from_env(dict(os.environ)),
        clock=clock,
    )
    return app


app = create_app()
