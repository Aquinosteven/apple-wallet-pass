# Apple Wallet Pass Generator

A minimal end-to-end Apple Wallet pass generator built with Vercel serverless API routes and your Apple Developer certificates.

## Features

- Generate native `.pkpass` files using your Apple Developer certificates
- API routes for pass generation, claim redemption, and wallet links
- Server-side PKCS#7 signing with passkit-generator
- Base64 certificate management for secure deployment

## Prerequisites

Before you can generate passes, you'll need:

1. **Apple Developer Account** (paid membership required)
2. **Pass Type ID** registered in your Apple Developer account
3. **Pass Type ID Certificate** exported from Keychain Access
4. **Apple WWDR Certificate** (Worldwide Developer Relations)

## Apple Developer Certificate Setup

### Step 1: Create a Pass Type ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to: **Certificates, Identifiers & Profiles** > **Identifiers**
3. Click the **+** button and select **Pass Type IDs**
4. Enter a description and identifier (e.g., `pass.com.yourcompany.yourpass`)
5. Click **Continue** and **Register**

### Step 2: Create a Pass Type ID Certificate

1. In the **Identifiers** section, select your Pass Type ID
2. Click **Create Certificate**
3. Follow the instructions to create a Certificate Signing Request (CSR):
   - Open **Keychain Access** on your Mac
   - Go to: **Keychain Access** > **Certificate Assistant** > **Request a Certificate from a Certificate Authority**
   - Enter your email address
   - Select "Saved to disk" and click **Continue**
   - Save the CSR file
4. Upload the CSR file to the Apple Developer Portal
5. Download the certificate (it will be named something like `pass.cer`)
6. Double-click the downloaded certificate to install it in Keychain Access

### Step 3: Export the Pass Type ID Certificate as P12

