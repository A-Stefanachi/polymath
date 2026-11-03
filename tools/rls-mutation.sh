#!/usr/bin/env bash
# BL-0012 mutation check: the ST-RLS tests must FAIL when the protection of `attempts` is removed.
#
# Choice: the mutation runs INSIDE the test's own transaction (psql -v rls_mutation=..., applied by the
# hook at the end of supabase/tests/rls/_helpers.psql) and the file ends in `rollback`. The shared local
# database is therefore never changed, and no scratch database or migration is needed (a template copy
# of the shared database is impossible while other sessions are connected). Cost: the ALTER/DROP POLICY
# holds a lock on public.attempts until the rollback, a fraction of a second.
#
# Usage: tools/rls-mutation.sh   (needs psql and the running local stack)
set -euo pipefail
cd "$(dirname "$0")/.."

DB_URL="${RLS_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"  # fixed local CLI credentials, not a secret
status=0

# run_mutation <mutation> <test file> <ST id that must fail>...
run_mutation() {
  local mutation="$1" file="$2"; shift 2
  local out
  out="$(psql -X -q -At -v rls_mutation="$mutation" "$DB_URL" -f "supabase/tests/rls/$file" 2>&1 || true)"
  for id in "$@"; do
    if echo "$out" | grep -E "^not ok [0-9]+ - $id:" | grep -vq '# TODO'; then
      echo "PASS: mutation '$mutation' makes $id fail in $file"
    else
      echo "FAIL: mutation '$mutation' did NOT make $id fail in $file"
      status=1
    fi
  done
}

# Control: the unmutated file is green, so any failure below is caused by the mutation.
if psql -X -q -At "$DB_URL" -f supabase/tests/rls/02_isolation.sql 2>&1 | grep -E '^not ok' | grep -vq '# TODO'; then
  echo "FAIL: control run of 02_isolation.sql is not green"; status=1
else
  echo "PASS: control run of 02_isolation.sql is green"
fi

run_mutation disable_rls 02_isolation.sql ST-RLS-03 ST-RLS-04   # RLS switched off on attempts
run_mutation open_policy 02_isolation.sql ST-RLS-03 ST-RLS-04   # select policy replaced by using (true)
run_mutation disable_rls 01_meta.sql ST-RLS-01                  # meta check sees the table without RLS

exit "$status"
