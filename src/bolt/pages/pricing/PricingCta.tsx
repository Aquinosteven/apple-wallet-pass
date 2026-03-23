import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ctaTargets } from './pricingContent';

export default function PricingCta() {
  return (
    <section className="pb-14 lg:pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white border border-gray-200 p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-r from-gblue/15 via-ggreen/10 to-gyellow/20" />
          <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Get started with ShowFi.io</h3>
          <p className="mt-3 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
            Launch wallet-based reminders for your next campaign with a setup that is fast, transparent, and built for teams that execute.
          </p>
          <Link
            to={ctaTargets.getStarted}
            className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-gblue hover:bg-gblue-dark shadow-sm transition-colors"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
