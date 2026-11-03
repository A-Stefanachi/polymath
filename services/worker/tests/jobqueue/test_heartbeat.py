"""00a I3: a running worker writes the one heartbeat row that GET /health reads (doc 03 sections 8.4, 8.6)."""

from __future__ import annotations

import signal
from pathlib import Path

from queue_support import Db, start_worker, wait_until


def test_worker_writes_the_heartbeat_row_at_start(database_url: str, db: Db, tmp_path: Path) -> None:
    # Make the row stale first, so only a fresh beat from the worker can satisfy the check.
    db.execute("select app_private.record_worker_heartbeat('bl-i3-stale', null)")
    db.execute("update app_private.worker_heartbeat set beat_at = now() - interval '1 hour'")
    assert db.execute("select app_private.worker_heartbeat_age_s()")[0][0] >= 3599

    worker = start_worker(database_url, tmp_path, "fast")
    try:
        wait_until(lambda: (db.execute("select app_private.worker_heartbeat_age_s()")[0][0] or 9999) < 60)
    finally:
        worker.send_signal(signal.SIGTERM)
        assert worker.wait(timeout=30) == 0

    rows = db.execute("select count(*), max(worker_id) from app_private.worker_heartbeat")
    assert rows[0][0] == 1
    assert rows[0][1] != "bl-i3-stale"
