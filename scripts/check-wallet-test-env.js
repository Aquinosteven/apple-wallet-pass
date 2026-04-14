#!/usr/bin/env node

import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium, webkit } from 'playwright';

const execFileAsync = promisify(execFile);

async function canAccess(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function commandExists(command) {
  try {
    const { stdout } = await execFileAsync('zsh', ['-lc', `command -v ${command}`]);
    return Boolean(String(stdout || '').trim());
  } catch {
    return false;
  }
}

async function canRunSimctl() {
  try {
    await execFileAsync('xcrun', ['simctl', 'list', 'devices']);
    return true;
  } catch {
    return false;
  }
}

async function checkBrowser(label, launcher) {
  try {
    const browser = await launcher.launch({ headless: true });
    await browser.close();
    return { ok: true, detail: `${label} is ready` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: message };
  }
}

async function main() {
  const results = [];
  const push = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`[${ok ? 'PASS' : 'WARN'}] ${name}${detail ? ` - ${detail}` : ''}`);
  };

  push('Node available', true, process.version);
  push('Playwright package installed', await canAccess('node_modules/playwright/package.json'), 'node_modules/playwright');

  const chromiumResult = await checkBrowser('Chromium', chromium);
  push('Chromium browser runtime', chromiumResult.ok, chromiumResult.detail);

  const webkitResult = await checkBrowser('WebKit', webkit);
  push('WebKit browser runtime', webkitResult.ok, webkitResult.detail);

  const xcodebuild = await commandExists('xcodebuild');
  const simctl = await canRunSimctl();
  push('Xcode installed', xcodebuild, xcodebuild ? 'xcodebuild found' : 'Install full Xcode for iOS Simulator support');
  push('iOS Simulator tooling', simctl, simctl ? 'simctl available' : 'iOS Simulator not available from this host');

  const adb = await commandExists('adb');
  const emulator = await commandExists('emulator');
  push('Android Debug Bridge', adb, adb ? 'adb found' : 'Install Android platform-tools for device/emulator access');
  push('Android Emulator', emulator, emulator ? 'emulator found' : 'Install Android Studio / emulator tooling for Android device simulation');

  console.log('\nRecommended next steps');
  if (!chromiumResult.ok || !webkitResult.ok) {
    console.log('- Run `npx playwright install chromium webkit` to enable local browser-based wallet simulations.');
  }
  if (!xcodebuild || !simctl) {
    console.log('- Install full Xcode and Simulator if you want local iPhone Safari / Wallet import checks.');
  }
  if (!adb || !emulator) {
    console.log('- Install Android Studio plus platform-tools if you want local Android browser/emulator coverage.');
  }
  console.log('- Use `npm run qa:wallet:claim-sim` for repeatable iPhone/Android claim smoke tests.');
}

main().catch((error) => {
  console.error('[FAIL] Wallet test environment check crashed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
