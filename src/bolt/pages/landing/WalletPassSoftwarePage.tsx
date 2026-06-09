import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LucideIcon,
  Megaphone,
  Presentation,
  Ticket,
  Users,
  WalletCards,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface SolutionCard {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  details: string[];
}

const functionSolutions: SolutionCard[] = [
  {
    title: 'Webinar attendance',
    description: 'Keep the join path visible after someone registers, especially in the final hour before start.',
    icon: Presentation,
    href: '/webinar-reminder-software',
    details: ['Registration follow-up', 'Final-hour retrieval', 'No-show reporting'],
  },
  {
    title: 'Booked calls',
    description: 'Give booked prospects a mobile-friendly reminder layer for demos, consultations, and sales calls.',
    icon: CalendarClock,
    href: '/booked-call-reminders',
    details: ['Demo reminders', 'Consultation flows', 'GHL appointment support'],
  },
  {
    title: 'Live events',
    description: 'Make event time, location, and ticket details easier to recover from Apple Wallet or Google Wallet.',
    icon: Ticket,
    href: '/event-reminder-software',
    details: ['Tickets and check-in', 'Venue details', 'Attendance tracking'],
  },
  {
    title: 'Challenge and workshop funnels',
    description: 'Protect multi-day or cohort-based campaigns where attendance drops when reminders get buried.',
    icon: ClipboardList,
    details: ['Day-by-day reminders', 'Mobile retrieval', 'Segment follow-up'],
  },
];

const businessSolutions: SolutionCard[] = [
  {
    title: 'Marketing agencies',
    description: 'Add a wallet reminder offer to client webinar, challenge, and appointment funnels.',
    icon: Megaphone,
    details: ['Client workspaces', 'Reusable workflows', 'Show-rate proof'],
  },
  {
    title: 'Course and webinar teams',
    description: 'Improve live attendance for educational launches, trainings, and recurring sessions.',
    icon: Users,
    details: ['Launch events', 'Evergreen webinars', 'Replay segmentation'],
  },
  {
    title: 'Sales-led businesses',
    description: 'Reduce missed demos and consultations after a lead has already booked time.',
    icon: Briefcase,
    details: ['High-intent calls', 'Pipeline visibility', 'No-show reduction'],
  },
  {
    title: 'Event operators',
    description: 'Use wallet passes for attendee access, event reminders, and post-event attribution.',
    icon: BadgeCheck,
    details: ['Registrant claim flows', 'Check-in signals', 'Follow-up exports'],
  },
];

const channelLinks = [
  {
    title: 'Apple Wallet pass software',
    description: 'For iPhone audiences that expect tickets, events, and passes to live in Apple Wallet.',
    to: '/apple-wallet-pass-software',
  },
  {
    title: 'Google Wallet pass software',
    description: 'For Android coverage when your funnel needs the same reminder path across devices.',
    to: '/google-wallet-pass-software',
  },
  {
    title: 'GoHighLevel reminders',
    description: 'For GHL appointment and campaign workflows that need a stronger post-booking layer.',
    to: '/gohighlevel-appointment-reminders',
  },
  {
    title: 'Reduce webinar no-shows',
    description: 'For teams diagnosing attendance leaks after registration is already working.',
    to: '/reduce-webinar-no-shows',
  },
  {
    title: 'Zoom webinar reminders',
    description: 'For webinar teams that need a fallback when confirmation emails are missed.',
    to: '/zoom-webinar-reminders',
  },
  {
    title: 'Reminder sequence template',
    description: 'For planning email, SMS, calendar, and wallet reminders around the same attendance moment.',
    to: '/webinar-reminder-sequence-template',
  },
];

function SolutionGrid({ items }: { items: SolutionCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map(({ title, description, icon: Icon, href, details }) => {
        const content = (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gblue/10">
                <Icon className="h-5 w-5 text-gblue" />
              </div>
              {href && <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-300" />}
            </div>
            <h3 className="mt-5 text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
            <ul className="mt-5 grid gap-2">
              {details.map((detail) => (
                <li key={detail} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-ggreen" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </>
        );

        if (href) {
          return (
            <Link
              key={title}
              to={href}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gblue/30 hover:shadow-md"
            >
              {content}
            </Link>
          );
        }

        return (
          <div key={title} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            {content}
          </div>
        );
      })}
    </div>
  );
}

export default function WalletPassSoftwarePage() {
  const checkoutHref = '/login?mode=signup&plan=solo_monthly_v1';

  return (
    <div className="bg-white">
      <section className="border-b border-gray-100 bg-[#f8fbff] pt-24 pb-14 lg:pt-28 lg:pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-gblue/15 bg-white px-3 py-1 text-xs font-semibold text-gblue">
                <WalletCards className="h-4 w-4" />
                Solutions
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Wallet pass reminders for the moments people need to show up
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
                ShowFi helps teams add Apple Wallet and Google Wallet passes to webinars, booked calls, live events,
                and high-intent funnels where attendance turns into revenue.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 rounded-lg bg-gblue px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gblue-dark"
                >
                  See pricing
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to={checkoutHref}
                  className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  Start checkout
                </Link>
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border border-gblue/10 bg-white p-5 shadow-sm">
              {[
                ['1', 'Someone registers, books, or buys.'],
                ['2', 'ShowFi creates a wallet pass for the attendance moment.'],
                ['3', 'Your team tracks claims, attendance, and follow-up segments.'],
              ].map(([step, copy]) => (
                <div key={step} className="flex gap-3 rounded-lg bg-gray-50 p-4">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gblue text-xs font-bold text-white">
                    {step}
                  </span>
                  <p className="text-sm leading-relaxed text-gray-700">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">By function</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Pick the attendance workflow you need to protect
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              The common thread is not the format. It is the gap between a confirmed action and the live moment when
              the person has to find the next step.
            </p>
          </div>
          <div className="mt-8">
            <SolutionGrid items={functionSolutions} />
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-gray-50 py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">By business type</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Built for teams that already create demand
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              ShowFi is most useful after interest exists: a registrant, a booked prospect, a ticket holder, or an
              attendee who needs a cleaner path back to the event.
            </p>
          </div>
          <div className="mt-8">
            <SolutionGrid items={businessSolutions} />
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Channels and plays</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Go deeper into the exact use case
              </h2>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                Use these guides when you already know the channel, integration, or no-show problem you are trying to
                fix.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {channelLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-gblue/30 hover:shadow-sm"
                >
                  <h3 className="text-sm font-semibold text-gray-900">{link.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{link.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-gray-900 px-6 py-10 text-center sm:px-10">
            <BarChart3 className="mx-auto h-8 w-8 text-ggreen" />
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              If attendance is part of the conversion, make it measurable.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/70">
              Track wallet claims, attendance, no-shows, and follow-up segments in one workflow instead of guessing
              which reminder got people there.
            </p>
            <div className="mt-7">
              <Link
                to={checkoutHref}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
              >
                Start checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
