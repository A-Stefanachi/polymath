"""BL-0016 acceptance: kill -9 mid-handler; the job returns to queued after lease expiry and completes once.

Lease expiry is forced, not waited for: the minimum `timeout_s` of the jobs check is 5 s, so the real lease
is `2 * 5 + 30 = 40 s`. The test moves `locked_at` 60 s into the past and calls `requeue_stale_jobs()`, which
is the same code path the worker's 30 s ticker runs, without a 40 s sleep in the suite.
"""

from __future__ import annotations

import signal
from collections.abc import Callable
from pathlib import Path

from queue_support import Db, handled_ids, start_worker, statuses, wait_until


def test_killed_worker_job_is_requeued_after_lease_expiry_and_completes_once(
    database_url: str, db: Db, enqueue: Callable[..., list[str]], tmp_path: Path
) -> None:
    (job_id,) = enqueue(1, timeout_s=5)
    first = start_worker(database_url, tmp_path, "hang_first")
    try:
        wait_until(lambda: (tmp_path / f"started-{job_id}").exists())
    finally:
        first.send_signal(signal.SIGKILL)
        first.wait(timeout=10)
    assert statuses(db, [job_id])[job_id] == ("running", 1)

    # Lease not expired yet: a requeue pass leaves the job alone.
    db.execute("select public.requeue_stale_jobs()")
    assert statuses(db, [job_id])[job_id] == ("running", 1)

    db.execute("update public.jobs set locked_at = now() - interval '60 seconds' where id = %s", (job_id,))
    db.execute("select public.requeue_stale_jobs()")
    assert statuses(db, [job_id])[job_id] == ("queued", 1)

    second = start_worker(database_url, tmp_path, "hang_first")
    try:
        wait_until(lambda: statuses(db, [job_id])[job_id][0] == "succeeded")
    finally:
        second.send_signal(signal.SIGTERM)
        second.wait(timeout=30)
    assert statuses(db, [job_id])[job_id] == ("succeeded", 2)
    assert handled_ids(tmp_path) == [job_id]
