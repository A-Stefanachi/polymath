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
| Staging, real iPhone, Safari | 2026-11-04 | holds: the founder signed in on their iPhone with the sign-in email (reported by the founder; the server session was created at 02:53 UTC through the server-side verify). Not recorded separately: inbox or junk, delivery time, code or link, autofill versus paste and the installed app (step 5); add a row when those are checked |

Installed app (BL-0063, OA-7): the manifest, icons and service worker are in place and pass Chromium's installability check in CI, but the iPhone Home Screen check below is still the founder's. Open it in f-dogfood-m1: after step 5, sign out inside the installed app, enter a newly emailed code there, close the app fully, relaunch it from the Home Screen and record whether the session persists.

| Environment | Date | Result |
|---|---|---|
| Staging, real iPhone, installed on the Home Screen | not yet run | pending: sign out, code sign-in in the installed app, session after relaunch |

Steps (staging, a real inbox on custom SMTP):
1. On the iPhone open `/welcome` of the staging app in Safari. Enter the founder's email and tap "Email me a code".
2. Open the email in the Mail app. Note whether it arrived in the inbox or in junk, and how long it took.
3. Return to Safari. Tap the code field: iOS should offer the code above the keyboard. Tap it (autofill), or copy the code in Mail and paste it. Tap "Sign in". Expect the app at `/`.
4. Sign out (clear site data), request a new code, and this time tap the link in the email. Expect to be signed in at `/`.
5. Add to Home Screen and repeat step 3 inside the installed app (the link may open in Safari instead; that is expected, the code path is the one that must work). Record the result of each step here.

## ts-fsrs licence, version and API (BL-0040, OA-3, 00a B7/G11/H3)

Assumption: `ts-fsrs` is permissively licensed, a 6.x release implements FSRS-6 with 21 weights, and the adapter can schedule a card from a rating, the review time and a desired retention. Checked with `npm view` and by reading the published tarballs (no library code was run).

| Date | Version | Licence id | FSRS-6 default weights | Published | Result |
|---|---|---|---|---|---|
| 2026-11-04 | `ts-fsrs` 6.0.0 (npm `latest`, integrity `sha512-kX03GIEhXgBtUrgZuv7k7Aax8oYF3GCO0lASqJFw/8cvvI7qjE83J8IzFhHugux7//W0yquG7zidk3e9NRgEwg==`) | MIT (tarball `LICENSE` identical to 5.4.2; copyright Open Spaced Repetition) | 21 (5.4.2 lists 21 `default_w` values, the last being the decay 0.1542; 6.0.0 has a `models/fsrs-6` entry and `FSRS6_DECAY = 0.1542`) | 2026-10-28 | licence and model confirmed |

Facts for the adapter (BL-0041):
- 6.0.0 requires Node 24 or later; its only dependency is `@open-spaced-repetition/srs-kit` 1.0.0 (BSD-3-Clause).
- The new API is the asynchronous `DefaultScheduler(options)` factory with `newCard`, `preview`, `review({ card, grade, now })` returning `{ card, revlog }`, `retrievability`, `nextInterval`, camelCase fields. It **defaults to FSRS-7** (34 weights, fractional-day intervals). The adapter must pass `version: 'FSRS-6'`, and the contract test must assert the model name (`scheduler.definition.model.name`), 21 weights and whole-day intervals (00a H3). The exact option names for desired retention and short-term mode must be read from the installed typings in BL-0041 before `FsrsPort` is frozen.
- `Card.elapsed_days` is removed in 6.0.0: elapsed time derives from `last_review` and the review time, so the adapter passes `now` explicitly (no clock inside `packages/scheduler`).
- The legacy `fsrs()` / `FSRS` facade is deprecated but remains (FSRS-6, `request_retention`, `enable_short_term`, `enable_fuzz`); the adapter does not use it.
- 5.4.2 (2026-09-01) also implements FSRS-6, but 00a G11 requires 6.x, so it is not chosen.

Decision: pin `ts-fsrs` exactly to 6.0.0 (no caret) when BL-0041 adds the dependency. 6.0.0 was published on 2026-10-28, so it reaches the two-week age rule on 2026-11-11; BL-0041 should not add it earlier unless the founder waives the rule. This task did not add it to `packages/scheduler/package.json` (it asks only for the notice and this record). If the licence or API becomes unsuitable, implement FSRS-6 from the published algorithm behind the same adapter (BL-0040 risk note). Founder confirms in the PR.
