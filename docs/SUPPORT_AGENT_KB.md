# Support Agent Knowledge Base

This document is the starting knowledge base for a customer support agent answering ShowFi questions. It is based on the current product copy, setup flows, and support surfaces already in this repo.

## Current state

There is not currently a dedicated public help center in the product.

What does exist today:

- Technical setup documentation in the repo for developers and operators
- A customer-facing pricing FAQ on the marketing site
- An in-app GoHighLevel setup wizard
- A support ticket flow in the dashboard backed by `/api/support`

## Primary sources in this repo

- `README.md`
- `docs/ENVIRONMENT.md`
- `docs/GHL_OAUTH_SETUP.md`
- `docs/PASS_TEMPLATE.md`
- `docs/mobile-wallet-qa.md`
- `src/bolt/pages/pricing/pricingContent.ts`
- `src/bolt/pages/dashboard/GhlConnectPage.tsx`
- `src/bolt/pages/dashboard/SupportPage.tsx`
- `api/support.js`

## Product summary

ShowFi helps teams issue and automate Apple Wallet and Google Wallet passes for campaigns, events, booked calls, webinars, and similar flows. It includes pass issuance, claim flows, attendee tracking, GoHighLevel integration, signed webhooks, and support for operational troubleshooting.

## Support channels today

- Logged-in users can submit tickets from the dashboard Support page.
- Tickets are stored in the `support_tickets` table and routed through the mail provider to `hello@showfi.io`.
- Pricing and sales inquiries are currently directed to `hello@showfi.io`.

## Customer-facing answers

### What does ShowFi do?

ShowFi lets businesses create wallet passes and distribute them through campaign or event workflows. It supports both Apple Wallet and Google Wallet and includes claim flows, integrations, and operational tracking.

### Which wallets are supported?

- Apple Wallet
- Google Wallet

### What kinds of workflows are supported?

- Events
- Webinars
- Booked calls
- Challenge funnels
- CRM-triggered issuance flows

### Is there a free trial?

Not currently. The pricing FAQ says new activations are paused temporarily and users should join the waitlist to be contacted when onboarding reopens.

### How long does setup take?

The pricing FAQ says most teams can configure templates and launch their first pass-enabled flow the same day.

### Which support channels are included?

Email support is included for Pro customers, with escalation support for production-impacting issues.

### Do you support agencies?

Yes. The pricing FAQ says agencies can manage multiple workflows and accounts and should contact the team for higher-volume and advanced onboarding needs.

### Can a customer book a demo?

Yes. Customers who need a walkthrough, architecture review, or volume planning should use the demo/contact-sales path.

## Setup guidance

### Apple Wallet setup

Customers or operators need:

- An Apple Developer account
- A Pass Type ID
- Wallet signing certificates
- Environment configuration for signing

The repo currently documents this in technical detail in `README.md`. That content is useful for internal support, but it is not yet packaged as a customer help-center article.

### Google Wallet setup

Google Wallet support depends on issuer and service-account configuration. The repo documents the required environment variables and the health-check flow in `README.md`.

### GoHighLevel setup

The clearest customer-usable setup flow today is the in-app GoHighLevel wizard plus the deeper operator guide in `docs/GHL_OAUTH_SETUP.md`.

High-level flow:

1. Save the location API key or start the OAuth install flow.
2. Verify the connection.
3. Create the standard ShowFi custom fields.
4. Configure the webhook with the shared secret header.
5. Run a test and review diagnostics.

### Support ticket setup

Customers can submit:

- requester name
- requester email
- subject
- message

The system validates those fields, creates a ticket, and attempts to send a support email notification.

## Common troubleshooting answers

### The GoHighLevel webhook is failing

Check:

- The webhook includes `x-ghl-secret`
- The secret matches `GHL_PASS_SECRET`
- The correct `locationId` is being used
- The location has a valid installation or API-key-based setup

If claim issuance succeeds but CRM writeback fails, current behavior is fail-open. The claim flow can still work while support investigates writeback separately.

### No installation exists for the GoHighLevel location

Current documented behavior is that claim issuance can still succeed, but GHL writeback is skipped until the location is properly connected.

### A customer asks where the help center is

There is no dedicated help-center experience yet. Current support content is split across:

- pricing FAQ
- dashboard support flow
- in-app integration setup
- internal technical docs

## Escalation guidance

Escalate to human support when:

- Production issuance is blocked
- Apple Wallet or Google Wallet signing is failing
- GoHighLevel writeback is failing for a live customer
- The issue involves billing, account ownership, or custom limits
- The user needs architecture review, onboarding help, or SLA discussion

## Gaps before deploying a customer support agent

The repo has enough material to create a first-pass support agent, but not a polished help center yet.

Biggest gaps:

- No dedicated public help-center content or article library
- Setup docs are mostly technical and internal-facing
- No single source of truth for customer-safe troubleshooting language
- No explicit escalation policy doc for the agent
- No curated FAQ for onboarding, billing, integrations, and launch readiness in one place

## Recommended next docs to create

- Customer onboarding guide
- GoHighLevel setup article
- Apple Wallet setup article
- Google Wallet setup article
- Troubleshooting FAQ
- Billing and plan FAQ
- Escalation and handoff policy for support agents

## Suggested agent scope

Safe for the agent to answer:

- What the product does
- Which wallets and workflows are supported
- Basic pricing FAQ answers
- Basic setup steps
- First-pass troubleshooting for GoHighLevel setup and webhooks
- How to contact support or submit a ticket

Should route to human support:

- Billing disputes
- Certificate and signing failures requiring environment access
- Production incidents
- Account changes
- Custom architecture advice
- Anything requiring database or admin inspection
