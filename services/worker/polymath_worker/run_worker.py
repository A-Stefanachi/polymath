"""Worker process entry point: `python -m polymath_worker.run_worker`.

Connects with DATABASE_URL_PRIVILEGED (a direct URL, doc 03 section 9.1), runs the loop of `job_queue` and
drains on SIGTERM or SIGINT. The handler registry is empty until handler tasks (grading, verification, ...)
register their kinds in `build_registry`.
"""

from __future__ import annotations

import asyncio
import os
import signal

from polymath_worker.job_queue import HandlerRegistry, Worker
from polymath_worker.logging_config import configure_logging


def build_registry() -> HandlerRegistry:
    return HandlerRegistry()


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
    asyncio.run(run(Worker(database_url(), build_registry())))


if __name__ == "__main__":
    main()
