# Integration Command Pack

Run this after dropping in external credentials to validate launch readiness with minimal manual steps.

## One Command

```bash
npm run integration:pack
```

## Required Environment Variables

Set these in your shell (or `.env.local` if your workflow loads it):

```bash
# Deployed checks
BASE_URL="https://<your-domain>"
AUTH_TOKEN="<supabase-user-access-token>"

# Claim/wallet smoke
SUPABASE_URL="https://<project>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
# Use either:
CLAIM_TOKEN="<existing-claim-token>"
# or:
EVENT_ID="<event-uuid>"

# Square
SQUARE_APPLICATION_ID="<square-application-id>"
SQUARE_ACCESS_TOKEN="<square-token>"
SQUARE_LOCATION_ID="<square-location-id>"
SQUARE_WEBHOOK_SIGNATURE_KEY="<square-webhook-signature-key>"
SQUARE_PLAN_VARIATION_ID_CORE_MONTHLY_V1="<square-plan-variation-id-monthly>"
SQUARE_PLAN_VARIATION_ID_CORE_YEARLY_V1="<square-plan-variation-id-yearly>"

# Mail
MAIL_PROVIDER="resend" # or "smtp"
RESEND_API_KEY="<resend-key>" # required when MAIL_PROVIDER=resend
SMTP_CONFIG_JSON="<smtp-json>" # required when MAIL_PROVIDER=smtp

# GHL test references
GHL_TEST_LOCATION_ID="<ghl-location-id>"
GHL_TEST_EVENT_ID="<ghl-event-id>"
GHL_PASS_SECRET="<shared-secret-used-by-ghl-webhooks>"
```

## What It Runs

1. Local quality gates:
   - `npm test`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
   - `npm run test:thread-c:smoke`
   - `npm run test:thread-c:load`
2. Credential readiness checks (Square, mail, GHL test references)
3. Optional deployed API checks (`/api/monitoring`, `/api/dashboard-metrics`, `/api/admin`, `/api/support`)
4. Optional end-to-end claim/wallet smoke (`scripts/smoke-claim-flow.js`)

The script prints `PASS`, `SKIP`, and `FAIL` markers so blocked dependencies are obvious.

Interpretation:

- `PASS`: command or dependency check succeeded.
- `SKIP`: optional dependency/input missing; launch decision required before promotion.
- `FAIL`: hard blocker; do not promote until resolved.
