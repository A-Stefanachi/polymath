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
