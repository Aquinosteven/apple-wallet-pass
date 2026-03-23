import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BillingInterval, benefits, ctaTargets, planName, planTagline, prices } from './pricingContent';

interface PricingCardProps {
  interval: BillingInterval;
}

export default function PricingCard({ interval }: PricingCardProps) {
  const price = prices[interval];

  return (
    <section className="pb-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          id="pricing-plan-panel"
          role="tabpanel"
          aria-labelledby={`pricing-tab-${interval}`}
          className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
            <div>
              <p className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-gblue/10 text-gblue">
                {planName}
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">${price.amount}<span className="text-lg sm:text-xl text-gray-500 font-semibold">{price.cadenceLabel}</span></h2>
              <p className="mt-2 text-sm text-gray-600 animate-fade-in" key={`${interval}-billing`}>{price.billedLabel}</p>
              <p className="mt-3 text-sm text-gray-600">{planTagline}</p>
              <p className="mt-2 text-sm text-gray-500">{price.helperText}</p>
              {interval === 'yearly' && price.equivalentMonthly && (
                <p className="mt-2 text-xs font-medium text-ggreen">Equivalent to ${price.equivalentMonthly}/month when billed annually.</p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to={ctaTargets.getStarted} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gblue rounded-lg hover:bg-gblue-dark shadow-sm transition-colors">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to={ctaTargets.bookDemo} className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:underline">
                  Need high volume? Contact sales
                </Link>
              </div>
            </div>

            <ul className="space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-gblue mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
