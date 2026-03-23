import { ChevronDown } from 'lucide-react';
import { faqs } from './pricingContent';

export default function PricingFaq() {
  return (
    <section className="pb-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 lg:p-10">
          <h3 className="text-3xl font-bold text-gray-900 tracking-tight text-center">Frequently asked questions</h3>
          <p className="mt-2 text-sm text-gray-600 text-center">Everything teams ask before they launch.</p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-gray-200 bg-white p-4">
                <summary className="flex items-start justify-between gap-3 cursor-pointer list-none">
                  <span className="text-sm font-medium text-gray-900">{faq.question}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500 mt-0.5 transition-transform group-open:rotate-180 flex-shrink-0" aria-hidden="true" />
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
