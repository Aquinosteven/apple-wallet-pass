import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BillingInterval, planTiers } from './pricingContent';
import { trackSalesEvent, trackSalesSignupIntent } from '../../../lib/googleAnalytics';

interface PricingCardProps {
  interval: BillingInterval;
}

export default function PricingCard({ interval }: PricingCardProps) {
  return (
    <section className="pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div id="pricing-plan-panel" role="tabpanel" aria-labelledby={`pricing-tab-${interval}`} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {planTiers.map((tier) => {
            const price = tier.values[interval];
            return (
              <div
                key={tier.code}
                className={`rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ${
                  tier.featured
                    ? 'border border-gblue/30 bg-gradient-to-br from-white via-gblue/5 to-ggreen/5'
                    : 'border border-gray-200 bg-white'
                }`}
              >
                <div className="grid grid-cols-1 gap-8 items-start">
                  <div>
                    <p className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      tier.featured ? 'bg-gblue text-white' : 'bg-gblue/10 text-gblue'
                    }`}>
                      {tier.badge}
                    </p>
                    <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                      ${price.amount}
                      <span className="text-lg sm:text-xl text-gray-500 font-semibold">{price.cadenceLabel}</span>
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 animate-fade-in" key={`${tier.code}-${interval}-billing`}>{price.billedLabel}</p>
                    <p className="mt-3 text-xl font-semibold text-gray-900">{tier.name}</p>
                    <p className="mt-2 text-sm text-gray-600">{tier.tagline}</p>
                    <p className="mt-2 text-sm text-gray-500">{tier.audience}</p>
                    <p className="mt-3 text-sm text-gray-500">{price.helperText}</p>
                    {interval === 'yearly' && price.equivalentMonthly && (
                      <p className="mt-2 text-xs font-medium text-ggreen">Equivalent to ${price.equivalentMonthly}/month when billed annually.</p>
                    )}

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Link
                        to={tier.ctaHref}
                        onClick={() => {
                          trackSalesEvent('sales_cta_click', {
                            cta_name: tier.code === 'agency' ? 'book_agency_demo' : 'join_waitlist',
                            cta_location: `pricing_${tier.code}_primary`,
                            destination: tier.ctaHref,
                            billing_interval: interval,
                          });
                          trackSalesSignupIntent({
                            intent_type: tier.code === 'agency' ? 'agency_demo' : 'waitlist',
                            intent_location: `pricing_${tier.code}_primary`,
                            destination: tier.ctaHref,
                            billing_interval: interval,
                          });
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gblue rounded-lg hover:bg-gblue-dark shadow-sm transition-colors"
                      >
                        {tier.ctaLabel}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <a
                        href={tier.secondaryHref}
                        onClick={() =>
                          trackSalesEvent('sales_cta_click', {
                            cta_name: `${tier.code}_secondary`,
                            cta_location: `pricing_${tier.code}_secondary`,
                            destination: tier.secondaryHref,
                            billing_interval: interval,
                          })
                        }
                        className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:underline"
                      >
                        {tier.secondaryLabel}
                      </a>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {tier.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-gblue mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
