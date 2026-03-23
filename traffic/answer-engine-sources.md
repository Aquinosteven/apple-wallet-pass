# ShowFi Answer Engine

Last updated: 2026-03-22

## Goal

Build a durable, non-spammy answer pipeline that finds high-intent public questions, drafts genuinely useful responses, and only mentions ShowFi when wallet-pass visibility is a real fit.

## Operating Principles

- Solve the problem first.
- Mention ShowFi only when the question is explicitly about reminder visibility, Apple Wallet, Google Wallet, GoHighLevel reminder workflows, or alternatives to email-only reminders.
- Never fake customer stories, performance claims, or personal anecdotes.
- Never paste the same answer across multiple sites.
- Default hostile or unclear platforms to `draft_only`.
- Prefer one strong answer over ten weak ones.

## Continuous Discovery Workflow

1. Search weekly across public threads using query clusters below.
2. Capture each result into `traffic/answer-engine-queue.csv`.
3. Deduplicate by canonical topic plus platform.
4. Score each opportunity on five dimensions:
   - `intent`: how clearly the asker wants a solution now
   - `freshness`: how recent or still-active the thread is
   - `authority`: platform visibility and indexing value
   - `buyer_fit`: agency, marketer, webinar, event, or GoHighLevel alignment
   - `permission`: how safe it is to answer without looking spammy
5. Draft only the highest-scoring opportunities.
6. Review platform rules before posting.
7. After posting, update:
   - `posting_status`
   - `answer_url`
   - `posted_date`
   - `traffic_quality`
   - `follow_up_notes`

## Query Bank

### Core problem queries

- `"improve webinar attendance" forum`
- `"reduce no-shows" "sales calls" forum`
- `"best way to remind people about a live event" forum`
- `"event reminders more visible" forum`
- `"alternatives to email reminders" webinar forum`

### Wallet-native queries

- `"Apple Wallet" event reminders`
- `"Google Wallet" event reminders`
- `"wallet pass" webinar reminders`
- `"Apple Wallet pass software" forum`
- `"Google Wallet support" events forum`

### GoHighLevel queries

- `"GoHighLevel" no-show reminders`
- `"GoHighLevel" appointment reminder workflow`
- `"GoHighLevel" add to calendar thank you page`
- `"GoHighLevel" webinar reminder`
- `"GoHighLevel" event attendance tracking`

### Platform-specific searches

- `site:community.hubspot.com webinar attendance reminder`
- `site:community.zoom.com webinar reminder no-show`
- `site:community.zapier.com no-show calendly reminder`
- `site:stackoverflow.com Apple Wallet pass notification question`
- `site:reddit.com/r/gohighlevel reminder no-show`
- `site:reddit.com/r/marketing webinar attendance`
- `site:reddit.com/r/digital_marketing webinar no-shows`

## Scoring Rubric

Score each field from `1` to `5`.

- `5 intent`: direct request for tooling, workflow, or reminder strategy
- `5 freshness`: recent thread or evergreen thread with active search demand
- `5 authority`: indexed, trusted, and likely to rank
- `5 buyer_fit`: agencies, marketers, webinar teams, event operators, or GHL users
- `5 permission`: platform welcomes practical answers and moderate brand disclosure

Recommended actions by total score:

- `22-25`: draft now
- `18-21`: draft if angle is unique
- `14-17`: monitor or short-answer only
- `<=13`: archive unless it is strategically important

## Platform Modes

| Platform | Default mode | Brand/link posture | Notes |
| --- | --- | --- | --- |
| Reddit | `draft_only` | Mention ShowFi only if directly relevant and with light disclosure | Strong anti-spam norms. Keep tone conversational and non-promotional. |
| HubSpot Community | `manual_review` | Product mention allowed only when it directly answers the workflow gap | Practical step-by-step answers do best. |
| Zoom Community | `manual_review` | Use neutral troubleshooting tone | Best for operational questions about reminders and follow-up. |
| Zapier Community | `manual_review` | Prefer workflow logic over product mentions | Good place for integration-based answers. |
| Stack Overflow | `manual_review` | No marketing. No ShowFi mention unless the question literally asks for software options and it stays technical | Focus on exact technical behavior. |
| Quora | `monitor_only` | Human-reviewed only | High moderation and repetition risk. |

