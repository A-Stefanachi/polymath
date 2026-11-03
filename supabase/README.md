# Supabase

Local database, auth and storage for development and tests (BL-0007; doc 03 section 9). The CLI is a pinned dev dependency (`supabase` 2.121.0), so every command runs through pnpm.

## Local

Needs Docker.

```bash
pnpm db:start     # supabase start: Postgres 17, auth, REST, storage and the mail catcher
pnpm db:reset     # re-create the database from supabase/migrations and seed.sql
pnpm db:stop
```

`pnpm exec supabase status` prints the local URLs and keys. They are the CLI's fixed local development keys, not secrets, but keep them out of commits anyway (gitleaks flags them).

Settings that differ from the CLI defaults (`config.toml`):

- `auto_expose_new_tables = false`: like the cloud projects, a new `public` table is reachable through the Data API only after an explicit `GRANT` (CLAUDE.md section 9, ST-RLS-19).
- Email-only sign-in with a six-digit code that expires after 15 minutes (`otp_length = 6`, `otp_expiry = 900`); phone, anonymous and external providers are off.

## Staging

Project `iwmomsuoozqcffltvdgz` in `eu-west-2` (`infra/ACCOUNTS.md`). Link the CLI once per machine and push migrations:

```bash
pnpm exec supabase login                      # or SUPABASE_ACCESS_TOKEN in the environment
pnpm exec supabase link --project-ref iwmomsuoozqcffltvdgz
pnpm exec supabase db push                    # applies supabase/migrations not yet applied
```

Staging uses the publishable and secret keys only; the legacy `anon` and `service_role` JWT keys are disabled in the dashboard (Project Settings → API Keys). Set "Allow new users to sign up" off once the founder's account exists. Check the key-to-role mapping with `supabase/probes/oa9_rls19.sh staging` and record the result in `infra/VERIFIED.md`.

Every migration carries an explicit `GRANT` for each new table, sequence and function, and a function first gets `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` (CLAUDE.md section 9).

## Email sign-in (BL-0021)

The app signs a learner in with a six-digit code (primary) or the link in the same email. One template carries both: `supabase/templates/magic_link.html` (existing users) and `confirmation.html` (first sign-in), referenced from `[auth.email.template.*]` in `config.toml`. The link goes to the app's `/auth/callback` with the token hash on `{{ .SiteURL }}`, so `site_url` must be the app's real origin in each environment. Local mail is read at the Mailpit UI, http://127.0.0.1:54324 (API `/api/v1/search?query=to:<address>`).

A template change in `config.toml` reaches the local auth container only through `supabase stop` and `supabase start` (the CLI hands templates to the container at creation). On staging, paste both templates in the dashboard (Authentication, Email Templates) and set the subject "Your Polymath sign-in code"; `supabase config push` also applies them.

Signup toggle: the app reads `AUTH_SIGNUP_ENABLED` ("true" lets an unknown email create an account). Switch the dashboard setting "Allow new users to sign up" in step: both off once the founder's account exists.

### Custom SMTP (staging and production)

Supabase's built-in mailer is for tests only (a few emails an hour, team addresses only). Before the iPhone check set a real provider in the dashboard (Authentication, Emails, SMTP Settings); the secret stays in the dashboard, never in this repository:

1. Provider with SMTP and a verified sending domain (SPF, DKIM and DMARC records published); sender such as `sign-in@<domain>`, sender name "Polymath".
2. Host, port (587 STARTTLS or 465), user and password from the provider into the dashboard fields.
3. Raise "Rate Limits, emails sent per hour" above the default 30 only as far as needed; keep OTP expiry at 900 s and length 6 (`config.toml` mirrors both).
4. Send a code to a real inbox (Gmail and iCloud); check it is not in junk, that the code and the link both show, and record timing and result in `infra/VERIFIED.md`.

Per-IP limits: sign-in requests reach GoTrue from the app server, so GoTrue's per-IP limits (`sign_in_sign_ups`, `token_verifications`) count the server's address, not the learner's. Fine for the founder alone; revisit before beta learners (an app-level per-IP and per-email limit, BL for rate limits).
