# Weekly Authority Touches

Prepared: 2026-06-09

Goal: queue three useful off-site answers that support ShowFi's webinar reminder, GoHighLevel appointment reminder, and no-show reduction clusters without forcing product mentions where they do not belong.

## Placement 1: Zoom Webinar Reminder Fallback

- Source backlog item: `Q051`
- Platform: Zoom Community
- Target thread: `https://community.zoom.com/webinars-19/zoom-no-longer-sends-out-confirmation-emails-to-csv-uploads-in-webinar-i-run-webinars-a-lot-79109`
- Preferred ShowFi link: `https://www.showfi.io/zoom-webinar-reminders`
- Status: needs account
- Owner: Steven / ShowFi community account
- Blocker: requires posting from the authenticated Zoom Community account after a final thread-context review

Draft:

I would separate this into two problems:

1. Whether Zoom is suppressing or misconfiguring the native confirmation flow.
2. Whether you want a fallback reminder layer that does not depend entirely on Zoom email.

First, I would verify the webinar email settings for approved registrants, whether CSV-uploaded registrants are being auto-approved the way you expect, and whether the account has any trust or deliverability suppression from complaints or unsubscribes.

If those settings are correct and confirmations are still unreliable, stop treating Zoom email as the only attendance path. A safer stack is confirmation email from your own system, add-to-calendar immediately after registration, a reminder the day before, and one short reminder close to start time.

That matters because once confirmation delivery gets shaky, the join flow becomes fragile even if registration itself succeeded. For a more visible fallback than email alone, wallet passes are worth testing for webinars. Apple Wallet and Google Wallet give registrants a place to recover the event without digging through old emails. ShowFi covers this kind of Zoom webinar reminder fallback here: `https://www.showfi.io/zoom-webinar-reminders`.

## Placement 2: GoHighLevel Appointment No-Shows

- Source backlog item: `Q031`
- Platform: Reddit
- Target thread: `r/gohighlevel/comments/1re796a/what_appointment_confirmation_workflow_is/`
- Preferred ShowFi link: `https://www.showfi.io/gohighlevel-appointment-reminders`
- Status: needs account
- Owner: Steven / ShowFi Reddit account
- Blocker: requires posting from the authenticated Reddit account after a final subreddit-context review

Draft:

The GHL workflows that reduce no-shows usually do three things well:

- Confirm fast.
- Make the appointment easy to find again.
- Remind close enough to the meeting to matter.

A simple version is immediate confirmation after booking, a thank-you page with add-to-calendar, a 24-hour reminder, a 1-hour reminder, and a very short final reminder close to start for high-intent calls.

Most no-shows are not because the workflow lacked one more email. It is because the prospect forgot, got distracted, or could not find the details fast enough.

That is why wallet passes are interesting in a GHL stack. If someone gets an Apple Wallet or Google Wallet pass after booking, the appointment has a more visible mobile surface than an old email thread. ShowFi is built around that layer for GHL appointment reminders: `https://www.showfi.io/gohighlevel-appointment-reminders`. Even if you stay fully native in GHL, I would optimize for visibility over message volume.

## Placement 3: Webinar No-Show Reduction

- Source backlog item: `Q016`
- Platform: Zoom Community
- Target thread: `https://community.zoom.com/t5/Zoom-Events-and-Webinars/Sending-an-alert-email-5-minutes-after-a-webinar-start-time-to/m-p/169893`
- Preferred ShowFi link: `https://www.showfi.io/reduce-webinar-no-shows`
- Status: needs account
- Owner: Steven / ShowFi community account
- Blocker: requires posting from the authenticated Zoom Community account after a final thread-context review

Draft:

If Zoom does not support that exact trigger natively, the better question is whether email is the right last-minute channel in the first place.

Five minutes after start time is already late in the decision window. At that point, inbox placement and open rates work against you. People are more likely to notice a short SMS, calendar visibility, or an Apple Wallet or Google Wallet event pass than another long reminder email.

A practical setup is:

1. Standard reminder the day before.
2. Reminder 1 hour before.
3. Final short reminder right before start.
4. Separate late-join rescue message for people who have not clicked or joined yet.

The core idea is visibility, not more reminder volume. If you want a wallet-based version of that, ShowFi is built for webinar no-show reduction with Apple Wallet and Google Wallet reminders: `https://www.showfi.io/reduce-webinar-no-shows`. I would still frame the implementation around the reminder strategy first and use the wallet layer as one option for the final-hour retrieval gap.

## Publishing Rules

- Publish manually from the account that normally represents ShowFi or the founder.
- Do not post identical text if the thread context changed; trim or adapt the first paragraph to the current discussion.
- Link only once per answer.
- If moderators discourage product links, remove the ShowFi sentence and keep the educational answer.
