import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellOff,
  Check,
  Clock3,
  Code2,
  Eye,
  FileText,
  Flame,
  Mail,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Smartphone,
  Users,
  Video,
  Wallet,
  Zap,
} from 'lucide-react';

const stats = [
  { value: '12,000+', label: 'passes delivered' },
  { value: '500+', label: 'active teams' },
  { value: '99.9%', label: 'delivery reliability' },
  { value: '<2s', label: 'pass generation' },
];

const channels = [
  {
    icon: Mail,
    title: 'Email',
    problems: ['Buried', 'Skimmed', 'Forgotten'],
    highlight: false,
  },
  {
    icon: MessageSquare,
    title: 'SMS',
    problems: ['Muted', 'Distracting', 'Easy to ignore'],
    highlight: false,
  },
  {
    icon: Wallet,
    title: 'Wallet passes',
    problems: ['Lives on the lock screen', 'Surfaces by time', 'Hard to miss'],
    highlight: true,
  },
];

const reasons = [
  { icon: Clock3, text: 'Passes surface automatically as start time approaches' },
  { icon: BellOff, text: 'No unread badge competition' },
  { icon: Eye, text: 'No scroll fatigue' },
  { icon: Zap, text: 'No notification blindness' },
];

const useCases = [
  {
    icon: Phone,
    title: 'Booked Sales Calls',
    description: 'Reinforce commitment immediately after booking.',
  },
  {
    icon: Video,
    title: 'Webinars',
    description: 'Surface passes before you go live.',
  },
  {
    icon: Flame,
    title: 'Challenges',
    description: 'Anchor daily participation with timing.',
  },
  {
    icon: Users,
    title: 'Live Events',
    description: 'Tickets on the lock screen, not in email.',
  },
];

const steps = [
  {
    icon: FileText,
    number: '1',
    title: 'Create a pass',
    description: 'Add details — title, time, branding.',
  },
  {
    icon: Send,
    number: '2',
    title: 'Trigger post-opt-in',
    description: 'Thank-you page, email, or SMS.',
  },
  {
    icon: Smartphone,
    number: '3',
    title: 'Wallet surfaces it',
    description: 'Appears as the moment approaches.',
    active: true,
  },
];

const features = [
  {
    icon: Smartphone,
    title: 'Native Wallet delivery',
    spec: '.pkpass format',
  },
  {
    icon: Zap,
    title: 'Instant generation',
    spec: '<2 seconds',
  },
  {
    icon: Code2,
    title: 'No developer account',
    spec: 'We handle signing',
  },
  {
    icon: ShieldCheck,
    title: 'Built-in validation',
    spec: 'Auto-checked',
  },
];

const pages = [
  {
    to: '/wallet-pass-software',
    title: 'Wallet pass software',
    description:
      'Core category page for attendance-driven wallet pass workflows across Apple Wallet and Google Wallet.',
  },
  {
    to: '/webinar-reminder-software',
    title: 'Webinar reminder software',
    description:
      'Focused on webinar attendance and the last-mile visibility problem after registration.',
  },
  {
    to: '/event-reminder-software',
    title: 'Event reminder software',
    description:
      'Built around live events, event-day retrieval, and wallet-based visibility near check-in.',
  },
  {
    to: '/gohighlevel-wallet-pass',
    title: 'GoHighLevel wallet pass',
    description:
      'Explains how ShowFi.io fits into GoHighLevel reminder and booked-call workflows.',
  },
  {
    to: '/booked-call-reminders',
    title: 'Booked call reminders',
    description:
      'Targets no-show reduction for sales calls, demos, consultations, and appointment funnels.',
  },
];

