import type { ReactNode } from 'react';
import { BookOpen, ChevronRight, CheckCircle2, LifeBuoy, Mail, Plug, ShieldCheck, Smartphone, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

const quickLinks = [
  {
    title: 'Connect GoHighLevel',
    description: 'Set up your location connection, shared secret, custom fields, and test webhook delivery.',
    href: '/dashboard/integrations/ghl',
    icon: Plug,
  },
  {
    title: 'Contact Support',
    description: 'Open a ticket if you are blocked on setup, billing, or a live production issue.',
    href: '/dashboard/support',
    icon: LifeBuoy,
  },
];

const setupGuides = [
  {
    title: 'Launch your first pass flow',
    points: [
      'Create an event or campaign workflow in the dashboard.',
      'Set up your pass template, branding, and claim experience.',
      'Test the claim flow before sending traffic.',
      'Use reporting to confirm passes are being issued and claimed as expected.',
    ],
  },
  {
    title: 'Apple Wallet requirements',
    points: [
      'Apple Wallet support requires an Apple Developer account, a Pass Type ID, and signing certificates.',
      'Your signing credentials must be configured server-side before Apple Wallet pass generation can succeed.',
      'If Apple Wallet issuance fails, support will usually need to verify certificate and environment configuration.',
    ],
  },
  {
    title: 'Google Wallet requirements',
    points: [
      'Google Wallet support depends on issuer setup plus a configured service account.',
      'Google Wallet actions should only be shown after health checks are passing.',
      'If Google Wallet save links stop working, support should verify issuer and service-account configuration first.',
    ],
  },
  {
    title: 'GoHighLevel setup',
    points: [
      'Connect your location from Integrations and verify the connection before sending live traffic.',
      'Create the standard ShowFi custom fields so claim and wallet telemetry can write back cleanly.',
      'Add the shared secret header to the webhook action so ShowFi accepts the request.',
      'Run the built-in test after setup and confirm contact writeback is working.',
    ],
  },
];

const firstLaunchSteps = [
  {
    title: 'Step 1: Start your event',
    href: '/dashboard/events/new',
    points: [
      'Open New Event and enter the event name, type, date, time, and timezone.',
      'Add the main attendee action, like Join Webinar or Join Call.',
      'Include your website, organizer name, and support contact so the pass is self-explanatory.',
    ],
  },
  {
    title: 'Step 2: Configure pass behavior',
    href: '/dashboard/events/new',
    points: [
      'Choose when the pass becomes relevant so it appears at the right time on the attendee device.',
      'Set post-event behavior such as doing nothing, expiring the pass, or updating the destination link.',
      'Decide whether the pass can update after issuance and whether check-in should be enabled.',
    ],
  },
  {
    title: 'Step 3: Design the pass',
    href: '/dashboard/events/new',
    points: [
      'Upload a logo and strip image if you want branded visuals on the pass.',
      'Set background and text colors, or keep auto-contrast on for safer readability.',
      'Choose whether date, action, organizer, and QR fields show on the front of the pass.',
    ],
  },
  {
    title: 'Step 4: Publish and test',
    href: '/dashboard/reporting',
    points: [
      'Publish the event once the event details and pass design are ready.',
      'Run through the claim flow yourself before sending traffic to customers.',
      'Use reporting to confirm issuance and claim behavior after launch.',
    ],
  },
];

const setupArticles = [
  {
    title: 'Account and wallet setup',
    body:
      'Before Apple Wallet or Google Wallet can work in production, the wallet credentials behind your account must be configured correctly. Apple Wallet requires Apple Developer signing assets. Google Wallet requires issuer and service-account setup.',
    bullets: [
      'If Apple Wallet signing fails, the issue is usually certificate or environment related.',
      'If Google Wallet links fail, verify the issuer and service-account configuration first.',
      'These credentials are typically configured once, then reused across campaigns.',
    ],
  },
  {
    title: 'GoHighLevel integration setup',
    body:
      'If you are issuing passes from CRM activity, connect GoHighLevel before going live. The main success criteria are a valid location connection, standard custom fields, and a signed webhook setup.',
    bullets: [
      'Verify the connected location before using live workflows.',
      'Add the x-ghl-secret header so ShowFi accepts inbound webhook requests.',
      'Run the integration test and confirm writeback on a real test contact.',
    ],
  },
  {
    title: 'Usage setup for your first live campaign',
    body:
      'A clean first launch usually means one well-defined event, one clear attendee action, and one full end-to-end test before traffic starts. Keep the setup simple for the first pass flow, then add more automation later.',
    bullets: [
      'Start with a single campaign or event instead of several variants.',
      'Use a working join URL or destination URL before publishing.',
      'Confirm support contact and organizer fields are customer-ready.',
    ],
  },
];

const usageTopics = [
  {
    title: 'What ShowFi supports',
    icon: Wallet,
    items: [
      'Apple Wallet and Google Wallet pass issuance',
      'Campaign, webinar, booked-call, and event reminder workflows',
      'Claim links, attendee tracking, and CRM-triggered automation',
    ],
  },
  {
    title: 'What is included in support',
    icon: Mail,
    items: [
      'Email support for implementation help and issue triage',
      'Launch guidance for first live campaigns',
      'Escalation help for production-impacting issues',
    ],
  },
  {
    title: 'When to contact support',
    icon: ShieldCheck,
    items: [
      'A live issuance flow is blocked',
      'Wallet signing is failing',
      'GoHighLevel webhook delivery or writeback is failing',
      'You need billing, onboarding, or higher-volume guidance',
    ],
  },
];

const faqs = [
  {
    question: 'My GoHighLevel webhook is not working.',
    answer:
      'Confirm the webhook includes the x-ghl-secret header, the secret matches your ShowFi environment, and the correct location is connected. If claim issuance works but CRM writeback does not, ShowFi may still continue the claim flow while support investigates writeback.',
  },
  {
    question: 'Why is writeback skipped for a location?',
    answer:
      'If no valid installation exists for that location, ShowFi can still issue the claim flow but will skip CRM writeback until the location is connected correctly.',
  },
  {
    question: 'How long does setup usually take?',
    answer:
      'Most teams can configure templates and launch their first pass-enabled flow the same day when wallet credentials and integration access are ready.',
  },
  {
    question: 'Do you offer a free trial?',
    answer:
      'Not currently. New activations are paused temporarily, so join the waitlist if onboarding is not open yet.',
  },
];

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function HelpCenterPage() {
  return (
    <div className="max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-gblue/10 bg-gradient-to-br from-gblue/10 via-sky-50 to-white">
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gblue/15 bg-white/80 px-3 py-1 text-xs font-medium text-gblue">
              <BookOpen className="h-3.5 w-3.5" />
              Help Center
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">Setup guides, usage notes, and troubleshooting in one place.</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Use this page for the core ShowFi setup steps, wallet requirements, GoHighLevel connection guidance, and the most common support answers.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickLinks.map(({ title, description, href, icon: Icon }) => (
              <Link
                key={href}
                to={href}
                className="group rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl bg-gblue/10 p-2 text-gblue">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
                      <ChevronRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gblue" />
                    </div>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <SectionCard
          title="Required Setup"
          description="These are the main setup tracks a customer or operator usually needs to complete before going live."
        >
          <div className="space-y-4">
            {setupGuides.map((guide) => (
              <div key={guide.title} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                <h3 className="text-sm font-semibold text-gray-900">{guide.title}</h3>
                <ul className="mt-3 space-y-2">
                  {guide.points.map((point) => (
                    <li key={point} className="flex gap-2 text-sm leading-6 text-gray-600">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Quick Answers"
          description="A lightweight FAQ for the most common customer questions."
        >
          <div className="space-y-3">
            {faqs.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900">
                  {item.question}
                </summary>
                <p className="mt-3 text-sm leading-6 text-gray-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="First-Time Setup"
        description="This is the clearest path for a new user who wants to go from zero to a live pass flow."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {firstLaunchSteps.map((step) => (
            <Link
              key={step.title}
              to={step.href}
              className="group rounded-2xl border border-gray-100 bg-gray-50/70 p-4 transition hover:border-gblue/20 hover:bg-white"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">{step.title}</h3>
                <ChevronRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gblue" />
              </div>
              <ul className="mt-3 space-y-2">
                {step.points.map((point) => (
                  <li key={point} className="flex gap-2 text-sm leading-6 text-gray-600">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Usage Documentation"
        description="Use these notes to orient customers on what ShowFi is for and when support should step in."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {usageTopics.map(({ title, icon: Icon, items }) => (
            <div key={title} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-white p-2 text-gblue shadow-sm">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-6 text-gray-600">
                    <Smartphone className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Setup Articles"
        description="These are the core setup topics a new customer usually needs before they can use ShowFi confidently."
      >
        <div className="space-y-4">
          {setupArticles.map((article) => (
            <article key={article.title} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
              <h3 className="text-sm font-semibold text-gray-900">{article.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{article.body}</p>
              <ul className="mt-3 space-y-2">
                {article.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2 text-sm leading-6 text-gray-600">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
