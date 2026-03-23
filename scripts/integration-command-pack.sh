#!/usr/bin/env bash
set -euo pipefail

# Integration command pack for final launch validation.
# Runs what is possible now and clearly reports what is blocked by missing credentials.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

load_env_file() {
  local file="$1"
  local line key value
  [[ -f "$file" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -n "$line" ]] || continue
    [[ "${line:0:1}" == "#" ]] && continue
    [[ "$line" == *=* ]] || continue

    key="${line%%=*}"
    value="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    if [[ -n "$key" && -z "${!key:-}" ]]; then
      export "$key=$value"
    fi
  done < "$file"
}

load_env_file "$ROOT_DIR/.env.local"
load_env_file "$ROOT_DIR/.env.production.local"
load_env_file "$ROOT_DIR/.env.development.local"

GREEN="$(printf '\033[32m')"
YELLOW="$(printf '\033[33m')"
RED="$(printf '\033[31m')"
RESET="$(printf '\033[0m')"

pass() { printf "%s[PASS]%s %s\n" "$GREEN" "$RESET" "$1"; }
warn() { printf "%s[SKIP]%s %s\n" "$YELLOW" "$RESET" "$1"; }
fail() { printf "%s[FAIL]%s %s\n" "$RED" "$RESET" "$1"; }

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    return 1
  fi
  return 0
}

run_cmd() {
  local title="$1"
  shift
  echo "-> $title"
  if "$@"; then
    pass "$title"
  else
    fail "$title"
    return 1
  fi
}

echo "=== ShowFi Integration Command Pack ==="
echo "Repo: $ROOT_DIR"
echo

echo "1) Local quality gates"
run_cmd "npm test" npm test
run_cmd "npm run typecheck" npm run typecheck
run_cmd "npm run lint" npm run lint
run_cmd "npm run build" npm run build
run_cmd "npm run test:thread-c:smoke" npm run test:thread-c:smoke
run_cmd "npm run test:thread-c:load" npm run test:thread-c:load

echo
echo "2) Credential readiness summary"
missing=0
for key in SQUARE_ACCESS_TOKEN SQUARE_LOCATION_ID SQUARE_WEBHOOK_SIGNATURE_KEY MAIL_PROVIDER; do
  if require_env "$key"; then
    pass "env:$key"
  else
    warn "env:$key missing"
    missing=$((missing + 1))
  fi
done

if [[ "${MAIL_PROVIDER:-}" == "resend" ]]; then
  if require_env RESEND_API_KEY; then
    pass "env:RESEND_API_KEY"
  else
    warn "env:RESEND_API_KEY missing"
    missing=$((missing + 1))
  fi
elif [[ "${MAIL_PROVIDER:-}" == "smtp" ]]; then
  if require_env SMTP_CONFIG_JSON; then
    pass "env:SMTP_CONFIG_JSON"
  else
    warn "env:SMTP_CONFIG_JSON missing"
    missing=$((missing + 1))
  fi
else
  warn "MAIL_PROVIDER should be 'resend' or 'smtp'"
fi

for key in GHL_TEST_LOCATION_ID GHL_TEST_EVENT_ID; do
  if require_env "$key"; then
    pass "env:$key"
  else
    warn "env:$key missing"
    missing=$((missing + 1))
  fi
done

echo
echo "3) Deployed API checks (optional, requires BASE_URL and AUTH_TOKEN)"
BASE_URL="${BASE_URL:-${NEXT_PUBLIC_API_BASE_URL:-${VITE_APP_URL:-}}}"
if require_env BASE_URL && require_env AUTH_TOKEN; then
  run_cmd "GET /api/monitoring" \
    curl -fsS -H "Authorization: Bearer $AUTH_TOKEN" "$BASE_URL/api/monitoring" >/dev/null

  run_cmd "GET /api/dashboard-metrics" \
    curl -fsS -H "Authorization: Bearer $AUTH_TOKEN" "$BASE_URL/api/dashboard-metrics" >/dev/null

  run_cmd "GET /api/admin" \
    curl -fsS -H "Authorization: Bearer $AUTH_TOKEN" "$BASE_URL/api/admin" >/dev/null

  run_cmd "GET /api/support" \
    curl -fsS -H "Authorization: Bearer $AUTH_TOKEN" "$BASE_URL/api/support" >/dev/null
else
  warn "BASE_URL and AUTH_TOKEN not set; skipping deployed API checks"
fi

echo
echo "4) Claim and wallet smoke (optional)"
if require_env BASE_URL && { require_env SUPABASE_URL || require_env VITE_SUPABASE_URL; } && require_env SUPABASE_SERVICE_ROLE_KEY; then
  if require_env CLAIM_TOKEN || (require_env AUTH_TOKEN && require_env EVENT_ID); then
    run_cmd "node scripts/smoke-claim-flow.js" node scripts/smoke-claim-flow.js
  else
    warn "Set CLAIM_TOKEN or AUTH_TOKEN+EVENT_ID to run smoke-claim-flow"
  fi
else
  warn "BASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY required for smoke-claim-flow"
fi

echo
if [[ "$missing" -eq 0 ]]; then
  pass "All credential gates present."
else
  warn "$missing credential/input items still missing."
fi
echo "Done."
