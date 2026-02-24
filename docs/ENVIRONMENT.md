# Environment Variable Audit

Last updated: 2026-02-24

This file documents the runtime environment variables used by server code in this repository.

## Canonical Variables

### Apple Wallet signing (`lib/generatePass.js`, `api/pass.js`, `api/claim.js`)

- `SIGNER_CERT_PEM` (base64-encoded signer cert PEM)
- `SIGNER_KEY_PEM` (base64-encoded signer private key PEM)
- `PASS_P12_PASSWORD` (signer key passphrase)
- `WWDR_PEM` (base64-encoded WWDR certificate)
- `APPLE_PASS_TYPE_ID`
- `APPLE_TEAM_ID`
- `APPLE_ORG_NAME`

### Supabase admin (`api/events.js`, `api/registrants.js`, `api/claim.js`)

- `SUPABASE_URL` (preferred)
- `SUPABASE_SERVICE_ROLE_KEY`

Supported fallback in code:

- `VITE_SUPABASE_URL` is accepted as a fallback for `SUPABASE_URL` on server endpoints.

### Google Wallet (`api/google-save.js`, `api/health.js?mode=gwallet`)

- `GOOGLE_WALLET_ISSUER_ID`
- `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON`

Supported fallback in health endpoint only:

- `GOOGLE_WALLET_SA_JSON` (legacy fallback read by `/api/health?mode=gwallet`).

### GHL pass flows (`api/ghl-pass.js`, `api/join.js`)

- `GHL_PASS_SECRET`

### GHL issue-claim writeback (`api/issue-claim.js`)

- `GHL_PRIVATE_INTEGRATION_KEY` (optional; when set with contact/location IDs present, `/api/issue-claim` updates contact custom fields in LeadConnector)

### Selftest endpoint (`/api/selftest-issue-claim` via `api/health.js?mode=selftest-issue-claim`)

- `SELFTEST_KEY` (required header allowlist secret for selftest endpoint)

### Health/build metadata (`api/health.js?mode=pass`)

- `VERSION` (optional)
- `VERCEL_GIT_COMMIT_SHA` (optional)

## Current Inconsistencies To Keep In Mind

- Signing is PEM-based via the Vercel `/api` flow; `PASS_P12` vars are deprecated/removed.
- Frontend build-time vars (`VITE_*`) should not be treated as server secrets; server routes should prefer non-`VITE_` names.

## Legacy Alias Support

- `api/online-event.js` accepts:
  - `SIGNER_CERT_PEM` (preferred), fallback `SIGNER_CERT_PEM_B64`
  - `SIGNER_KEY_PEM` (preferred), fallback `SIGNER_KEY_PEM_B64`
  - `SIGNER_KEY_PASSPHRASE` (preferred), fallback `PASS_P12_PASSWORD`

## Deployment Checklist

1. Set canonical variables first.
2. Use legacy aliases only for temporary migration.
3. Keep `.env.local`, Vercel env, and this file aligned after any endpoint change.
