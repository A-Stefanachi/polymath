"""A real worker process for the queue tests: `python worker_proc.py <out_dir> <mode>`.

The database URL comes from POLYMATH_TEST_DB_URL, set explicitly by the test; this script never reads
DATABASE_URL_PRIVILEGED. It registers one test handler for `sweep_storage` and appends the job id to
`<out_dir>/handled.log` each time the handler finishes its effect, so a test can count how often a job was
handled. Modes:
  fast        finish after 50 ms
  slow        finish after 1.5 s (SIGTERM drain test)
  hang_first  attempt 1 touches `<out_dir>/started-<id>` and then blocks forever (to be killed with SIGKILL);
              later attempts finish at once
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

from polymath_worker.job_queue import HandlerRegistry, JobRow, Worker
from polymath_worker.logging_config import configure_logging
from polymath_worker.run_worker import run


def main() -> None:
    out_dir = Path(sys.argv[1])
    mode = sys.argv[2]
    configure_logging("WARNING")

    async def handle(job: JobRow) -> dict[str, str]:
        if mode == "hang_first" and job.attempts == 1:
            (out_dir / f"started-{job.id}").write_text(str(os.getpid()))
            await asyncio.Event().wait()
        await asyncio.sleep(1.5 if mode == "slow" else 0.05)
        fd = os.open(out_dir / "handled.log", os.O_WRONLY | os.O_APPEND | os.O_CREAT)
        try:
            os.write(fd, f"{job.id}\n".encode())
        finally:
            os.close(fd)
        return {"handled_by_pid": str(os.getpid())}

    registry = HandlerRegistry()
    registry.register("sweep_storage", handle, limit=3)
    url = os.environ["POLYMATH_TEST_DB_URL"]
    worker = Worker(url, registry, poll_busy_s=0.05, poll_idle_max_s=0.2, drain_timeout_s=10)
    asyncio.run(run(worker))


if __name__ == "__main__":
    main()
