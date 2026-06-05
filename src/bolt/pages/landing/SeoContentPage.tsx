import { ArrowRight, BarChart3, CalendarClock, CheckCircle2, FileText, LucideIcon, MailWarning, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SeoContentPageConfig {
  badge: string;
  title: string;
  description: string;
  primaryCta?: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
  checklist: string[];
  relatedLinks: Array<{
    to: string;
    label: string;
  }>;
  icon: LucideIcon;
}

const sharedRelatedLinks = [
  { to: '/webinar-reminder-software', label: 'Webinar reminder software' },
  { to: '/reduce-webinar-no-shows', label: 'Reduce webinar no-shows' },
  { to: '/wallet-pass-software', label: 'Wallet pass software' },
  { to: '/booked-call-reminders', label: 'Booked call reminders' },
];

export const seoContentPages: Record<string, SeoContentPageConfig> = {
  '/zoom-webinar-reminders': {
    badge: 'Zoom webinar reminders',
    title: 'Last-minute Zoom webinar reminders need a fallback when emails get missed',
    description:
      'Zoom email reminders are useful, but they still live in crowded inboxes. ShowFi.io adds Apple Wallet and Google Wallet fallback visibility so registrants can recover the join path from mobile.',
    sections: [
      {
        title: 'The problem is retrieval, not registration',
        body: 'Most webinar funnels already know how to register people. The drop-off happens when the join link, start time, and confirmation details are hard to find in the final hour.',
      },
      {
        title: 'Wallet passes give the live moment a second surface',
        body: 'A wallet pass can sit beside email, SMS, and calendar reminders as a mobile-native retrieval layer for the session details people need when they are about to join.',
      },
      {
        title: 'Use it as a fallback, not a replacement',
        body: 'The strongest reminder stack keeps Zoom, email, SMS, calendar, and wallet working together instead of betting attendance on one channel.',
      },
    ],
    checklist: [
      'Trigger wallet pass delivery immediately after registration.',
      'Keep the Zoom join path and session time easy to recover.',
      'Send final-hour reminders through more than one channel.',
      'Measure who claims the pass and who still misses the session.',
    ],
    relatedLinks: sharedRelatedLinks,
    icon: CalendarClock,
  },
  '/reduce-webinar-no-shows': {
    badge: 'Webinar no-show reduction',
    title: 'Reduce webinar no-shows by fixing last-minute retrieval',
    description:
      'No-show reduction starts after registration. ShowFi.io helps webinar teams keep the live session visible through wallet pass reminders alongside email, SMS, and calendar flows.',
    sections: [
      {
        title: 'No-shows often come from friction, not bad intent',
        body: 'A registrant can still want to attend and miss the session because the join link is buried, the reminder was skimmed, or the calendar event was not obvious on mobile.',
      },
      {
        title: 'Build a reminder system around the final hour',
        body: 'The closer someone gets to the webinar start time, the more important visibility and retrieval become. Wallet passes help protect that moment.',
      },
      {
        title: 'Measure recovery, not just sends',
        body: 'Track registrations, wallet claims, reminder engagement, attendance, and replay behavior so the no-show problem becomes diagnosable.',
      },
    ],
    checklist: [
      'Confirm the registration and join path instantly.',
      'Add calendar and wallet options before the first reminder email.',
      'Use final-hour reminders for retrieval rather than more promotional copy.',
      'Segment attendees, no-shows, and wallet claimers after the event.',
    ],
    relatedLinks: sharedRelatedLinks,
    icon: BarChart3,
  },
  '/webinar-reminder-sequence-template': {
    badge: 'Reminder sequence template',
    title: 'A webinar reminder sequence template for higher show-up intent',
    description:
      'Coordinate email, SMS, calendar, and wallet reminders so registrants have multiple ways to recover the webinar details before the live session starts.',
    sections: [
      {
        title: 'Immediately after registration',
        body: 'Send confirmation, the calendar invite, and the wallet pass call-to-action while intent is fresh. This is the best moment to make the event recoverable.',
      },
      {
        title: 'One day before',
        body: 'Remind people why the session matters, confirm the start time, and keep the join path obvious. Avoid burying operational details below promotional copy.',
      },
      {
        title: 'Final hour',
        body: 'Prioritize retrieval. The final reminder should make the join path, time, and session identity easy to find from a phone.',
      },
    ],
    checklist: [
      'T-plus 0 minutes: confirmation, calendar, and wallet CTA.',
      'T-minus 24 hours: value reminder and session details.',
      'T-minus 60 minutes: short retrieval-focused reminder.',
      'T-minus 10 minutes: direct join path and wallet fallback.',
    ],
    relatedLinks: sharedRelatedLinks,
    icon: FileText,
  },
  '/why-webinar-reminders-fail': {
    badge: 'Reminder failure analysis',
    title: 'Why webinar reminders break when the inbox gets crowded',
    description:
      'Email-only webinar reminders fail when the join path competes with every other message. ShowFi.io helps teams add a wallet-based retrieval layer for the live moment.',
    sections: [
      {
        title: 'The inbox is a weak final-mile surface',
        body: 'Email is strong for confirmation and context, but weak when someone needs the join path quickly on a busy phone.',
      },
      {
        title: 'More reminders can create more noise',
        body: 'Increasing reminder volume does not always improve attendance. It can train registrants to skim instead of helping them recover the next step.',
      },
      {
        title: 'The fix is channel design',
        body: 'A better system uses email for detail, SMS for urgency, calendar for scheduling, and wallet for mobile retrieval near the event moment.',
      },
    ],
    checklist: [
      'Audit where the join link appears in every reminder.',
      'Separate promotional copy from operational retrieval.',
      'Add wallet and calendar options immediately after registration.',
      'Use attendance data to identify where the reminder stack breaks.',
    ],
    relatedLinks: sharedRelatedLinks,
    icon: MailWarning,
  },
  '/wallet-pass-marketing': {
    badge: 'Wallet pass marketing',
    title: 'Wallet pass marketing for campaigns that need people to come back',
    description:
      'Apple Wallet and Google Wallet passes can support event, webinar, booked-call, and campaign reminders by giving high-intent moments a mobile-native place to live.',
    sections: [
      {
        title: 'Wallet passes are a reminder channel',
        body: 'For attendance-focused campaigns, a pass is more than a ticket. It is a recoverable mobile object tied to a time, place, or next step.',
      },
      {
        title: 'Use wallet after opt-in',
        body: 'The best timing is immediately after someone books, registers, or claims a spot. That is when commitment is high and setup friction is lowest.',
      },
      {
        title: 'Connect wallet behavior to campaign reporting',
        body: 'Track pass claims and downstream attendance so wallet becomes part of the performance system, not just a novelty.',
      },
    ],
    checklist: [
      'Use wallet for webinars, booked calls, challenges, and live events.',
      'Support both Apple Wallet and Google Wallet.',
      'Keep the pass focused on the next action.',
      'Measure claim behavior alongside attendance and conversion.',
    ],
    relatedLinks: [
      { to: '/wallet-pass-software', label: 'Wallet pass software' },
      { to: '/apple-wallet-pass-software', label: 'Apple Wallet pass software' },
      { to: '/google-wallet-pass-software', label: 'Google Wallet pass software' },
      { to: '/event-reminder-software', label: 'Event reminder software' },
    ],
    icon: Wallet,
  },
  '/webinar-show-up-rate-calculator': {
    badge: 'Show-up rate calculator',
    title: 'Calculate the revenue gap hidden in webinar no-shows',
    description:
      'Estimate how much missed attendance costs and why better reminder retrieval can matter when even a small lift in show-up rate changes pipeline.',
    sections: [
      {
        title: 'Start with registration to attendance',
        body: 'Show-up rate is the number of attendees divided by the number of registrants. Small changes compound when the webinar drives calls, demos, or purchases.',
      },
      {
        title: 'Estimate the value of recovered attendees',
        body: 'Multiply additional attendees by conversion rate and average value. That gives the upside of improving retrieval before the live session.',
      },
      {
        title: 'Use the calculator as a prioritization tool',
        body: 'If attendance recovery creates meaningful revenue, the reminder stack deserves the same attention as registration and promotion.',
      },
    ],
    checklist: [
      'Registrants multiplied by current show-up rate equals current attendees.',
      'Registrants multiplied by target show-up rate equals target attendees.',
      'The difference is the recoverable attendance gap.',
      'Recovered attendees multiplied by conversion value estimates upside.',
    ],
    relatedLinks: sharedRelatedLinks,
    icon: BarChart3,
  },
  '/gohighlevel-appointment-reminders': {
    badge: 'GoHighLevel appointment reminders',
    title: 'GoHighLevel appointment reminders that target no-shows',
    description:
      'ShowFi.io adds Apple Wallet and Google Wallet delivery to GoHighLevel appointment reminder workflows for agencies, booked calls, webinars, and events.',
    sections: [
      {
        title: 'GHL workflows can trigger the wallet layer',
        body: 'After a contact books or registers, GoHighLevel can hand off the reminder moment to a wallet pass flow that keeps the next step easier to recover.',
      },
      {
        title: 'Booked-call ghosting is often a visibility issue',
        body: 'If the prospect intended to attend but lost the details, another SMS is not always enough. Wallet gives the appointment a persistent mobile surface.',
      },
      {
        title: 'Agencies need repeatable attendance operations',
        body: 'The same pattern can support sales calls, webinars, workshops, and client events without rebuilding a reminder stack from scratch each time.',
      },
    ],
    checklist: [
      'Trigger pass creation from the booking or registration event.',
      'Store claim and attendance signals on the contact when possible.',
      'Use wallet alongside email and SMS, not instead of them.',
      'Report on no-shows by workflow, campaign, and reminder channel.',
    ],
    relatedLinks: [
      { to: '/booked-call-reminders', label: 'Booked call reminders' },
      { to: '/webinar-reminder-software', label: 'Webinar reminder software' },
      { to: '/wallet-pass-software', label: 'Wallet pass software' },
      { to: '/pricing', label: 'Pricing' },
    ],
    icon: CalendarClock,
  },
};

export function getSeoContentPage(pathname: string) {
  return seoContentPages[pathname] || null;
}

export default function SeoContentPage({ config }: { config: SeoContentPageConfig }) {
  const BadgeIcon = config.icon;

  return (
    <div className="bg-white text-gray-900">
      <section className="border-b border-gray-100 bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)] pt-24 pb-12 lg:pt-28 lg:pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-lg border border-gblue/20 bg-white px-3 py-1 text-xs font-semibold text-gblue">
              <BadgeIcon className="h-4 w-4" />
              {config.badge}
            </div>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              {config.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
              {config.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
              >
                See pricing
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/waitlist"
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                Join waitlist
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {config.sections.map((section) => (
            <div key={section.title} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{section.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-gray-100 bg-[#fbfdff] py-12 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Implementation checklist</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900">Make the reminder stack measurable</h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              These are the operational pieces that turn the page topic into an actual attendance system.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {config.checklist.map((item) => (
              <li key={item} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-600 shadow-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-ggreen" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Related ShowFi.io pages</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {config.relatedLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
