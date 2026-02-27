# GHL OAuth Setup (Marketplace App)

This guide configures multi-tenant GoHighLevel (LeadConnector) OAuth for ShowFi claim writeback.

## 1) Create/configure Marketplace app

1. In HighLevel Marketplace developer portal, create or open your app.
2. Configure OAuth 2.0 (Authorization Code flow).
3. Set redirect URI to your ShowFi callback endpoint:
   - `https://<your-domain>/api/ghl/oauth/callback`
4. Copy:
   - Client ID
   - Client Secret
5. Ensure app scopes include contacts and custom fields operations.

## 2) Configure ShowFi environment

Set these server-side environment variables:

- `GHL_OAUTH_CLIENT_ID`
- `GHL_OAUTH_CLIENT_SECRET`
- `GHL_OAUTH_REDIRECT_URI`
- `GHL_OAUTH_SCOPES` (optional override; defaults are applied in code)
- `GHL_PASS_SECRET` (required for `/api/issue-claim` webhook auth)

`/api/issue-claim` does location-level token lookup from `ghl_installations`, refreshes when expiring, ensures required contact custom fields exist, and writes claim URL/token to contact.

## 3) Connect flow in ShowFi

1. Open:
   - `GET /api/ghl/oauth/start`
   - Optional return path: `GET /api/ghl/oauth/start?return_to=/settings/integrations`
2. You will be redirected to HighLevel install/authorize.
3. After approval, HighLevel returns to:
   - `GET /api/ghl/oauth/callback?code=...&state=...`
4. ShowFi callback behavior:
   - Validates and consumes `state`
   - Exchanges code for tokens (`POST https://services.leadconnectorhq.com/oauth/token`)
   - Stores installation by `location_id`
   - Ensures custom fields exist on the location (best-effort/additive):
     - `showfi_claim_url`
     - `showfi_claim_token`
     - `showfi_pass_issued_at`
     - `showfi_wallet_added_at`
     - `showfi_join_click_first_at`
     - `showfi_join_click_latest_at`
     - `showfi_join_click_count`

## 4) Token model and tenancy

- Tokens are stored per location/sub-account in `ghl_installations`.
- Writeback is location-aware:
  - webhook payload -> extract `locationId`
  - load matching installation
  - refresh token if near expiry
  - update contact on that location

If no installation exists for a webhook location, claim issuance still succeeds and writeback is skipped.

## 4.1) Launch writeback contract (additive + best-effort)

Launch mode uses **contact custom fields only** for CRM writeback. Fields are additive and writeback is fail-open (claim/join flows continue if provisioning/update fails).

- Supported writeback keys:
  - `contact.showfi_claim_url`
  - `contact.showfi_claim_token`
  - `contact.showfi_pass_issued_at`
  - `contact.showfi_wallet_added_at`
  - `contact.showfi_join_click_first_at`
  - `contact.showfi_join_click_latest_at`
  - `contact.showfi_join_click_count`
- Not in scope for launch:
  - tag mutations
  - opportunity/deal creation
  - pipeline-stage updates

This keeps GHL side effects minimal while preserving claim-link traceability.

## 5) Operational verification

1. Run one install flow through `/api/ghl/oauth/start`.
2. Confirm row exists in `ghl_installations` for target `location_id`.
3. Trigger one real webhook to `/api/issue-claim` with `contactId` + `locationId`.
4. Confirm contact in HighLevel has:
   - `contact.showfi_claim_url`
   - `contact.showfi_claim_token`
   - (optional telemetry) `contact.showfi_pass_issued_at`, `contact.showfi_wallet_added_at`, `contact.showfi_join_click_*`
5. If `DEBUG_GHL_WEBHOOKS=true`, confirm logs show masked IDs and `ghlWriteback` status.

## 5.1) Incident triage ladder (quick)

1. `Missing x-ghl-secret` / `Invalid x-ghl-secret`
   - Check `GHL_PASS_SECRET` parity between GHL workflow header and ShowFi env.
2. `noInstallationForLocation=true` or skipped writeback
   - Confirm OAuth install exists for webhook `locationId` in `ghl_installations`.
3. Writeback non-2xx
   - Validate token refresh path and custom field provisioning on the same location.
4. `Contact is missing email in GHL`
   - Ensure the contact has a valid email before triggering issuance workflow.
5. Claim succeeds but CRM update fails
   - Expected fail-open behavior; claim delivery remains available. Investigate via `ghl_webhook_logs` and retry path.

## 6) LeadConnector API references used by this implementation

- OAuth token exchange/refresh:
  - `POST https://services.leadconnectorhq.com/oauth/token`
- Custom fields:
  - `GET https://services.leadconnectorhq.com/locations/:locationId/customFields`
  - `POST https://services.leadconnectorhq.com/locations/:locationId/customFields`
- Contact writeback:
  - `PUT https://services.leadconnectorhq.com/contacts/:contactId`
- Required API header for LeadConnector endpoints above:
  - `Version: 2021-07-28`
