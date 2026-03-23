import type { KeyboardEvent } from 'react';
import { billingOptions, BillingInterval, prices } from './pricingContent';

interface PricingHeroProps {
  interval: BillingInterval;
  onIntervalChange: (value: BillingInterval) => void;
}

export default function PricingHero({ interval, onIntervalChange }: PricingHeroProps) {
  const yearlySavings = prices.yearly.savingsText;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      onIntervalChange(interval === 'monthly' ? 'yearly' : 'monthly');
    }
  };

  return (
    <section className="pt-24 pb-8 lg:pt-28 lg:pb-10 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-16 w-64 h-64 rounded-full bg-gblue/15 blur-3xl" />
      <div className="pointer-events-none absolute -top-16 right-0 w-64 h-64 rounded-full bg-ggreen/10 blur-3xl" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
          Simple pricing for
          <span className="text-gblue"> ShowFi.io</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
          One plan, two billing options, and everything needed to run wallet pass campaigns with ShowFi.io across Apple Wallet and Google Wallet.
        </p>

        <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-gblue/20 bg-white p-1 shadow-sm" role="tablist" aria-label="Billing interval" onKeyDown={handleKeyDown}>
          {billingOptions.map((option) => {
            const active = interval === option.value;
            return (
              <button
                key={option.value}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls="pricing-plan-panel"
                id={`pricing-tab-${option.value}`}
                onClick={() => onIntervalChange(option.value)}
                className={`px-4 sm:px-5 py-2 text-sm font-semibold rounded-full transition-all duration-200 ${
                  active ? 'bg-gblue text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gblue/5'
                }`}
              >
                {option.label}
              </button>
            );
          })}
          {yearlySavings && (
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gyellow/15 text-gray-700 border border-gyellow/40">
              {yearlySavings}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
