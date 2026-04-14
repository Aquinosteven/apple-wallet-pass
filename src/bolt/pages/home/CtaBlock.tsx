import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { trackSalesEvent, trackSalesSignupIntent } from '../../../lib/googleAnalytics';

export default function CtaBlock() {
  return (
    <section className="bg-gblue">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
            If Attendance Impacts Revenue,
            <span className="block text-white/50 mt-1">This Belongs in Your Stack</span>
          </h2>
          <p className="mt-4 text-base text-white/60 max-w-md mx-auto">
            Calls, webinars, and challenges only work when people actually show up.
          </p>
          <div className="mt-8">
            <Link
              to="/waitlist"
              onClick={() =>
                {
                  trackSalesEvent('sales_cta_click', {
                    cta_name: 'join_waitlist',
                    cta_location: 'home_footer_cta',
                    destination: '/waitlist',
                  });
                  trackSalesSignupIntent({
                    intent_type: 'waitlist',
                    intent_location: 'home_footer_cta',
                    destination: '/waitlist',
                  });
                }
              }
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-gblue bg-white rounded-lg hover:bg-gray-50 shadow-lg shadow-black/10 transition-all"
            >
              Join Waitlist
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="mt-5 text-[11px] text-white/40">
            No credit card. No Apple developer account.
          </p>
        </div>
      </div>
    </section>
  );
}