## ShowFi Mention Rules

Say `yes` only when all are true:

- The thread is about attendance, no-shows, reminder visibility, wallet passes, or GHL reminder workflows.
- The answer still stands on its own without the mention.
- The mention can be one short paragraph, not the whole answer.
- The wording is transparent, for example: `If you specifically want Apple Wallet + Google Wallet passes, ShowFi is built for that use case.`

Say `no` when:

- The thread is purely technical and vendor-neutral.
- The user is asking for a native platform workaround.
- The answer would feel like a category hijack.

## Quality Controls

- No automation against platforms that disallow it.
- No duplicate answer bodies across sites.
- No more than one published answer per platform per day without manual review.
- No product link unless it adds real next-step value.
- No answer shorter than the problem warrants.
- No answer posted if the thread is clearly abandoned, off-topic, or support-only.

## Memory And Deduping

Use these fields in the queue to avoid repetition:

- `canonical_topic`
- `angle`
- `showfi_mention`
- `draft_id`
- `posting_status`

Do not write a new draft when an existing draft already covers:

- the same platform
- the same question intent
- the same wallet-pass angle

Instead, fork the old draft and change:

- opening sentence
- examples
- tactical steps
- CTA or no-CTA ending

## Current Source Mix

Seed opportunities captured on 2026-03-20 and refreshed on 2026-03-21 from:

- HubSpot Community
- Zoom Community
- Zapier Community
- Reddit
- Stack Overflow

This seed set is intentionally weighted toward:

- webinar attendance
- booked-call no-shows
- GoHighLevel reminder workflows
- wallet-pass implementation questions

## Recent Discovery Notes

- Zoom Community surfaced a fresh March 3, 2026 webinar-ops thread about confirmation emails no longer reaching CSV-uploaded registrants. Treat it as a high-intent manual-review opportunity because the OP explicitly asks for workarounds and alternative platforms.
- Zoom Community surfaced a March 5, 2026 thread asking how to track attendee identity for a livestreamed webinar when registration is turned off. It is a strong manual-review opportunity for attendance instrumentation guidance because the answer is operationally useful, buyer-adjacent, and should stay vendor-neutral.
- HubSpot Community surfaced a June 17, 2025 Sakari timing question that is useful for booked-call no-show education. The best answer is workflow-property based, not product-led.
- Stack Overflow surfaced two current wallet implementation questions worth drafting against primary docs:
  - Apple Wallet `relevantDates` behavior on iOS 18.6.x
  - Google Wallet button flow with a custom validation redirect before the save URL
- Rejected this run:
  - a March 10, 2026 Zapier thread about duplicate Slack notifications from GoHighLevel appointment booking because it is more troubleshooting than reminder/attendance intent
  - several recent Reddit and niche-forum posts that were self-promotional, discussion-led, or too far from the current attendance/reminder campaign
- For Apple Wallet positioning, keep using Apple's relevance language: relevance helps Wallet surface passes when useful and is not the same as a standard notification.
- For Google Wallet positioning, keep using Google's button/link guidance: the official Add to Google Wallet button should trigger the signed `pay.google.com/gp/v/save/...` flow even if JWT generation happens server-side first.

## Review Checklist Before Posting

- Is the question still answerable and publicly visible?
- Does the answer solve the issue without needing ShowFi?
- If ShowFi is mentioned, is the mention brief and clearly relevant?
- Would a neutral moderator read this as helpful instead of promotional?
- Has this topic already been answered recently by ShowFi?
