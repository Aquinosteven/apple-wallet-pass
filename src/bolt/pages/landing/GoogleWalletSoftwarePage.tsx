import { ArrowRight, CheckCircle2, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

const highlights = [
  'Google Wallet pass delivery for Android users and mixed-device audiences',
  'Shared campaign flows that support both Apple Wallet and Google Wallet',
  'Attendance-focused reminders, automation, and analytics in one platform',
];

const reasons = [
  'Cover Android attendees without building a separate reminder system',
  'Keep one workflow for events, webinars, and booked calls across wallet platforms',
  'Reduce drop-off between opt-in and the moment someone needs to remember',
];

export default function GoogleWalletSoftwarePage() {
  return (
    <div className="bg-white">
      <section className="pt-24 pb-12 lg:pt-28 lg:pb-16 bg-gradient-to-b from-ggreen/[0.06] via-white to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-ggreen/15 bg-white px-3 py-1 text-xs font-semibold text-ggreen">
              <Smartphone className="w-4 h-4" />
              Google Wallet software
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
              Google Wallet pass software for campaigns that need cross-platform attendance
            </h1>
            <p className="mt-5 max-w-2xl text-base sm:text-lg text-gray-600 leading-relaxed">
              ShowFi.io helps you deliver Google Wallet passes for Android users while keeping one wallet-pass workflow
              across calls, webinars, events, and recurring campaign touchpoints.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-lg bg-ggreen px-5 py-3 text-sm font-semibold text-white hover:opacity-95 transition-opacity"
              >
                See pricing
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/waitlist"
                className="inline-flex items-center rounded-lg border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Join waitlist
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {highlights.map((item) => (
              <div key={item} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-gblue" />
                <p className="mt-3 text-sm text-gray-700 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-gray-50/70 p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Why Google Wallet matters in your mix</h2>
            <p className="mt-3 max-w-3xl text-sm sm:text-base text-gray-600 leading-relaxed">
              If your audience includes Android devices, Google Wallet support helps you keep the reminder experience
              consistent instead of forcing those users into a weaker fallback path.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {reasons.map((item) => (
                <li key={item} className="rounded-xl border border-white bg-white p-4 text-sm text-gray-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
