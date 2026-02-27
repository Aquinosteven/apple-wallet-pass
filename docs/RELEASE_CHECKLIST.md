# Release Checklist

Use this checklist before promoting a deployment.

## 1) Required Environment Variables (Vercel)

Reference: `/docs/ENVIRONMENT.md`.

Set these in Vercel project envs (`production` at minimum):

```bash
# Apple Wallet signing
SIGNER_CERT_PEM
SIGNER_KEY_PEM
PASS_P12_PASSWORD
WWDR_PEM
APPLE_PASS_TYPE_ID
APPLE_TEAM_ID
APPLE_ORG_NAME

# Supabase admin
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

# Google Wallet
GOOGLE_WALLET_ISSUER_ID
GOOGLE_WALLET_SERVICE_ACCOUNT_JSON

# GHL pass flow
GHL_PASS_SECRET

# GHL OAuth install + claim writeback
GHL_OAUTH_CLIENT_ID
GHL_OAUTH_CLIENT_SECRET
GHL_OAUTH_REDIRECT_URI

# Monitoring / uptime
UPTIME_MONITOR_ENABLED
UPTIME_MONITOR_PING_TOKEN

# Selftest allowlist
SELFTEST_KEY

# Canonical production host guard
PROD_DOMAIN
ALLOW_NONPROD_WALLET
```

Quick check:

```bash
vercel env ls
```

Canonical production surface:

- `www.showfi.io` is the only canonical production host for wallet issuance.
- Set `PROD_DOMAIN=www.showfi.io` in production.
- Keep `ALLOW_NONPROD_WALLET` unset or `false` in production.
- For staging wallet tests only, set `ALLOW_NONPROD_WALLET=true` in that non-prod project.

## 2) Supabase Migration Verification

Apply pending migrations for the target Supabase project, then verify tables/policies.

### Migration filename policy

- Use one unique numeric version per file in the canonical migration dir (`supabase/migrations`).
- Do not create multiple files with the same leading numeric version.
- Keep historical/conflicting legacy SQL files in `supabase/legacy-migrations` (not in active migration path).
- CI/local guard:

```bash
npm run check:migration-versions
```

### Verify required tables exist

Run in Supabase SQL editor:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('events', 'ticket_designs', 'registrants', 'passes', 'claim_events')
order by table_name;
```

### Verify RLS is enabled

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('events', 'ticket_designs', 'registrants', 'passes', 'claim_events')
order by tablename;
```

### Verify ticket_designs policies exist

```sql
select policyname, permissive, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'ticket_designs'
order by policyname;
```

### Verify claim_events API visibility

```bash
node scripts/verify-claim-events.js
```

### Verify production runtime schema contract

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in env.

```bash
npm run check:prod-schema
```

## 3) Deployed End-to-End Smoke Test

This flow validates the claim + wallet path end to end:

1. create claim token
2. open claim page
3. redeem
4. Apple pass generation success
5. Google Wallet save URL valid
6. `claim_events` row created

### Run (auto-create claim token)

Requires an event owned by the provided auth user.

```bash
BASE_URL="https://<your-deployment-domain>" \
AUTH_TOKEN="<supabase-user-access-token>" \
EVENT_ID="<event-uuid>" \
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
node scripts/smoke-claim-flow.js
```

### Run (existing claim token)

```bash
BASE_URL="https://<your-deployment-domain>" \
CLAIM_TOKEN="<64-char-hex-token>" \
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
node scripts/smoke-claim-flow.js
```

Expected result:

- Script exits `0`
- Summary shows all required checks as `PASS`

## 4) Quality Gates

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run integration:pack
```

All commands must pass before release.

## 5) Launch Ops Metrics Check

Verify launch-critical visibility in dashboard metrics:

```bash
curl -s -H "Authorization: Bearer <supabase-user-access-token>" \
  "https://<your-deployment-domain>/api/dashboard-metrics" | jq
```

Expected fields in response:

- `totals.claimThroughput`
- `totals.claimErrors`
- `totals.issuanceFailures`
- `totals.ghlWritebackAttempts`
- `totals.ghlWritebackSuccesses`
- `totals.supportTicketsCreated`
- `totals.supportTicketsOpen`
- `ops.writebackSuccessRate`
- `ops.warnings` (empty preferred; populated means schema gap/fallbacks)

## 6) Release Artifacts

For production rollouts, attach these generated files to release notes/runbook:

- `tmp/prod_safety_snapshot.json`
- `tmp/prod_patch_verification.json`
- `tmp/post_migration_e2e_validation.json`
- `tmp/post_migration_join_click_validation.json`
