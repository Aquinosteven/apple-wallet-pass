# UI QA Agent

This repo now includes a reusable Codex-driven browser QA runner for website, signup, and UX testing.

## What it does

The runner launches a Codex sub-agent that:

- uses Playwright CLI to drive a real browser
- tests public routes such as `/` and `/pricing`
- attempts to create a fresh account on `/login`
- continues through persona and plan steps when available
- captures screenshots for bugs and UX issues
- writes a structured bug report under `output/qa/`

## Quick start

1. Start the app locally.

```bash
npm run dev
```

2. In a second terminal, run the QA agent.

```bash
npm run qa:ui
```

3. Review the generated files.

- Bug reports: `output/qa/`
- Browser screenshots and artifacts: `output/playwright/`

## Useful environment overrides

You can point the agent at local, preview, or production environments.

```bash
QA_BASE_URL=http://127.0.0.1:5173 npm run qa:ui
QA_BASE_URL=https://your-preview-url.vercel.app npm run qa:ui
```

You can also provide your own test credentials.

```bash
QA_TEST_EMAIL=qa+signup@example.com QA_PASSWORD='Password123!' npm run qa:ui
```

## Notes about this app

- Full signup testing depends on working Supabase auth configuration.
- Checkout testing depends on the billing route being reachable and usable in the selected environment.
- If email confirmation, billing, or backend configuration blocks the flow, the agent is instructed to report that blocker instead of faking a pass.

## Files

- Runner: `/Users/stevenaquino/Documents/GitHub/apple-wallet-pass/scripts/run-ui-qa-agent.sh`
- Guide: `/Users/stevenaquino/Documents/GitHub/apple-wallet-pass/docs/UI_QA_AGENT.md`
