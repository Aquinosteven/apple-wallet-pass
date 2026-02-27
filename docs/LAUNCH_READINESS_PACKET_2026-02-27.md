# Launch Readiness Packet - 2026-02-27

## Executive Status

- Scope: production launch hardening (non-sales), stabilization only.
- CRM mode: GoHighLevel is source of truth; writeback uses additive contact custom fields only and remains fail-open.
- Overall readiness: **YELLOW**
  - Reliability: **GREEN**
  - Instrumentation/Ops visibility: **YELLOW**
  - GHL CRM operational readiness: **YELLOW**

## Evidence (commands + outcomes)

| Area | Command | Result | Notes |
|---|---|---|---|
| Unit/integration tests | `npm test` | PASS | 57/57 passing |
| Type safety | `npm run typecheck` | PASS | No TS errors |
| Lint | `npm run lint` | PASS | No lint errors |
| Build | `npm run build` | PASS | Vite build successful |
| Thread-C smoke | `npm run test:thread-c:smoke` | PASS | Endpoint inventory exercised |
| Thread-C load | `npm run test:thread-c:load` | PASS | 200 iterations, concurrency 10 |
| Full integration pack | `npm run integration:pack` | PASS with SKIPs | Missing external credentials/URLs for deployed checks |

## Launch-Critical Flow Validation

Order validated: webhook intake -> issuance/claim generation -> GHL writeback -> reporting.

1. Webhook/claim security and payload handling
   - `issue-claim` rejects missing/invalid `x-ghl-secret`.
   - `issue-claim` rejects invalid payload.
2. Claim issuance
   - Happy-path issuance passes test coverage and smoke runs.
3. GHL writeback behavior
   - Writeback runs with location-scoped OAuth token.
   - Expired token refresh path covered.
   - Non-2xx writeback fails open (claim flow stays up) and is observable.
4. Reporting visibility
   - `/api/dashboard-metrics` returns default 7-day window and totals.
   - Added launch ops totals and warning surface (`ops.warnings`).

## Open Blockers (sorted)

| Severity | Blocker | Repro | Owner | Status |
|---|---|---|---|---|
| P1 | External deployment checks not runnable locally without inputs | `npm run integration:pack` (SKIP in section 3/4) | Platform/Ops | Open |
| P1 | Square/mail/GHL test reference envs not set in shell for integration pack | `npm run integration:pack` (credential readiness SKIP) | Platform/Ops | Open |
| P2 | Uptime monitor token policy depends on env completeness | `POST /api/monitoring` without expected token env | Platform/Ops | Open |

## Environment Contract Audit

### Required now (production)

- Apple Wallet signing:
  - `SIGNER_CERT_PEM`
  - `SIGNER_KEY_PEM`
  - `PASS_P12_PASSWORD`
  - `WWDR_PEM`
  - `APPLE_PASS_TYPE_ID`
  - `APPLE_TEAM_ID`
  - `APPLE_ORG_NAME`
- Supabase admin:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Google Wallet:
  - `GOOGLE_WALLET_ISSUER_ID`
  - `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON`
- GHL pass + OAuth writeback:
  - `GHL_PASS_SECRET`
  - `GHL_OAUTH_CLIENT_ID`
  - `GHL_OAUTH_CLIENT_SECRET`
  - `GHL_OAUTH_REDIRECT_URI`
- Selftest:
  - `SELFTEST_KEY`
- Monitoring/Uptime:
  - `UPTIME_MONITOR_ENABLED`
  - `UPTIME_MONITOR_PING_TOKEN`

### Optional / integration-pack dependent

- Deployed API checks:
  - `BASE_URL`
  - `AUTH_TOKEN`
- Claim/wallet smoke:
  - `CLAIM_TOKEN` **or** (`AUTH_TOKEN` + `EVENT_ID`)
- Square:
  - `SQUARE_ACCESS_TOKEN`
  - `SQUARE_LOCATION_ID`
  - `SQUARE_WEBHOOK_SIGNATURE_KEY`
- Mail:
  - `MAIL_PROVIDER` + (`RESEND_API_KEY` or `SMTP_CONFIG_JSON`)