function IPhoneMockup() {
  return (
    <div className="relative mx-auto flex w-full max-w-[540px] justify-center">
      <div className="absolute left-1/2 top-8 h-48 w-48 -translate-x-[130%] rounded-full bg-gblue/12 blur-3xl" />
      <div className="absolute bottom-8 left-1/2 h-48 w-48 translate-x-[20%] rounded-full bg-ggreen/12 blur-3xl" />

      <div className="relative rounded-[42px] bg-[#0f172a] p-3 shadow-[0_40px_100px_rgba(15,23,42,0.22)]">
        <div className="absolute left-1/2 top-3 h-6 w-32 -translate-x-1/2 rounded-full bg-black/70" />
        <div className="w-[300px] overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#eef5ff_0%,#ffffff_52%,#f4fbf6_100%)] p-4 sm:w-[340px]">
          <div className="rounded-[26px] bg-[linear-gradient(135deg,#12284d_0%,#1a4ea1_58%,#1b8a72_100%)] p-5 text-white shadow-[0_18px_40px_rgba(26,78,161,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/60">Apple Wallet Pass</p>
                <h3 className="mt-3 text-[28px] font-semibold leading-none tracking-tight">Strategy Call</h3>
                <p className="mt-2 text-sm text-white/78">with Alex Chen</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-3">
                <p className="text-[11px] text-white/52">Start time</p>
                <p className="mt-1 text-sm font-medium">Today 2:00 PM</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-3">
                <p className="text-[11px] text-white/52">Status</p>
                <p className="mt-1 text-sm font-medium">Upcoming</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/8 p-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Reminder behavior</p>
              <p className="mt-2 text-sm leading-relaxed text-white/78">
                ShowFi.io surfaces automatically. No inbox required.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Why it works</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-2xl bg-[#f6f8fc] px-3 py-2.5 text-sm">
                  <span className="text-gray-500">Email</span>
                  <span className="text-xs text-gray-400">Buried</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-[#f6f8fc] px-3 py-2.5 text-sm">
                  <span className="text-gray-500">SMS</span>
                  <span className="text-xs text-gray-400">Muted</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-[#ecfbf1] px-3 py-2.5 text-sm ring-1 ring-ggreen/20">
                  <span className="font-medium text-gray-900">Wallet pass</span>
                  <span className="text-xs font-semibold text-ggreen">Visible</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Fits your funnel</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-[#f6f8fc] px-3 py-1.5">Opt-in</span>
                <ChevronRightIcon />
                <span className="rounded-full bg-[#f6f8fc] px-3 py-1.5">Wallet</span>
                <ChevronRightIcon />
                <span className="rounded-full bg-[#f6f8fc] px-3 py-1.5">Show up</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function StepMiniPass({ active }: { active?: boolean }) {
  return (
    <div
      className={`w-12 h-8 overflow-hidden rounded bg-white border shadow-sm ${
        active ? 'border-ggreen/40 shadow-ggreen/10' : 'border-gray-200'
      }`}
    >
      <div className={`h-1 ${active ? 'bg-ggreen' : 'bg-gray-300'}`} />
      <div className="p-1">
        <div className="mb-0.5 h-1 w-6 rounded-full bg-gray-200" />
        <div className="h-0.5 w-4 rounded-full bg-gray-100" />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="bg-white text-gray-900">
      <section className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(66,133,244,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(52,168,83,0.08),_transparent_26%),linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] pt-20 pb-12 lg:pt-24 lg:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
            <div>
              <h1 className="text-[44px] sm:text-[54px] lg:text-[66px] font-bold text-gray-900 leading-[1.02] tracking-tight">
                ShowFi.io helps you
                <span className="text-gblue"> increase show rate</span>
              </h1>

              <p className="mt-4 text-[17px] text-gray-600 leading-relaxed max-w-xl">
                ShowFi.io is wallet pass software for sales calls, webinars, challenges, and live events.
                Reinforce high-intent moments with Apple Wallet and Google Wallet reminders that surface
                automatically when timing matters.
              </p>

              <p className="mt-3 text-[13px] text-gray-400 max-w-lg">
                Built for agency owners and marketers running VSLs, booked calls, webinars, and challenges at scale.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to="/waitlist"
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                >
                  Join Waitlist
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#use-cases"
                  className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  View Example Passes
                </a>
                <Link
                  to="/pricing"
                  className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  See pricing
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
                <Link to="/wallet-pass-software" className="hover:text-gray-900 transition-colors">
                  Wallet pass software
                </Link>
                <Link to="/apple-wallet-pass-software" className="hover:text-gray-900 transition-colors">
                  Apple Wallet pass software
                </Link>
                <Link to="/google-wallet-pass-software" className="hover:text-gray-900 transition-colors">
                  Google Wallet pass software
                </Link>
                <Link to="/webinar-reminder-software" className="hover:text-gray-900 transition-colors">
                  Webinar reminder software
                </Link>
                <Link to="/gohighlevel-wallet-pass" className="hover:text-gray-900 transition-colors">
                  GoHighLevel wallet pass
                </Link>
              </div>
            </div>

            <IPhoneMockup />
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-white/80 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center flex-1 min-w-[120px]">
                <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
                <p className="mt-0.5 text-[11px] text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-[#f8fbff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-[40px] font-bold text-gray-900 tracking-tight leading-tight">
              The Problem Isn&apos;t Registration.
              <span className="text-gred"> It&apos;s Attendance.</span>
            </h2>
            <p className="mt-4 text-base text-gray-600">
              Show rate drops after the opt-in. Email and SMS fight for attention. Wallet doesn&apos;t.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {channels.map(({ icon: Icon, title, problems, highlight }) => (
              <div
                key={title}
                className={`rounded-[28px] p-6 transition-all ${
                  highlight
                    ? 'bg-white shadow-[0_24px_60px_rgba(66,133,244,0.12)] ring-1 ring-gblue/15'
                    : 'bg-white/80 border border-gray-200'
                }`}
              >
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${
                    highlight ? 'bg-gblue/10' : 'bg-gray-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${highlight ? 'text-gblue' : 'text-gray-400'}`} />
                </div>
                <h3 className={`mb-4 text-base font-semibold ${highlight ? 'text-gray-900' : 'text-gray-500'}`}>
                  {title}
                </h3>
                <div className="space-y-2.5">
                  {problems.map((problem) => (
                    <div key={problem} className="flex items-center gap-2.5">
                      {highlight ? (
                        <Check className="w-4 h-4 text-ggreen flex-shrink-0" />
                      ) : (
                        <span className="flex h-4 w-4 items-center justify-center text-gray-300">×</span>
                      )}
                      <span className={`text-sm ${highlight ? 'text-gray-700' : 'text-gray-400'}`}>{problem}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-base font-semibold text-gray-900">
            Wallet passes do not ask for attention. They take their place.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-18 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-gray-500">Used inside high-intent funnels</p>
              <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Why wallet passes <span className="text-ggreen">outperform</span> messages for show rate
              </h2>
              <p className="mt-4 text-base text-gray-600 leading-relaxed">
                Less noise. More certainty.
              </p>
            </div>

            <div className="grid gap-3">
              {reasons.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 rounded-[22px] border border-gray-200 bg-[#fbfdfb] p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ggreen/10 flex-shrink-0">
                    <Icon className="w-[18px] h-[18px] text-ggreen" />
                  </div>
                  <p className="text-sm text-gray-700">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="use-cases" className="py-16 lg:py-20 bg-[#fbfdff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Built for High-Intent Events
            </h2>
            <p className="mt-3 text-sm text-gray-500">
              Activates after opt-in, when intent is highest and decay begins.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {useCases.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gblue/10 text-gblue">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Add It Once. <span className="text-ggreen">It Runs Automatically.</span>
            </h2>
          </div>

          <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 max-w-4xl mx-auto">
            {steps.map(({ icon: Icon, number, title, description, active }, idx) => (
              <div key={number} className="flex-1 relative">
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-px bg-ggreen/30" />
                )}
                <div
                  className={`h-full rounded-[28px] p-5 border ${
                    active ? 'bg-[#f5fff8] border-ggreen/30 shadow-[0_16px_40px_rgba(52,168,83,0.08)]' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${active ? 'bg-ggreen/10' : 'bg-gray-100'}`}>
                      <Icon className={`w-4 h-4 ${active ? 'text-ggreen' : 'text-gray-400'}`} />
                    </div>
                    <span className={`text-xs font-bold ${active ? 'text-ggreen' : 'text-gray-300'}`}>{number}</span>
                    <StepMiniPass active={active} />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-18 bg-[#fbfdff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Built for <span className="text-gblue">Operators</span>, Not Hobbyists
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
            {features.map(({ icon: Icon, title, spec }) => (
              <div key={title} className="rounded-[28px] border border-gblue/10 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gblue/10">
                    <Icon className="w-[18px] h-[18px] text-gblue" />
                  </div>
                  <span className="rounded bg-gblue/5 px-2 py-1 text-[10px] font-mono text-gblue/70">{spec}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Solutions</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Explore the reminder workflows ShowFi.io is built for
            </h2>
            <p className="mt-4 text-base text-gray-600 leading-relaxed">
              These pages cover the core search intents around wallet passes, webinar attendance, event reminders,
              GoHighLevel integrations, and booked-call no-show reduction.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {pages.map((page) => (
              <Link
                key={page.to}
                to={page.to}
                className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)] transition-all hover:border-gray-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.06)]"
              >
                <h3 className="text-base font-semibold text-gray-900">{page.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{page.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24 pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[36px] bg-[linear-gradient(135deg,#0f172a_0%,#14366b_100%)] px-6 py-12 text-center sm:px-10">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
                If Attendance Impacts Revenue,
                <span className="block text-white/55 mt-1">This Belongs in Your Stack</span>
              </h2>
              <p className="mt-4 text-base text-white/70 max-w-md mx-auto">
                Calls, webinars, and challenges only work when people actually show up.
              </p>
              <div className="mt-8">
                <Link
                  to="/waitlist"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
                >
                  Join Waitlist
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <p className="mt-5 text-[11px] text-white/45">
                No credit card. No Apple developer account.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
