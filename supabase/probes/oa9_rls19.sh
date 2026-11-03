#!/usr/bin/env bash
# OA-9 and ST-RLS-19 probe (BL-0007; doc 03 section 15, doc 12 ST-RLS-19).
# Creates two temporary objects, calls them through the Data API with the publishable key and
# with the secret key, prints what each key runs as, then drops the objects again.
#
#   OA-9:      the publishable key runs as anon and is_service_role() is false; the secret key
#              runs as service_role and is_service_role() is true.
#   ST-RLS-19: a public table with no GRANT returns 42501 through the Data API for both keys.
#
# Usage:
#   supabase/probes/oa9_rls19.sh local      # local stack from `supabase start`
#   supabase/probes/oa9_rls19.sh staging    # needs NEXT_PUBLIC_SUPABASE_URL,
#                                           # NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
#                                           # SUPABASE_SECRET_KEY, and SQL access through
#                                           # SUPABASE_DB_URL or the management API
#                                           # (SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN).
# Keys are read from the environment and never printed. Record the output in infra/VERIFIED.md.
set -euo pipefail
target="${1:-local}"
here="$(cd "$(dirname "$0")" && pwd)"

if [[ "$target" == "local" ]]; then
  status="$(pnpm -s exec supabase status -o json 2>/dev/null)"
  api="$(python3 -c 'import json,sys;print(json.loads(sys.argv[1])["API_URL"])' "$status")"
  pub="$(python3 -c 'import json,sys;print(json.loads(sys.argv[1])["PUBLISHABLE_KEY"])' "$status")"
  sec="$(python3 -c 'import json,sys;print(json.loads(sys.argv[1])["SECRET_KEY"])' "$status")"
  sql() { psql -qAt "${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}" -f "$1"; }
else
  api="${NEXT_PUBLIC_SUPABASE_URL:?}"
  pub="${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:?}"
  sec="${SUPABASE_SECRET_KEY:?}"
  if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
    sql() { psql -qAt "$SUPABASE_DB_URL" -f "$1"; }
  else
    sql() {
      python3 -c 'import json,sys;print(json.dumps({"query":open(sys.argv[1]).read()}))' "$1" |
        curl -sS -X POST "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF:?}/database/query" \
          -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN:?}" -H "Content-Type: application/json" \
          --data-binary @- >/dev/null
    }
  fi
fi

trap 'sql "$here/oa9_rls19_drop.sql" || true' EXIT
sql "$here/oa9_rls19_create.sql"
sleep 2 # PostgREST schema reload

for name in publishable secret; do
  key="$pub"
  [[ "$name" == "secret" ]] && key="$sec"
  echo "== $name key: rpc zz_oa9_probe"
  curl -sS -X POST "$api/rest/v1/rpc/zz_oa9_probe" -H "apikey: $key" -H "Content-Type: application/json" -d '{}'
  echo
  echo "== $name key: select from the ungranted table"
  curl -sS -w " [http %{http_code}]" "$api/rest/v1/zz_rls19_probe?select=id" -H "apikey: $key"
  echo
done
