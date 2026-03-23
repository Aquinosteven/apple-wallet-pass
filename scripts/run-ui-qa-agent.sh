#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_ID="${QA_RUN_ID:-$(date +%Y%m%d-%H%M%S)}"
BASE_URL="${QA_BASE_URL:-http://127.0.0.1:5173}"
PASSWORD="${QA_PASSWORD:-Password123!}"
EMAIL_DOMAIN="${QA_EMAIL_DOMAIN:-example.com}"
TEST_EMAIL="${QA_TEST_EMAIL:-showfi-qa-${RUN_ID}@${EMAIL_DOMAIN}}"
PLAYWRIGHT_OUTPUT_DIR="${QA_PLAYWRIGHT_OUTPUT_DIR:-$REPO_ROOT/output/playwright/$RUN_ID}"
QA_OUTPUT_DIR="${QA_OUTPUT_DIR:-$REPO_ROOT/output/qa}"
REPORT_PATH="${QA_REPORT_PATH:-$QA_OUTPUT_DIR/ui-bug-report-$RUN_ID.md}"
LAST_MESSAGE_PATH="${QA_LAST_MESSAGE_PATH:-$QA_OUTPUT_DIR/ui-agent-last-message-$RUN_ID.txt}"

if ! command -v codex >/dev/null 2>&1; then
  echo "codex CLI is required but was not found in PATH." >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required for Playwright CLI but was not found in PATH." >&2
  exit 1
fi

mkdir -p "$PLAYWRIGHT_OUTPUT_DIR" "$QA_OUTPUT_DIR"

echo "Launching UI QA agent"
echo "  base url:   $BASE_URL"
echo "  test email: $TEST_EMAIL"
echo "  report:     $REPORT_PATH"
echo "  artifacts:  $PLAYWRIGHT_OUTPUT_DIR"

codex exec \
  --full-auto \
  -C "$REPO_ROOT" \
  -o "$LAST_MESSAGE_PATH" \
  - <<EOF
Use the playwright skill.

You are a dedicated UI and UX QA agent for this repository. Your job is to test the real website in a browser, create an account, look for bugs, and write a concise bug report.

Scope and constraints:
- Base URL: $BASE_URL
- Test email: $TEST_EMAIL
- Test password: $PASSWORD
- Save screenshots and browser artifacts under: $PLAYWRIGHT_OUTPUT_DIR
- Write the final bug report to: $REPORT_PATH
- Do not modify application source files.
- You may create or update files only under output/playwright and output/qa.
- If a flow is blocked by auth, billing, missing env, email confirmation, or a server failure, capture that blocker clearly instead of guessing past it.

What to test:
1. Public marketing flow on / and /pricing.
2. Signup and sign-in flow on /login.
3. Persona step after signup, if reachable.
4. Plan selection and transition to checkout, if reachable.
5. Dashboard access and at least a quick click-through of major nav areas, if reachable.
6. Responsive behavior at desktop and mobile widths for the highest-value screens you can reach.

How to work:
1. Verify the app is reachable before deeper testing.
2. Use Playwright CLI to drive the browser and re-snapshot as needed.
3. Try to create a fresh account with the provided credentials.
4. Capture screenshots for any bug, confusing UX, broken state, console-visible error, or obvious visual regression.
5. Prioritize findings that affect conversion, signup, navigation, layout, error handling, and trust.

Report format:
- Title with the run id.
- Short environment section with base URL and timestamp.
- Reachability and blockers.
- Findings section with severity labels High, Medium, or Low.
- Each finding should include:
  - title
  - severity
  - exact page or route
  - reproduction steps
  - expected behavior
  - actual behavior
  - screenshot path if available
- End with a brief summary of what was tested and what remains untested.

If no meaningful bugs are found, say that explicitly and list the remaining risk areas.
EOF

echo
echo "QA agent finished."
echo "Report: $REPORT_PATH"
echo "Last agent message: $LAST_MESSAGE_PATH"
