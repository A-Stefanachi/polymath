# Verified vendor behaviour

Facts about vendors that the code relies on, each with how and when it was checked (doc 03 section 15, OA-1 to OA-9). A row says "pending" until it has been checked on the environment it names.

## OA-9: Supabase API keys map to Postgres roles (BL-0007)

Assumption: a secret key (`sb_secret_...`) runs as the `service_role` Postgres role and a publishable key (`sb_publishable_...`) runs as `anon`; `public.is_service_role()` returns true only for the former. Probe: `supabase/probes/oa9_rls19.sh` (creates two temporary objects, calls them through the Data API with each key, drops them).

| Environment | Date | Publishable key | Secret key | Result |
|---|---|---|---|---|
| Local (Supabase CLI 2.121.0, Postgres 17.11) | 2026-11-03 | `current_user` anon, `auth.role()` anon, `is_service_role()` false | `current_user` service_role, `auth.role()` service_role, `is_service_role()` true | holds |
| Staging (`iwmomsuoozqcffltvdgz`, Postgres 17.11) | pending | | | pending: the probe writes two temporary objects to staging, which this agent session was not permitted to do. Run `supabase/probes/oa9_rls19.sh staging` from a session or machine allowed to write to staging, and fill in this row |

`auth.role()` returned `service_role` for the secret key locally, so both branches of `is_service_role()` agree; the `current_user` check stays as the guard the doc calls for.

## ST-RLS-19: a table with no GRANT is not reachable through the Data API (BL-0007)

| Environment | Date | Publishable key | Secret key | Result |
|---|---|---|---|---|
| Local, `auto_expose_new_tables = false` | 2026-11-03 | 42501 "permission denied for table zz_rls19_probe" (HTTP 401) | 42501 (HTTP 403) | holds |
| Staging | pending | | | pending, same probe as above |

## Postgres major version (BL-0007)

| Environment | Date | `select version()` |
|---|---|---|
| Local | 2026-11-03 | PostgreSQL 17.11 on x86_64-pc-linux-gnu |
| Staging | 2026-11-03 | PostgreSQL 17.11 on x86_64-pc-linux-gnu (read-only query through the management API) |
