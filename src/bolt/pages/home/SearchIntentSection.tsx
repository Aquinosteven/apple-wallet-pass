import { Link } from 'react-router-dom';

const pages = [
  {
    to: '/wallet-pass-software',
    title: 'Wallet pass software',
    description: 'Core category page for attendance-driven wallet pass workflows across Apple Wallet and Google Wallet.',
  },
  {
    to: '/webinar-reminder-software',
    title: 'Webinar reminder software',
    description: 'Focused on webinar attendance and the last-mile visibility problem after registration.',
  },
  {
    to: '/event-reminder-software',
    title: 'Event reminder software',
    description: 'Built around live events, event-day retrieval, and wallet-based visibility near check-in.',
  },
  {
    to: '/gohighlevel-wallet-pass',
    title: 'GoHighLevel wallet pass',
    description: 'Explains how ShowFi.io fits into GoHighLevel reminder and booked-call workflows.',
  },
  {
    to: '/booked-call-reminders',
    title: 'Booked call reminders',
    description: 'Targets no-show reduction for sales calls, demos, consultations, and appointment funnels.',
  },
];

export default function SearchIntentSection() {
  return (
    <section className="py-14 bg-gray-50/70">
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
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300 hover:shadow-md transition-all"
            >
              <h3 className="text-base font-semibold text-gray-900">{page.title}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{page.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
