# Mobile Wallet QA

This repo now has a reusable local simulation kit for wallet claim testing.

## What it covers

- iPhone Safari-style claim flow using Playwright WebKit device emulation
- Android Chrome-style claim flow using Playwright Chromium device emulation
- Claim page rendering
- Claim submission
- Apple pass download generation
- Google Wallet popup/save-link opening
- Screenshots and JSON report artifacts

## What it does not replace

- Native Apple Wallet import confirmation on a real iPhone
- Native Google Wallet app handoff confirmation on a real Android device
- Device-only behaviors such as true Wallet UI handoff, app switching, and push relevance behavior

Use this as the default PR/regression check, then add real-device validation for release candidates when wallet handoff changes.

## One-time setup

1. Install the browser runtimes:

```bash
npm run qa:wallet:install-browsers
```

2. Check host readiness:

```bash
npm run qa:wallet:env
```

This reports:

- whether Playwright browsers are installed
- whether Xcode/iOS Simulator tooling exists
- whether Android tooling exists

## Running the mobile claim simulator

Option A: use an existing claim token

```bash
BASE_URL=http://127.0.0.1:5173 \
CLAIM_TOKEN=your_claim_token_here \
npm run qa:wallet:claim-sim
```

Option B: auto-create a fresh claim token from an event

```bash
BASE_URL=http://127.0.0.1:5173 \
EVENT_ID=your_event_id_here \
QA_EMAIL=qa-account@example.com \
QA_PASSWORD='Password123!' \
npm run qa:wallet:claim-sim
```

Option C: use a pre-fetched bearer token

```bash
BASE_URL=http://127.0.0.1:5173 \
EVENT_ID=your_event_id_here \
AUTH_TOKEN=your_bearer_token_here \
npm run qa:wallet:claim-sim
```

## Artifacts

Artifacts are written under:

```text
output/playwright/mobile-wallet-claim-sim-<timestamp>/
```

The script writes:

- `iphone-safari-sim-claim-preview.png`
- `iphone-safari-sim-claim-complete.png`
- `android-chrome-sim-claim-preview.png`
- `android-chrome-sim-claim-complete.png`
- downloaded `.pkpass` file from the Apple path
- `report.json`

## Recommended workflow

1. Run `npm run qa:wallet:claim-sim` on every wallet/claim change.
2. Review screenshots and `report.json`.
3. If wallet handoff UI changed materially, schedule one real-device smoke check before release.

## Future extensions

- Add a BrowserStack/Sauce real-device runner wrapper
- Record HAR/network traces for claim and wallet endpoints
- Add matrix profiles for iPad Safari and smaller Android devices
