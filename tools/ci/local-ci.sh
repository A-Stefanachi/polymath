#!/usr/bin/env bash
# Local CI: the only CI of this repository. GitHub Actions CI was removed by the founder (00a L1,
# 4 Nov 2026); these are the jobs the deleted .github/workflows/ci.yml ran, in the same order. A pull
# request merges only after a full run passes on its head commit, with the summary pasted into the PR.
# Exit 0 only when every step passed; prints one line per step and keeps full logs in
# .autoswe/logs/local-ci/.
#
#   pnpm ci:local                             all jobs (same as bash tools/ci/local-ci.sh)
#   bash tools/ci/local-ci.sh --skip docker   skip the worker image build (slow, needs network)
#   bash tools/ci/local-ci.sh --only database run one job: typescript, secrets, python, docker, parity,
#                                             content, package-checks, database, web-db
#
# Needs Docker (local Supabase), Node 24 with pnpm, uv, Python 3.12, gitleaks and PostgreSQL 17 binaries.
# The database job runs `supabase db reset`: it wipes the local database, as CI starts from an empty one.
# One step goes beyond ci.yml: web-db runs the apps/web integration tests with REQUIRE_DB=1 (sessions,
# graph, state, pool), which CI skips because its typescript job has no database.
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 2

LOG_DIR=.autoswe/logs/local-ci
mkdir -p "$LOG_DIR"
DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
ONLY=""
SKIP=()
while (($#)); do
  case "$1" in
    --only) ONLY="${2:-}"; shift 2 ;;
    --skip) SKIP+=("${2:-}"); shift 2 ;;
    *) echo "usage: local-ci.sh [--only JOB] [--skip JOB]..." >&2; exit 2 ;;
  esac
done

failed=()
want() {
  local job=$1 s
  [[ -n "$ONLY" && "$ONLY" != "$job" ]] && return 1
  for s in "${SKIP[@]}"; do [[ "$s" == "$job" ]] && return 1; done
  return 0
}
step() {
  local name=$1; shift
  local log="$LOG_DIR/${name//[^a-zA-Z0-9_-]/_}.log" start=$SECONDS
  if bash -c "$*" >"$log" 2>&1; then
    printf 'PASS %-34s %4ss\n' "$name" $((SECONDS - start))
  else
    printf 'FAIL %-34s %4ss  (%s)\n' "$name" $((SECONDS - start)) "$log"
    failed+=("$name")
  fi
}

step install "pnpm install --frozen-lockfile"

if want typescript; then
  step api-types-current "pnpm gen:api-types && git diff --exit-code packages/shared-types apps/web/src/lib/api/openapi.gen.ts"
  step events-current "pnpm gen:events && git diff --exit-code packages/shared-types"
  step lint "pnpm -w lint"
  step boundaries "pnpm lint:boundaries"
  step claims "pnpm claims:lint"
  step typecheck "pnpm -w typecheck"
  step vitest "pnpm -w test"
fi

if want secrets; then
  step gitleaks "bash tools/ci/secrets-check.sh"
fi

if want python; then
  step ruff "uvx ruff@0.16.9 check services tools --extend-exclude tools/boundaries/fixtures && uvx ruff@0.16.9 format --check services tools --extend-exclude tools/boundaries/fixtures"
  step service-tests "bash tools/ci/service-tests.sh"
fi

if want content; then
  # BL-0052: G2 fuzz of every template (about 20 s); CI caps it to the templates changed in the PR.
  step content-fuzz "cd services/worker && CI=true uv run --frozen python -m polymath_worker.content.fuzz_cli"
fi

if want docker; then
  step worker-image "docker build --build-arg GIT_SHA=\"\$(git rev-parse HEAD)\" -t polymath-worker:ci services/worker"
  step worker-image-runs "docker run --rm polymath-worker:ci sh -c 'test \"\$(id -un)\" = worker && command -v ngspice && python -c \"import polymath_worker.main\"'"
fi

if want parity; then
  step parity "bash tools/parity/run.sh"
fi

if want package-checks; then
  step spec-validators "bash tools/ci/spec-validators.sh"
fi

if want database || want web-db; then
  step db-start "pnpm db:start"
  step db-reset "pnpm db:reset"
fi

if want database; then
  step table-count "t=\$(psql -Atc \"select count(*) from information_schema.tables where table_schema='public'\" $DB_URL); e=\$(grep -ciE '^create table (if not exists )?public\\.' polymath-app-spec/schemas/schema.sql); echo \"\$t vs \$e\"; test \"\$t\" = \"\$e\""
  step db-diff-reference "pnpm db:diff-reference"
  step test-db "pnpm test:db"
  step test-rls "pnpm test:rls"
  step rls-mutation "bash tools/rls-mutation.sh"
  step worker-db-tests "cd services/worker && POLYMATH_TEST_DB_URL=$DB_URL uv run --frozen pytest"
  step db-types-current "pnpm gen:db-types && git diff --exit-code packages/shared-types"
  step content-schema-db "REQUIRE_DB=1 pnpm --filter @polymath/content-schema test"
  step e2e-auth "pnpm e2e:auth"
  step content-sync-db "REQUIRE_DB=1 POLYMATH_TEST_DB_URL=$DB_URL pnpm --filter @polymath/content-sync test"
fi

if want web-db; then
  step web-db-tests "cd apps/web && REQUIRE_DB=1 POLYMATH_TEST_DB_URL=$DB_URL pnpm exec vitest run"
fi

if ((${#failed[@]})); then
  echo "LOCAL CI FAILED: ${failed[*]}"
  exit 1
fi
echo "LOCAL CI PASSED"