1. Open **Keychain Access**
2. Select the **login** keychain and **My Certificates** category
3. Find your Pass Type ID certificate (it will show your Pass Type ID under the name)
4. Right-click the certificate and select **Export**
5. Choose format: **Personal Information Exchange (.p12)**
6. Save as `pass-cert.p12`
7. **Set a password** when prompted (you'll need this later)
8. Click **OK** and enter your Mac password to authorize the export

### Step 4: Download the Apple WWDR Certificate

1. Go to [Apple Certificate Authority](https://www.apple.com/certificateauthority/)
2. Download the **Worldwide Developer Relations - G4** certificate (or the latest version)
3. The file will be named something like `AppleWWDRCAG4.cer`
4. Double-click to install it in Keychain Access
5. In Keychain Access, find the **Apple Worldwide Developer Relations Certification Authority** certificate
6. Right-click and select **Export**
7. Choose format: **Privacy Enhanced Mail (.pem)**
8. Save as `AppleWWDRCAG4.pem`

### Step 5: Convert Certificates to Base64

#### On macOS:

```bash
# Encode the P12 certificate
base64 -i pass-cert.p12 | pbcopy
# The base64 string is now in your clipboard - paste it into .env as APPLE_PASS_CERT_P12_B64

# Encode the WWDR certificate
base64 -i AppleWWDRCAG4.pem | pbcopy
# The base64 string is now in your clipboard - paste it into .env as APPLE_WWDR_CERT_PEM_B64
```

#### On Linux:

```bash
# Encode the P12 certificate
base64 -w 0 pass-cert.p12
# Copy the output and paste into .env as APPLE_PASS_CERT_P12_B64

# Encode the WWDR certificate
base64 -w 0 AppleWWDRCAG4.pem
# Copy the output and paste into .env as APPLE_WWDR_CERT_PEM_B64
```

#### On Windows (PowerShell):

```powershell
# Encode the P12 certificate
[Convert]::ToBase64String([IO.File]::ReadAllBytes("pass-cert.p12")) | Set-Clipboard

# Encode the WWDR certificate
[Convert]::ToBase64String([IO.File]::ReadAllBytes("AppleWWDRCAG4.pem")) | Set-Clipboard
```

### Step 6: Configure Environment Variables

Open the `.env` file and fill in all the Apple Wallet configuration values:

```env
# Your Pass Type ID (e.g., pass.com.yourcompany.yourpass)
APPLE_PASS_TYPE_ID=pass.com.yourcompany.yourpass

# Your Apple Developer Team ID (10 characters, found in your Apple Developer account under Membership)
APPLE_TEAM_ID=ABCD123456

# Your organization name as registered with Apple
APPLE_ORG_NAME=Your Company Name

# The base64-encoded signer certificate PEM
SIGNER_CERT_PEM=LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0t...

# The base64-encoded signer private key PEM
SIGNER_KEY_PEM=LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQ...

# Passphrase for your signer key
PASS_P12_PASSWORD=your-key-passphrase

# The base64-encoded WWDR certificate
WWDR_PEM=LS0tLS1CRUdJTi...
```

**Important Notes:**
- Do NOT add quotes around the base64 strings
- Do NOT add line breaks in the base64 strings
- Make sure there are no extra spaces before or after the values
- For a complete endpoint-by-endpoint environment matrix and legacy aliases, see `/docs/ENVIRONMENT.md`.

## API Endpoints

**Current Pass Endpoints**
- Canonical: `POST /api/pass`
- Back-compat shim: `POST /api/client-pass`
- Google Wallet Save URL: `GET|POST /api/google-save`
- Google Wallet Health: `GET /api/health?mode=gwallet` (checks service-account token + Generic Class API access for `${GOOGLE_WALLET_ISSUER_ID}.showfi.generic.v1`)

### Google Wallet Save URL: `/api/google-save`

Creates a signed Google Wallet "Save to Google Wallet" URL using a Google Cloud
service account key (JWT flow, RS256).

Required environment variables:

```env
GOOGLE_WALLET_ISSUER_ID=3388000000022901234
GOOGLE_WALLET_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"wallet-signer@your-project.iam.gserviceaccount.com",...}
```

Response shape:

```json
{ "ok": true, "saveUrl": "https://pay.google.com/gp/v/save/..." }
```

Validation/config failure (`400`):

```json
{ "ok": false, "error": "...", "missing": ["GOOGLE_WALLET_ISSUER_ID"] }
```

Unexpected server failure (`500`):

```json
{ "ok": false, "error": "...", "missing": [] }
```

Google Wallet health test:

```bash
curl -s "https://<your-vercel-domain>/api/health?mode=gwallet" | jq
```

`/api/health?mode=gwallet` uses `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON`.
Backward compatibility: if only `GOOGLE_WALLET_SA_JSON` is present, it is used and
the response includes a deprecation warning.

Local UI verification (Google Wallet button flow):

1. Set local env vars, then run:
```bash
npm run dev
```
2. Open the app, fill the pass form, and click **Generate Pass**.
3. Confirm **Download .pkpass** appears.
4. If Google Wallet health is `ok`, confirm **Add to Google Wallet** appears.
5. Click **Add to Google Wallet** and verify `/api/google-save` returns:
```json
{ "ok": true, "saveUrl": "https://pay.google.com/gp/v/save/..." }
```
6. If the request fails, the UI shows a red error notice under the success actions.

### Health Check: `/api/health`

Use the pass mode health endpoint to validate Apple Wallet signing config.

**Request:**
```bash
curl -s "https://<your-vercel-domain>/api/health?mode=pass" | jq
```

Google Wallet health check:

```bash
curl -s "https://<your-vercel-domain>/api/health?mode=gwallet" | jq
```

## Google Search Console Setup

Use the local Search Console scripts if you want one-time auth and reusable ranking data for SEO work.

1. Add these values to `.env.local`:

```env
GOOGLE_SEARCH_CONSOLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_SEARCH_CONSOLE_SITE_URL=sc-domain:showfi.io
```

2. Run one-time auth:

```bash
npm run gsc:auth
```

This saves your refresh token locally to `.secrets/google-search-console-token.json`.

3. List the properties available to the authenticated account:

```bash
npm run gsc:sites
```

4. Pull the top 25 ranking queries for the configured property:

```bash
npm run gsc:top-queries
```

JSON output is also supported:

```bash
npm run gsc:top-queries -- --json
```

## Site Analytics

The app includes Vercel Web Analytics via `@vercel/analytics`, which automatically tracks page views for the deployed site.

Google Analytics 4 is also supported. To enable it, set `VITE_GA_MEASUREMENT_ID` in your frontend environment with your GA4 Measurement ID (for example `G-ABCDEFG123`). The client injects the Google tag only when that variable is present and sends page views on route changes.

To view traffic:

1. Open the Vercel project dashboard for this app.
2. Enable **Analytics** if it is not already on.
3. Deploy the latest build.
4. Review visitors, page views, top pages, referrers, and geography in the Analytics tab.

Notes:
- Analytics does not send production pageview data while running locally in development mode.
- Search Console scripts remain the best source for organic search queries and impressions.
- GA4 stays disabled until `VITE_GA_MEASUREMENT_ID` is configured for the deployed frontend environment.

## Deployment Routing (Vercel)

BrowserRouter requires SPA rewrites on Vercel.
Keep `/api/*` and `/functions/api/*` pass-through, and rewrite all other paths to `/` so deep links like `/pass`, `/login`, and `/dashboard/*` do not 404 on refresh.

## Thank You Page Embed

Use the hosted script to render a claim button into a container with id `showfi-claim`.

Example A (URL param):

```html
<div id="showfi-claim"></div>
<script src="https://<YOUR_DOMAIN>/showfi-claim.js"></script>
```

Example B (merge field):

```html
<div id="showfi-claim" data-token="{{CLAIM_TOKEN}}"></div>
<script src="https://<YOUR_DOMAIN>/showfi-claim.js"></script>
```

## Supabase Setup (Auth + DB + Storage)

Run the SQL migration in `/docs/supabase-schema.sql` in your Supabase project:

1. Open Supabase Dashboard -> SQL Editor.
2. Create a new query, paste the full contents of `/docs/supabase-schema.sql`, and run it.
3. Confirm tables exist: `events`, `ticket_designs`, `issued_tickets`.
4. Confirm bucket exists: `assets` (private).

Notes:
- RLS is enabled on all core tables.
- Policies enforce per-user access using `auth.uid()`.
- Asset object paths are expected under `/<user_id>/<event_id>/...`.

## Testing on iPhone

### Step 1: Validate Configuration

1. Open any web browser
2. Visit: `https://your-app-url.com/api/health?mode=pass`
3. Verify the response shows `"ok": true`
4. If there are errors, review the error message and check your `.env` file

### Step 2: Test Pass Generation

1. Open **Safari** on your iPhone (this MUST be Safari, other browsers won't work)
2. Trigger pass generation from your app or claim flow (`POST /api/pass` or `POST /api/claim`)
3. If successful, you'll see an "Add to Apple Wallet" button/download
4. Tap the button to add the pass to your Apple Wallet
5. The pass should appear in the Wallet app

### Step 3: Verify in Apple Wallet

1. Open the **Wallet** app on your iPhone
2. You should see the test pass with the title "Test Pass"
3. Tap the pass to view details

## Troubleshooting

### "Certificate not found" or "Invalid certificate"

- Make sure you exported the correct certificate from Keychain Access
- Verify the P12 password is correct
- Re-export the certificate and encode it again

### "Pass Type ID mismatch"

- Verify the `APPLE_PASS_TYPE_ID` in `.env` exactly matches the identifier in your Apple Developer account
- Make sure the certificate was created for the correct Pass Type ID

### "Team ID mismatch"

- Verify the `APPLE_TEAM_ID` in `.env` matches your Apple Developer Team ID
- You can find your Team ID in the Apple Developer Portal under "Membership"

### "Invalid signature"

- Download the correct version of the Apple WWDR certificate (G4 or G6)
- Make sure you exported it as a `.pem` file, not `.cer`
- Re-encode the WWDR certificate

### Safari downloads but Wallet rejects the pass

- Check that all three values (Pass Type ID, Team ID, and Organization Name) are correct
- Verify the certificate chain is complete (both P12 and WWDR certificates)
- Make sure the certificate hasn't expired

### "Add to Wallet" button doesn't appear

- You MUST use Safari on iOS - other browsers don't support `.pkpass` files
- Check the network tab in Safari's developer tools for error messages
- Verify the server is returning the correct MIME type: `application/vnd.apple.pkpass`

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## UI Demo (Vite)

### How to run locally

1. Create a `.env` file and set server-side keys documented in `/docs/ENVIRONMENT.md`.
2. Install dependencies:

```bash
npm install
```

3. Start the dev server:

```bash
npm run dev
```

4. Open the UI at `http://localhost:5173`.
5. Choose a `passType` and click **Generate Pass** to download a `.pkpass` file.

## Project Structure

```
api/                 # Vercel API routes (pass, claim, events, registrants, google-save)
lib/                 # Shared server utilities (pass generation, validation, security)
src/                 # Frontend app
supabase/migrations/ # SQL migrations
scripts/             # Local verification scripts
```

## Next Steps

Once you have successfully generated and installed a test pass, you can:

1. Customize the pass appearance (colors, layout, fields)
2. Add dynamic data to passes (QR codes, barcodes, location)
3. Implement pass updates and push notifications
4. Build templates for different pass types
5. Integrate with GHL (Go High Level) or other systems
6. Add pass distribution and tracking

## Resources

- [Apple Wallet Developer Guide](https://developer.apple.com/wallet/)
- [PassKit Package Format Reference](https://developer.apple.com/library/archive/documentation/UserExperience/Reference/PassKit_Bundle/Chapters/Introduction.html)
- [passkit-generator Documentation](https://github.com/alexandercerutti/passkit-generator)

## License

This project is provided as-is for educational and development purposes.
