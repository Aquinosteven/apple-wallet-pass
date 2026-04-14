#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { chromium, devices, webkit } from 'playwright';
import { getEnv, loadLocalEnvFiles } from './env-loader.js';

function requiredEnv(name, fallbackNames = []) {
  const value = getEnv(name, fallbackNames);
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return String(value).trim();
}

function optionalEnv(name, fallbackNames = []) {
  return String(getEnv(name, fallbackNames) || '').trim();
}

function normalizeBaseUrl(raw) {
  const parsed = new URL(String(raw).trim());
  return parsed.toString().replace(/\/$/, '');
}

async function readJsonSafely(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function getAuthToken() {
  const providedToken = optionalEnv('AUTH_TOKEN');
  if (providedToken) return providedToken;

  const email = optionalEnv('QA_EMAIL');
  const password = optionalEnv('QA_PASSWORD');
  if (!email || !password) {
    throw new Error('Set AUTH_TOKEN or QA_EMAIL + QA_PASSWORD to create a fresh claim token');
  }

  const supabaseUrl = requiredEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const anonKey = requiredEnv('VITE_SUPABASE_ANON_KEY', ['SUPABASE_ANON_KEY']);
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(error?.message || 'Failed to get auth token from Supabase');
  }
  return data.session.access_token;
}

async function createClaimToken(baseUrl, authToken, eventId) {
  const timestamp = Date.now();
  const response = await fetch(`${baseUrl}/api/registrants`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventId,
      name: `Wallet Sim ${timestamp}`,
      email: `wallet-sim+${timestamp}@example.com`,
      source: 'wallet_sim',
    }),
  });

  const json = await readJsonSafely(response);
  if (!response.ok || !json?.pass?.claim_token) {
    throw new Error(`Failed to create claim token (${response.status}): ${JSON.stringify(json)}`);
  }

  return {
    claimToken: String(json.pass.claim_token),
    passId: json.pass?.id ? String(json.pass.id) : '',
  };
}