- GHL smoke references:
  - `GHL_TEST_LOCATION_ID`
  - `GHL_TEST_EVENT_ID`

### Legacy aliases (temporary only)

- `VITE_SUPABASE_URL` fallback on server-side routes.
- `GOOGLE_WALLET_SA_JSON` fallback only in health endpoint.

## Minimum Launch Dashboard Contract

Primary endpoint: `GET /api/dashboard-metrics`

Required fields for launch monitoring:

- `totals.passesIssued`
- `totals.walletAdds`
- `totals.reminderSends`
- `totals.claimThroughput`
- `totals.claimErrors`
- `totals.issuanceFailures`
- `totals.ghlWritebackAttempts`
- `totals.ghlWritebackSuccesses`
- `totals.supportTicketsCreated`
- `totals.supportTicketsOpen`
- `ops.writebackSuccessRate`
- `ops.warnings`

Fallback behavior:

- If optional tables are missing, endpoint degrades gracefully and records warnings in `ops.warnings` instead of hard-failing.

## Ops Trigger Matrix (launch week)

| Trigger | Threshold | Action | First check |
|---|---|---|---|
| Claim errors spike | `claimErrors > 5` in 15 min | Pause rollout and inspect claim endpoint logs | `/api/dashboard-metrics` + server logs |
| GHL writeback degradation | `writebackSuccessRate < 0.95` | Keep claim flow live, investigate CRM writeback path | `ghl_webhook_logs` + `/api/integrations/ghl/status` |
| Issuance failures | `issuanceFailures > 0` for active campaign | Replay failed flow and inspect event mapping | `ghl_webhook_logs.error_message` |
| Support load surge | `supportTicketsOpen >= 10` | Route to support queue + incident channel | `/api/support` |

## GHL Incident Triage Ladder

1. Secret mismatch (`x-ghl-secret`) -> verify `GHL_PASS_SECRET`.
2. Missing installation -> verify `ghl_installations` for `locationId`.
3. Writeback non-2xx -> validate token refresh/custom fields at location.
4. Missing contact email -> enforce email presence before workflow trigger.
5. Claim succeeds but CRM fails -> treat as fail-open; triage in `ghl_webhook_logs`.

## Launch Command Sequence

1. `npm test`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`
5. `npm run integration:pack`
6. Deployed verification after env + domain are present:
   - `curl -s -H "Authorization: Bearer <AUTH_TOKEN>" "https://<BASE_URL>/api/dashboard-metrics" | jq`
   - `curl -s -H "Authorization: Bearer <AUTH_TOKEN>" "https://<BASE_URL>/api/admin" | jq`
   - `curl -s -H "Authorization: Bearer <AUTH_TOKEN>" "https://<BASE_URL>/api/support" | jq`
   - `curl -s "https://<BASE_URL>/api/monitoring" | jq`

## Rollback / Containment

1. If CRM writeback is failing: keep claim issuance live, disable dependent automations in GHL, and investigate writeback path.
2. If claim issuance fails: stop new webhook ingestion at source workflow and keep monitoring/support endpoints online.
3. If dashboard metrics degrade: use direct table inspection and API-level smoke until metrics recover.

## First 24 Hours Monitoring Checklist

1. Every hour: capture `/api/dashboard-metrics` snapshot and track `ops.writebackSuccessRate`.
2. Every 2 hours: review `ghl_webhook_logs` failed rows and confirm no repeated root-cause class.
3. Twice daily: review `support_tickets` open count and top issue types.
4. End of day: rerun `npm run integration:pack` in deployment context with full env set.

## Implementation Log (2026-02-27)

1. Added additive ops totals and graceful fallback warnings in:
   - `api/dashboard-metrics.js`
2. Updated release checklist with missing production envs and launch ops metrics check:
   - `docs/RELEASE_CHECKLIST.md`
3. Clarified integration pack PASS/SKIP/FAIL interpretation:
   - `docs/INTEGRATION_COMMAND_PACK.md`
4. Updated GHL launch writeback contract to additive, best-effort contact fields and added incident triage ladder:
   - `docs/GHL_OAUTH_SETUP.md`
