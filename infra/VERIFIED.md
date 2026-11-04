# Verified vendor behaviour

Facts about vendors that the code relies on, each with how and when it was checked (doc 03 section 15, OA-1 to OA-9). A row says "pending" until it has been checked on the environment it names.

## OA-9: Supabase API keys map to Postgres roles (BL-0007)

Assumption: a secret key (`sb_secret_...`) runs as the `service_role` Postgres role and a publishable key (`sb_publishable_...`) runs as `anon`; `public.is_service_role()` returns true only for the former. Probe: `supabase/probes/oa9_rls19.sh` (creates two temporary objects, calls them through the Data API with each key, drops them).

| Environment | Date | Publishable key | Secret key | Result |
|---|---|---|---|---|
| Local (Supabase CLI 2.121.0, Postgres 17.11) | 2026-11-03 | `current_user` anon, `auth.role()` anon, `is_service_role()` false | `current_user` service_role, `auth.role()` service_role, `is_service_role()` true | holds |
| Staging (`iwmomsuoozqcffltvdgz`, Postgres 17.11) | 2026-11-04 | `current_user` anon, `auth.role()` anon, `is_service_role()` false | `current_user` service_role, `auth.role()` service_role, `is_service_role()` true | holds (probe through the management API at the founder's request; `is_service_role()` grants restored to the baseline afterwards) |

`auth.role()` returned `service_role` for the secret key locally, so both branches of `is_service_role()` agree; the `current_user` check stays as the guard the doc calls for.

## ST-RLS-19: a table with no GRANT is not reachable through the Data API (BL-0007)

| Environment | Date | Publishable key | Secret key | Result |
|---|---|---|---|---|
| Local, `auto_expose_new_tables = false` | 2026-11-03 | 42501 "permission denied for table zz_rls19_probe" (HTTP 401) | 42501 (HTTP 403) | holds |
| Staging | 2026-11-04 | 42501 (HTTP 401) | 42501 (HTTP 403) | holds; the probe table was dropped |

## Postgres major version (BL-0007)

| Environment | Date | `select version()` |
|---|---|---|
| Local | 2026-11-03 | PostgreSQL 17.11 on x86_64-pc-linux-gnu |
| Staging | 2026-11-03 | PostgreSQL 17.11 on x86_64-pc-linux-gnu (read-only query through the management API) |

## Email code sign-in on a real iPhone (BL-0021, S01 AC-5)

Assumption: in Safari on iOS, the six-digit code from the sign-in email can be pasted or autofilled into the code field (`autocomplete="one-time-code"`) and signs in; the kept link opens in the browser and signs in too. The local Playwright tests cover the server side only.

| Environment | Date | Result |
|---|---|---|
| Staging, real iPhone, Safari | 2026-11-04 | holds: the founder signed in on their iPhone with the emailed code flow (reported by the founder; the server session was created at 02:53 UTC through the server-side verify). Not recorded separately: inbox or junk, delivery time, autofill versus paste, the link path (step 4) and the installed app (step 5); add a row when those are checked |

Steps (staging, a real inbox on custom SMTP):
1. On the iPhone open `/welcome` of the staging app in Safari. Enter the founder's email and tap "Email me a code".
2. Open the email in the Mail app. Note whether it arrived in the inbox or in junk, and how long it took.
3. Return to Safari. Tap the code field: iOS should offer the code above the keyboard. Tap it (autofill), or copy the code in Mail and paste it. Tap "Sign in". Expect the app at `/`.
4. Sign out (clear site data), request a new code, and this time tap the link in the email. Expect to be signed in at `/`.
5. Add to Home Screen and repeat step 3 inside the installed app (the link may open in Safari instead; that is expected, the code path is the one that must work). Record the result of each step here.
