import { ArrowRight, Check } from 'lucide-react';
import { ctaTargets, featureGroups } from './pricingContent';

export default function PricingDetails() {
  return (
    <>
      <section className="pb-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-r from-gblue via-gblue-dark to-ggreen p-6 sm:p-8 flex flex-col sm:flex-row gap-5 sm:items-center sm:justify-between shadow-lg shadow-gblue/20">
            <div>
              <h3 className="text-2xl font-semibold text-white tracking-tight">Running high-volume campaigns?</h3>
              <p className="mt-1 text-sm text-white/80">Get onboarding help, custom limits, and enterprise-grade support planning.</p>
            </div>
            <a
              href={ctaTargets.contactSales}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white text-navy text-sm font-semibold hover:bg-gray-100 transition-colors"
            >
              Email sales
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      <section className="pb-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 lg:p-10">
            <h3 className="text-3xl font-bold text-gray-900 tracking-tight">Flexible and transparent pricing</h3>
            <p className="mt-2 text-sm text-gray-600">Everything included in one plan, grouped by what matters most in production.</p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
              {featureGroups.map((group) => (
                <section key={group.title} className="rounded-xl border border-gray-200 p-4 sm:p-5 bg-white">
                  <h4 className="text-sm font-semibold text-gray-900">{group.title}</h4>
                  <ul className="mt-3 space-y-2.5">
                    {group.items.map((item) => (
                      <li key={item.title} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-gblue mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
