"""BL-0016 acceptance: two worker processes, every job handled exactly once; SIGTERM drains."""

from __future__ import annotations

import signal
from collections import Counter
from collections.abc import Callable
from pathlib import Path

from queue_support import Db, handled_ids, start_worker, statuses, wait_until


def test_twenty_jobs_two_workers_each_handled_exactly_once(
    database_url: str, db: Db, enqueue: Callable[..., list[str]], tmp_path: Path
) -> None:
    ids = enqueue(20)
    workers = [start_worker(database_url, tmp_path, "fast") for _ in range(2)]
    try:
        wait_until(lambda: all(s == "succeeded" for s, _ in statuses(db, ids).values()))
    finally:
        for w in workers:
            w.send_signal(signal.SIGTERM)
        codes = [w.wait(timeout=30) for w in workers]
    assert codes == [0, 0]
    counts = Counter(handled_ids(tmp_path))
    assert {i: counts[i] for i in ids} == dict.fromkeys(ids, 1)
    assert all(attempts == 1 for _, attempts in statuses(db, ids).values())


def test_sigterm_lets_a_running_handler_finish_before_exit(
    database_url: str, db: Db, enqueue: Callable[..., list[str]], tmp_path: Path
) -> None:
    ids = enqueue(1)
    worker = start_worker(database_url, tmp_path, "slow")
    try:
        wait_until(lambda: statuses(db, ids)[ids[0]][0] == "running")
    finally:
        worker.send_signal(signal.SIGTERM)
        code = worker.wait(timeout=30)
    assert code == 0
    assert statuses(db, ids)[ids[0]] == ("succeeded", 1)
    assert handled_ids(tmp_path) == ids
