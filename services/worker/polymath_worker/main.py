"""FastAPI app of the worker: /healthz (public) and /grade/symbolic (HMAC-protected, BL-0054)."""

from __future__ import annotations

import asyncio
import os
import time
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, Response

from polymath_worker import symbolic_grade
from polymath_worker.hmac_auth import HmacMiddleware, HmacSecrets
from polymath_worker.logging_config import configure_logging


def create_app(
    secrets: HmacSecrets | None = None,
    clock: Callable[[], float] = time.time,
) -> FastAPI:
    configure_logging(os.environ.get("LOG_LEVEL", "INFO"))
    log = structlog.get_logger("polymath_worker")

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        # Start the symbolic grader process now so the first learner request does not pay for importing SymPy.
        await asyncio.to_thread(symbolic_grade.grader.warm_up)
        try:
            yield
        finally:
            symbolic_grade.grader.close()

    app = FastAPI(title="Polymath worker", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)

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

    app.include_router(symbolic_grade.router)

    app.add_middleware(
        HmacMiddleware,
        secrets=secrets if secrets is not None else HmacSecrets.from_env(dict(os.environ)),
        clock=clock,
    )
    return app


app = create_app()
