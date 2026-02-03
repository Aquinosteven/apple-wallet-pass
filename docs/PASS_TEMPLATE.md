# Pass Template v1 (Online Event)

This template defines a simple Apple Wallet pass for online events where the primary action is a Join Link.

## Purpose

- A single event pass that reminds the attendee and provides a one-tap Join Link.
- Designed for online events like webinars, training sessions, or live streams.

## Branding (static per event)

- Organization name
- Event series or program name
- Brand colors (foreground, background, label text)
- Short support text (example: “Questions? contact@company.com”)

## Images (static per event)

- Logo (small square)
- Hero or strip image (wide banner)
- Optional thumbnail or icon

## Content (mostly static per event)

- Event title
- Date and time with time zone
- Duration or end time
- Host or presenter name
- “Join Link” label text (example: “Join Live Session”)
- Optional agenda or short description (1–2 lines)

## Behavior

- Primary action is the Join Link button.
- Link becomes prominent 15 minutes before start time.
- Reminders: 24 hours and 15 minutes before start time.
- Pass expires 2 hours after the end time (or at a set expiration time).
- Fallback text if the Join Link is unavailable (example: “Check your email for the link”).

## Dynamic Per Recipient (personalized data)

- Recipient name (for display)
- Unique Join Link (tokenized URL)
- Recipient email (for auditing or support)
- Optional seat or access tier
- Optional check-in code (if needed for support)
