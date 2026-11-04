# Staging deployment (BL-0029)

`.github/workflows/deploy-staging.yml` deploys every push to `main`: `supabase db push` first, then the web app through the Vercel CLI, then a check that `/api/v1/health` reports the deployed commit. Until the settings below exist, the workflow skips with a warning that names what is missing. The worker runs on the founder's laptop in queue-only mode (00a I2).

## Status (4 Nov 2026)

Done by the build agent at the founder's request, through the Supabase management API and the Vercel API:

| Step | State |
|---|---|
| Vercel project `polymath-staging` (`prj_V4X4YQyEAAML9eCNq1TfMWFp1gSo`, team `team_Y74kNTf8YPBhmXG1kUhQUQQ4`), root `apps/web`, Next.js, Node 24.x, functions in `lhr1` | done |
| Vercel environment variables (production and preview targets): `APP_ENV`, `LLM_PROVIDER=fake`, `AUTH_SIGNUP_ENABLED=true`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` and `DATABASE_URL_PRIVILEGED` (transaction pooler, port 6543), the last two as sensitive | done |
| Staging URL https://polymath-staging.vercel.app; `/api/v1/health` returns 200 with `db: ok` and `version` equal to the deployed commit | done |
| Migrations applied to staging (3), recorded in `supabase_migrations.schema_migrations` as the CLI does, so `supabase db push` treats them as applied | done |
| Auth: OTP length 6, expiry 900 s, site URL and the redirect `https://polymath-staging.vercel.app/auth/callback`, phone and anonymous sign-in off; signup on until the founder's account exists | done |
| Legacy `anon` and `service_role` JWT keys disabled | done |
| OA-9 / ST-RLS-19 probe on staging (`infra/VERIFIED.md`) | done |
| Custom email templates (six-digit code in the email) | blocked: the Free plan refuses template changes with the built-in mailer. Needs custom SMTP (step 3 below). Until then staging sends Supabase's default email: a link only, which signs in in the browser that requested it (`/auth/callback?code=...`) |
| GitHub environment `staging` (secrets for the deploy workflow) | open: no tool in the agent session can write repository secrets. Until it exists, deploy-staging skips and staging is deployed with `vercel deploy --prod` from a checkout |

Parked by the founder (4 Nov 2026): custom SMTP with the email templates, and the GitHub environment for automatic deploys. Until they are picked up, the build agent deploys staging by hand after each merge: new migrations through the management API (recorded in `supabase_migrations.schema_migrations`), then `vercel deploy --prod` from a `git archive` of the commit, then the `/api/v1/health` version check. No sign-in emails are needed for now. Left for the founder later: the GitHub environment (step 2), custom SMTP and then the templates (step 3), and the iPhone check (`infra/VERIFIED.md`). Once the founder's account exists, set `AUTH_SIGNUP_ENABLED` to `false` on Vercel and turn off "Allow new users to sign up" in Supabase.

## One-time setup (founder)

### 1. Vercel project

In Vercel (account `a-stefanachi`), create a project from this repository with:
- root directory `apps/web` and framework Next.js;
- region `lhr1` (London, to match Supabase `eu-west-2`).

Do not connect the GitHub app: deploys come from the workflow. Then, under Project → Settings → Environment Variables, set for the Preview environment (staging):

| Name | Value |
|---|---|
| `APP_ENV` | `staging` |
| `NEXT_PUBLIC_SUPABASE_URL` | the staging project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the staging `sb_publishable_...` key |
| `SUPABASE_SECRET_KEY` | the staging `sb_secret_...` key (sensitive) |
| `DATABASE_URL_PRIVILEGED` | the transaction pooler URL (sensitive) |
| `LLM_PROVIDER` | `fake` until the tutor tasks |

Leave `WORKER_URL` unset (queue-only, 00a I2). Note the project's Org ID and Project ID (Settings → General), and the staging domain you assign.

### 2. GitHub environment `staging`

Repository → Settings → Environments → New environment `staging`. Optionally restrict deployments to `main`.

| Kind | Name | Value |
|---|---|---|
| secret | `SUPABASE_ACCESS_TOKEN` | a Supabase personal access token |
| secret | `SUPABASE_DB_PASSWORD` | the staging database password |
| secret | `VERCEL_TOKEN` | a Vercel token scoped to the project |
| variable | `SUPABASE_PROJECT_REF` | `iwmomsuoozqcffltvdgz` |
| variable | `VERCEL_ORG_ID` | `team_Y74kNTf8YPBhmXG1kUhQUQQ4` |
| variable | `VERCEL_PROJECT_ID` | `prj_V4X4YQyEAAML9eCNq1TfMWFp1gSo` |
| variable | `STAGING_URL` | `https://polymath-staging.vercel.app` |

### 3. Supabase staging settings

In Project Settings:
- **API Keys:** use the publishable and secret keys only, and disable the legacy `anon` and `service_role` JWT keys.
- **Auth:** email OTP length 6, expiry 900 s. Add the site URL and the redirect `https://<staging>/auth/callback`. Turn "Allow new users to sign up" off once the founder's account exists.

### 4. First run and checks

1. Run the workflow (Actions → deploy-staging → Run workflow), or merge to `main`.
2. Run `supabase/probes/oa9_rls19.sh staging` once, with SQL access to staging, and fill in the staging rows of `infra/VERIFIED.md` (OA-9, ST-RLS-19).
3. `curl https://<staging>/api/v1/health` returns 200 with `git_sha` equal to the deployed commit (BL-0029 acceptance 1).

## Laptop worker (queue-only)

With Docker Desktop (WSL2 on Windows), in the repository root:

```bash
cp .env.example .env    # then fill DATABASE_URL_PRIVILEGED (session pooler) and GIT_SHA; never commit .env
docker compose up worker
```

The worker opens only outbound connections, so the laptop exposes no port. It writes the heartbeat row every 5 minutes, which `/health` reports as `worker_heartbeat_age_s`. A symbolic submit returns 202 pending and is graded when the laptop worker claims it (00a I2).
