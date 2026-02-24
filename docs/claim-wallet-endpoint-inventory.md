# Claim + Wallet Endpoint Inventory

Publicly reachable endpoints in the claim + wallet add flow:

## Claim / Redemption
- `GET /api/claim?token=...`
  - Loads claim preview details before redemption.
- `POST /api/claim`
  - Redeems claim token and streams Apple `.pkpass` download.
- `POST /api/claim-events`
  - Client/server analytics ingestion for claim lifecycle events.

## Pass Generation
- `POST /api/pass`
  - Generates Apple `.pkpass` for builder flow.
- `GET /api/pass`
  - Legacy compatibility route behavior retained.
- `POST /api/online-event`
  - Generates event-style Apple `.pkpass`.
- `POST /api/ghl-pass`
  - GHL integration pass generation.

## Google Wallet
- `POST /api/google-save`
  - Creates Save-to-Google-Wallet signed URL.
- `GET /api/google-save`
  - Diagnostics/compatibility behavior retained.

## Health (kept open)
- `GET /api/health`
- `GET /api/health?mode=pass`
- `GET /api/health?mode=gwallet`
