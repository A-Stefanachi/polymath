#!/usr/bin/env bash
# pnpm test:rls (BL-0011, BL-0012): the RLS suite under supabase/tests/rls against the running local stack.
# 1. Prints every TAP line (one per ST-RLS id check) by running each file through psql, because
#    `supabase test db` (pg_prove) only prints a summary when everything passes.
# 2. Runs the authoritative `supabase test db supabase/tests/rls` (pg_prove in the CLI container).
# Each file is one transaction that ends in rollback, so the database is left as it was found.
set -euo pipefail
cd "$(dirname "$0")/.."

DB_URL="${RLS_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"  # fixed local CLI credentials, not a secret
status=0
total=0
for f in supabase/tests/rls/*.sql; do
  echo "# $f"
  out="$(psql -X -q -At -v ON_ERROR_STOP=0 "$DB_URL" -f "$f" 2>&1)" || status=1
  echo "$out" | grep -E '^(ok|not ok|# (Failed|Looks like|caught|wanted|have|want))|ERROR' || true
  planned="$(echo "$out" | sed -n 's/^1\.\.\([0-9]*\)$/\1/p' | head -1)"
  ran="$(echo "$out" | grep -cE '^(not )?ok ' || true)"
  failed="$(echo "$out" | grep -E '^not ok ' | grep -vc '# TODO' || true)"
  total=$((total + ran))
  if [ "$planned" != "$ran" ] || [ "$failed" != "0" ] || echo "$out" | grep -q 'ERROR'; then
    echo "FAILED: $f (planned ${planned:-none}, ran $ran, failed $failed)"
    status=1
  fi
done
echo "# $total checks run"
[ "$status" = 0 ] || exit 1
exec pnpm exec supabase test db supabase/tests/rls
