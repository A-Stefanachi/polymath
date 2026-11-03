#!/usr/bin/env bash
# Runs pytest for each Python service that has tests (BL-0003). A service without a tests/
# folder yet (the scaffolds of BL-0002) is reported and skipped, not failed. BL-0014 adds the
# worker's tests; a service with a uv.lock is then tested in its own locked environment.
set -euo pipefail
cd "$(dirname "$0")/../.."
status=0
for svc in services/*/; do
  svc="${svc%/}"
  if [[ ! -d "$svc/tests" ]]; then
    echo "skip $svc: no tests/ yet"
    continue
  fi
  echo "pytest $svc"
  if [[ -f "$svc/uv.lock" ]]; then
    (cd "$svc" && uv run --frozen pytest -q -p no:cacheprovider) || status=1
  else
    (cd "$svc" && uv run --no-project --with pytest==9.2.0 pytest -q -p no:cacheprovider) || status=1
  fi
done
exit "$status"
