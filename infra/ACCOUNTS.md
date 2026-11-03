# Accounts and services (BL-0001)

No secrets in this file: keys, passwords and tokens live only in each provider's secret store, the cloud environment's network secrets, the founder's untracked `.env`, and later GitHub Actions and Vercel secrets (doc 03 section 9.2).

Data region: **`eu-west-2` (London)**, chosen by the founder on 3 Nov 2026 "for the moment" (OQ-02, see `polymath-app-spec/docs/CHANGELOG.md`). It is a UK jurisdiction, not the EU. Revisit before the founder's study history grows or before any beta learner has an account.

| Service | Purpose | Plan | Region | Status | Verified on | Notes |
|---|---|---|---|---|---|---|
| GitHub | Repository `A-Stefanachi/polymath` | n/a | n/a | done | 2026-11-03 | |
| Supabase | Staging project `Polymath` (ref `iwmomsuoozqcffltvdgz`) | Free | eu-west-2 (London) | done | 2026-11-03 | Postgres 17.11, status healthy (management API). Dashboard labels the default branch "production"; in the spec it is staging. Free plan: pauses after a week idle, no backups (BL-0103 weekly `pg_dump`) |
| OpenRouter | LLM provider (00a I1) | Paid, $50 monthly key limit | n/a | done | 2026-11-03 | Strong `deepseek/deepseek-v4.1-flash`, cheap `z-ai/glm-5.3-flash`; requests set `data_collection: "deny"` |
| Vercel | Web app staging | Hobby (founder-only use; OA-4) | functions to match Supabase (lhr1, to check at BL-0029) | account done; project at BL-0029 | 2026-11-03 | Account `a-stefanachi`; token checked with a read-only API call. GitHub app not installed: deploys go through `deploy-staging.yml` (BL-0029) |
| Worker host | Python worker | Founder's laptop, queue-only (00a I2) | n/a | open | | Docker Desktop with WSL2; Fly or Cloud Run before D1 |
| Domain and DNS | Staging URL, mail sender | | | optional | | |
| SMTP provider | Supabase Auth sign-in mails | | | optional | | Needed before sign-in mails on staging |

## Where each value is kept

| Name | Kept in | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cloud environment variables; later Vercel | No |
| Supabase management token | Cloud environment network secret for `api.supabase.com` | Yes |
| Vercel token | Cloud environment network secret for `api.vercel.com`; at BL-0029 also GitHub `staging` environment as `VERCEL_TOKEN` | Yes |
| OpenRouter key | Cloud environment network secret for `openrouter.ai` | Yes |
| `SUPABASE_SECRET_KEY`, `DATABASE_URL_PRIVILEGED` (session pooler) | Cloud environment variables (founder's choice, single-user account; never printed or committed), founder's laptop `.env` (untracked); later GitHub `staging` environment and Vercel (transaction pooler for Vercel) | Yes |

Note (3 Nov 2026): the cloud session cannot open raw TCP connections, so `DATABASE_URL_PRIVILEGED` does not work from there (port 5432 times out). From the cloud session, staging SQL runs through the Supabase management API; the laptop worker and Vercel use the connection string.
