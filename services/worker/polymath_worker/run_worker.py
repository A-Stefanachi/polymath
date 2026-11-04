"""Worker process entry point: `python -m polymath_worker.run_worker`.

Connects with DATABASE_URL_PRIVILEGED (a direct URL, doc 03 section 9.1), runs the loop of `job_queue` and
drains on SIGTERM or SIGINT. Handler tasks register their kinds in `build_registry` (so far: pregenerate_items, BL-0017;
content_postprocess, the G2 fuzz run after content:sync, BL-0032).
"""

from __future__ import annotations

import asyncio
import os
import signal

from polymath_worker import postprocess, pregenerate
from polymath_worker.job_queue import HandlerRegistry, Worker
from polymath_worker.logging_config import configure_logging


def build_registry(url: str | None = None) -> HandlerRegistry:
    registry = HandlerRegistry()
    registry.register("pregenerate_items", pregenerate.handler_for_url(url or database_url()))
    registry.register("content_postprocess", postprocess.handler_for_url(url or database_url()))
    return registry


def database_url() -> str:
    url = os.environ.get("DATABASE_URL_PRIVILEGED", "")
    if not url:
        raise SystemExit("DATABASE_URL_PRIVILEGED is not set")
    return url


async def run(worker: Worker) -> None:
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, worker.request_stop)
    await worker.run()


def main() -> None:
    configure_logging(os.environ.get("LOG_LEVEL", "INFO"))
    url = database_url()
    asyncio.run(run(Worker(url, build_registry(url))))


if __name__ == "__main__":
    main()
