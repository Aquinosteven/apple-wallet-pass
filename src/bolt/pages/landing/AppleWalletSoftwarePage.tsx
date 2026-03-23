import { ArrowRight, CheckCircle2, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';

const benefits = [
  'Apple Wallet passes for events, webinars, booked calls, and challenge funnels',
  'Post-opt-in delivery flows that reinforce attendance automatically',
  'GoHighLevel integration, reminders, claim flows, and operational tracking',
];

const useCases = [
  'Booked sales calls that need higher show rate',
  'Webinars that depend on day-of attendance',
  'Live events and ticketed experiences that need reliable wallet delivery',
];

export default function AppleWalletSoftwarePage() {
  return (
    <div className="bg-white">
      <section className="pt-24 pb-12 lg:pt-28 lg:pb-16 bg-gradient-to-b from-gblue/[0.06] via-white to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gblue/15 bg-white px-3 py-1 text-xs font-semibold text-gblue">
              <WalletCards className="w-4 h-4" />
              Apple Wallet software
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
              Apple Wallet pass software for teams that need people to show up
            </h1>
            <p className="mt-5 max-w-2xl text-base sm:text-lg text-gray-600 leading-relaxed">
              ShowFi.io helps marketers, agencies, and event operators deliver Apple Wallet passes that keep booked calls,
              webinars, and live events visible when timing matters most.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-lg bg-gblue px-5 py-3 text-sm font-semibold text-white hover:bg-gblue-dark transition-colors"
              >
                See pricing
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center rounded-lg border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Start with ShowFi.io
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-ggreen" />
                <p className="mt-3 text-sm text-gray-700 leading-relaxed">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-gray-50/70 p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Why teams choose Apple Wallet passes</h2>
            <p className="mt-3 max-w-3xl text-sm sm:text-base text-gray-600 leading-relaxed">
              Apple Wallet lives on the device, surfaces by time, and gives your reminder a stronger presence than email
              alone. That makes it especially useful for attendance-driven funnels.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {useCases.map((item) => (
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
