---
paths:
  - "supabase/migrations/**"
  - "**/migrations/**"
  - "**/alembic/**"
  - "**/db/migrate/**"
  - "**/prisma/**"
  - "**/*.sql"
  - "**/models.py"
  - "**/models/**"
---

# Database migrations (PostgreSQL)

Old code keeps running while and after a migration runs: the previous API version during a deploy, workers deployed on their own schedule, clients that are never force-upgraded. A migration is safe only when every version still running keeps working against the new schema.

- Safe while old code runs: add a nullable column; add a column with a constant default; `CREATE INDEX CONCURRENTLY` (outside a transaction; in Alembic, `op.get_context().autocommit_block()`); a trigger that keeps an old and a new column in sync; a `CHECK ... NOT VALID` constraint followed by a separate `VALIDATE CONSTRAINT`.
- Not safe while old code runs:
  - `ALTER COLUMN ... TYPE`, widening a `varchar` included: other sessions' prepared statements on that table fail once with "cached plan must not change result type", and most type changes rewrite the table under an exclusive lock;
  - renaming a column or table;
  - `SET NOT NULL` without a validated `CHECK (col IS NOT NULL)` first (it scans the table under an exclusive lock);
  - dropping anything old code still reads or writes;
  - a volatile default (`now()`, `random()`), which rewrites the table.
- To change a column's type, size or meaning: add a new column, keep both in sync (a trigger, or writes to both), backfill, move readers to the new column, and drop the old one in a later release. A feature builds only the step the request asks for.
- Follow a changed value to every place it is copied or read: other services' and workers' raw SQL, views, triggers, reports, and the size of every column it is copied into (an invoice that snapshots a customer name).
- Backfill in bounded batches, each in its own transaction, never one `UPDATE` over a large table.
- Set a `lock_timeout` on DDL, so a migration waiting for a lock doesn't stall every query queued behind it.
- A migration never terminates or cancels other sessions (`pg_terminate_backend`, `pg_cancel_backend`): those sessions are the old code serving users.
