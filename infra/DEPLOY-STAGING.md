# Staging deployment (BL-0029)

`.github/workflows/deploy-staging.yml` deploys every push to `main`: `supabase db push` first, then the web app through the Vercel CLI, then a check that `/api/v1/health` reports the deployed commit. Until the settings below exist, the workflow skips with a warning that names what is missing. The worker runs on the founder's laptop in queue-only mode (00a I2).

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
| variable | `VERCEL_ORG_ID` | from step 1 |
| variable | `VERCEL_PROJECT_ID` | from step 1 |
| variable | `STAGING_URL` | for example `https://polymath-staging.vercel.app` |

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
