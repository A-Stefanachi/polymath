#!/usr/bin/env bash
# Secret hygiene checks (BL-0005; doc 12 ST-SEC-01 and ST-SEC-02; CLAUDE.md rule 2.5).
#   1. gitleaks on the working tree and on the whole git history: 0 findings.
#   2. Negative control: fake keys (an Anthropic-format key and a Supabase sb_secret_ key) written
#      to a temporary copy of an app path must be found with this repository's config, so an
#      allowlist or rule change that hides real keys fails here. The fake keys are generated at
#      run time and never committed.
#   3. No server-only secret names in web code outside src/server/privileged.
# Needs gitleaks 8.19 or newer on PATH (CI installs a pinned, checksummed release).
set -euo pipefail
cd "$(dirname "$0")/../.."
CONFIG="$PWD/.gitleaks.toml"
fail=()

echo "== gitleaks: working tree"
gitleaks dir --no-banner --redact --config "$CONFIG" . || fail+=("gitleaks-dir")

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "== gitleaks: git history"
  gitleaks git --no-banner --redact --config "$CONFIG" . || fail+=("gitleaks-history")
fi

echo "== gitleaks: negative control (generated fake keys must be found)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/apps/web/src/lib"
fake_body() { LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$1"; }
{
  echo "export const anthropicKey = \"sk-ant-api03-$(fake_body 93)AA\";"
  echo "export const supabaseKey = \"sb_secret_$(fake_body 32)\";"
} >"$tmp/apps/web/src/lib/leak.ts"
report="$tmp/report.json"
set +e
gitleaks dir --no-banner --redact --config "$CONFIG" --report-format json --report-path "$report" \
  "$tmp/apps" >/dev/null 2>&1
status=$?
set -e
if [[ $status -ne 1 ]]; then
  echo "negative control: gitleaks exited $status on planted fake keys (expected 1)"
  fail+=("negative-control")
else
  for rule in anthropic-api-key supabase-secret-key; do
    if grep -q "\"RuleID\": \"$rule\"" "$report"; then
      echo "negative control: $rule found"
    else
      echo "negative control: $rule NOT found"
      fail+=("negative-control-$rule")
    fi
  done
fi

# BL-0005 acceptance grep, as written: no component names a server secret.
echo "== server secret names in web components (*.tsx)"
if grep -rnE 'SUPABASE_SECRET_KEY|sb_secret_|SERVICE_ROLE' apps/web/src --include='*.tsx'; then
  fail+=("secret-names-in-tsx")
else
  echo "none"
fi

# Web code outside src/server/privileged never reads a server-only variable, and no file holds a
# Supabase secret key value. Names in comments or in the logger's redaction list are fine; the
# built-bundle grep of ST-SEC-02 comes with the staging build (BL-0029). Tests are never bundled.
echo "== server-only variables read outside src/server/privileged"
if grep -rnE "process\.env(\.|\[[\"'])(SUPABASE_SECRET_KEY|DATABASE_URL_PRIVILEGED|WORKER_HMAC_SECRET|INTERNAL_APPLY_HMAC_SECRET|OPENROUTER_API_KEY|VAPID_PRIVATE_KEY)|SERVICE_ROLE|sb_secret_[A-Za-z0-9_-]{20,}" \
  apps/web/src --exclude-dir=privileged --exclude='*.test.*'; then
  fail+=("server-secrets-in-web")
else
  echo "none"
fi

if ((${#fail[@]})); then
  echo "secrets check FAILED: ${fail[*]}"
  exit 1
fi
echo "secrets check: all passed"
