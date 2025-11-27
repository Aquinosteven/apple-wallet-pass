# Apple Wallet Pass Generator

A minimal end-to-end Apple Wallet pass generator built with Bolt Server Functions and your Apple Developer certificates.

## Features

- Generate native `.pkpass` files using your Apple Developer certificates
- Two API endpoints for testing and validation
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

# The base64-encoded P12 certificate (paste the entire base64 string, no line breaks)
APPLE_PASS_CERT_P12_B64=MIIKSAIBAzCCCg...

# The password you set when exporting the P12 certificate
APPLE_PASS_CERT_PASSWORD=your-p12-password

# The base64-encoded WWDR certificate (paste the entire base64 string, no line breaks)
APPLE_WWDR_CERT_PEM_B64=LS0tLS1CRUdJTi...
```

**Important Notes:**
- Do NOT add quotes around the base64 strings
- Do NOT add line breaks in the base64 strings
- Make sure there are no extra spaces before or after the values

## API Endpoints

### Health Check: `/api/test-pass-health`

Validates that all environment variables are configured correctly and certificates can be decoded.

**Request:**
```bash
GET /api/test-pass-health
```

**Response (Success):**
```json
{
  "ok": true,
  "hasP12": true,
  "hasWWDR": true,
  "passTypeId": "pass.com.yourcompany.yourpass",
  "teamId": "ABCD123456",
  "orgName": "Your Company Name"
}
```

**Response (Error):**
```json
{
  "ok": false,
  "hasP12": false,
  "hasWWDR": true,
  "error": "Missing P12 certificate or password: APPLE_PASS_CERT_P12_B64 or APPLE_PASS_CERT_PASSWORD"
}
```

### Generate Test Pass: `/api/test-pass`

Generates and downloads a test `.pkpass` file that can be installed in Apple Wallet.

**Request:**
```bash
GET /api/test-pass
```

**Response:**
- **Success**: Downloads a `test.pkpass` file
- **Error**: Returns JSON with error details

## Testing on iPhone

### Step 1: Validate Configuration

1. Open any web browser
2. Visit: `https://your-app-url.com/api/test-pass-health`
3. Verify the response shows `"ok": true`
4. If there are errors, review the error message and check your `.env` file

### Step 2: Test Pass Generation

1. Open **Safari** on your iPhone (this MUST be Safari, other browsers won't work)
2. Visit: `https://your-app-url.com/api/test-pass`
3. If successful, you'll see an "Add to Apple Wallet" button
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

## Project Structure

```
functions/
├── api/
│   ├── test-pass.ts           # Main pass generation endpoint
│   └── test-pass-health.ts    # Health check endpoint
├── util/
│   ├── certificates.ts        # Certificate loading and validation
│   └── passBuilder.ts         # Pass JSON template builder
└── assets/
    ├── icon.png               # Pass icon (29x29 to 87x87)
    └── logo.png               # Pass logo (160x50 recommended)
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