async function runProfile({
  label,
  browserType,
  deviceName,
  claimUrl,
  outputDir,
  expectedPrimaryLabel,
  expectedSecondaryLabel,
  primaryAction,
}) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    ...devices[deviceName],
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const prefix = label.toLowerCase().replace(/\s+/g, '-');
  const consoleEvents = [];
  const failedResponses = [];
  const pageErrors = [];

  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') {
      consoleEvents.push({
        type,
        text: message.text(),
      });
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push({
      message: error instanceof Error ? error.message : String(error),
    });
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (!url.startsWith(claimUrl) && !url.includes('/api/')) return;
    if (response.ok()) return;

    let body = '';
    try {
      body = await response.text();
    } catch {
      body = '';
    }

    failedResponses.push({
      url,
      status: response.status(),
      body: body.slice(0, 500),
    });
  });

  try {
    await page.goto(claimUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Claim your ShowFi pass', { timeout: 15000 });
    await page.screenshot({ path: path.join(outputDir, `${prefix}-claim-preview.png`), fullPage: true });

    await page.getByRole('button', { name: 'Continue / Claim' }).click();
    await page.waitForSelector('text=Pass ready', { timeout: 15000 });

    const primaryButton = page.getByRole('button', { name: expectedPrimaryLabel });
    const secondaryButton = page.getByRole('button', { name: expectedSecondaryLabel });
    await primaryButton.waitFor();
    await secondaryButton.waitFor();

    let primaryResult = null;
    if (primaryAction === 'download') {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }),
        primaryButton.click(),
      ]);
      const suggestedFilename = download.suggestedFilename();
      const downloadPath = path.join(outputDir, `${prefix}-${suggestedFilename}`);
      await download.saveAs(downloadPath);
      primaryResult = {
        type: 'download',
        suggestedFilename,
        downloadPath,
      };
    } else if (primaryAction === 'popup') {
      const [response] = await Promise.all([
        page.waitForResponse((candidate) => candidate.url().includes('/api/google-save'), { timeout: 10000 }),
        primaryButton.click(),
      ]);
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok || typeof payload?.saveUrl !== 'string') {
        throw new Error(`Google Wallet save failed (${response.status()}): ${JSON.stringify(payload)}`);
      }
      const popup = await page.waitForEvent('popup', { timeout: 3000 }).catch(() => null);
      primaryResult = {
        type: 'google-save',
        apiStatus: response.status(),
        saveUrl: payload.saveUrl,
        popupUrl: popup?.url() || null,
      };
      if (popup) {
        await popup.close();
      }
    }

    await page.screenshot({ path: path.join(outputDir, `${prefix}-claim-complete.png`), fullPage: true });

    return {
      label,
      deviceName,
      ok: true,
      claimUrl,
      primaryLabel: expectedPrimaryLabel,
      secondaryLabel: expectedSecondaryLabel,
      primaryResult,
      diagnostics: {
        consoleEvents,
        failedResponses,
        pageErrors,
      },
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function safeRunProfile(config) {
  console.log(`[info] Running ${config.label}`);
  try {
    return await runProfile(config);
  } catch (error) {
    return {
      label: config.label,
      deviceName: config.deviceName,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      diagnostics: {
        consoleEvents: [],
        failedResponses: [],
        pageErrors: [],
      },
    };
  }
}

async function main() {
  loadLocalEnvFiles();

  const baseUrl = normalizeBaseUrl(requiredEnv('BASE_URL', ['VITE_APP_URL']));
  const configuredEventId = optionalEnv('EVENT_ID');
  const outputRoot = path.join(
    process.cwd(),
    'output',
    'playwright',
    `mobile-wallet-claim-sim-${new Date().toISOString().replace(/[:.]/g, '-')}`,
  );
  await mkdir(outputRoot, { recursive: true });

  const providedClaimToken = optionalEnv('CLAIM_TOKEN');
  const authToken = configuredEventId ? await getAuthToken() : '';

  const results = [];
  const profileConfigs = [
    {
      label: 'iPhone Safari Sim',
      browserType: webkit,
      deviceName: 'iPhone 13',
      expectedPrimaryLabel: 'Add to Apple Wallet',
      expectedSecondaryLabel: 'Add to Google Wallet',
      primaryAction: 'download',
    },
    {
      label: 'Android Chrome Sim',
      browserType: chromium,
      deviceName: 'Pixel 7',
      expectedPrimaryLabel: 'Add to Google Wallet',
      expectedSecondaryLabel: 'Download Apple Wallet pass',
      primaryAction: 'popup',
    },
  ];

  let firstProvidedTokenUsed = false;
  let lastClaimToken = providedClaimToken;
  let lastPassId = '';

  for (const config of profileConfigs) {
    let claimToken = '';
    let passId = '';

    if (authToken && configuredEventId) {
      const created = await createClaimToken(baseUrl, authToken, configuredEventId);
      claimToken = created.claimToken;
      passId = created.passId;
    } else if (providedClaimToken && !firstProvidedTokenUsed) {
      claimToken = providedClaimToken;
      firstProvidedTokenUsed = true;
    } else {
      results.push({
        label: config.label,
        deviceName: config.deviceName,
        ok: false,
        error: 'Provide EVENT_ID plus QA credentials/AUTH_TOKEN so the simulator can create a fresh claim for each profile.',
      });
      continue;
    }

    lastClaimToken = claimToken;
    lastPassId = passId;

    results.push(await safeRunProfile({
      ...config,
      claimUrl: `${baseUrl}/claim/${encodeURIComponent(claimToken)}`,
      outputDir: outputRoot,
    }));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    eventId: configuredEventId || null,
    lastClaimToken,
    lastPassId,
    outputRoot,
    results,
    caveat: 'This validates mobile browser/device-profile claim behavior, but it does not replace native Wallet validation on a real iPhone or Android device.',
  };

  const reportPath = path.join(outputRoot, 'report.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const overallOk = results.every((result) => result.ok);

  console.log(JSON.stringify({
    ok: overallOk,
    outputRoot,
    reportPath,
    profiles: results.map((result) => ({
      label: result.label,
      ok: result.ok,
      primaryResult: result.primaryResult || null,
      error: result.error || null,
    })),
  }, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Executable doesn\'t exist')) {
    console.error('[FAIL] Playwright browsers are not installed. Run `npx playwright install chromium webkit` first.');
  } else {
    console.error('[FAIL] Mobile wallet claim simulation failed:', message);
  }
  process.exit(1);
});
