import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface PassCardProps {
  title: string;
  subtitle: string;
  time: string;
  state: 'upcoming' | 'soon' | 'now';
}

function PassCard({ title, subtitle, time, state }: PassCardProps) {
  const stateConfig = {
    upcoming: { color: '#4285F4', bg: 'bg-gblue/8' },
    soon: { color: '#FBBC05', bg: 'bg-gyellow/10' },
    now: { color: '#34A853', bg: 'bg-ggreen/10' },
  };
  const { color } = stateConfig[state];

  return (
    <div className="w-[220px] bg-white rounded-xl shadow-lg shadow-black/8 overflow-hidden border border-gray-100/80">
      <div className="h-[5px]" style={{ backgroundColor: color }} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 leading-tight truncate">{title}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{subtitle}</p>
          </div>
          <div
            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}12` }}
          >
            <svg className="w-3 h-3" style={{ color }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
            </svg>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[10px] font-semibold" style={{ color }}>{time}</span>
        </div>
      </div>
    </div>
  );
}

function PassStack() {
  return (
    <div className="relative h-[300px] w-[260px]">
      <div className="absolute top-0 left-0 -rotate-3">
        <PassCard title="Strategy Call" subtitle="with Alex Chen" time="Today 2:00 PM" state="upcoming" />
      </div>
      <div className="absolute top-[90px] left-[15px] rotate-2">
        <PassCard title="Webinar Starting" subtitle="Funnel Optimization" time="In 28 min" state="soon" />
      </div>
      <div className="absolute top-[180px] left-[5px] -rotate-1">
        <PassCard title="Challenge Day 3" subtitle="Revenue Sprint" time="Live now" state="now" />
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="pt-20 pb-10 lg:pt-24 lg:pb-14 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div>
            <h1 className="text-[44px] sm:text-[54px] lg:text-[60px] font-bold text-gray-900 leading-[1.02] tracking-tight">
              The Native Way to
              <span className="text-gblue"> Increase Show Rate</span>
            </h1>

            <p className="mt-4 text-[17px] text-gray-600 leading-relaxed max-w-xl">
              Reinforce high-intent moments — sales calls, webinars, and challenges — using Apple Wallet, the only channel that surfaces automatically when timing matters.
            </p>

            <p className="mt-3 text-[13px] text-gray-400">
              Built for agency owners and marketers running VSLs, booked calls, webinars, and challenges at scale.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gblue rounded-lg hover:bg-gblue-dark shadow-md shadow-gblue/25 transition-all"
              >
                Add Wallet to My Funnel
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#use-cases"
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                View Example Passes
              </a>
            </div>
          </div>

          <div className="hidden lg:flex justify-center">
            <div className="relative">
              <PassStack />
              <p className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 whitespace-nowrap tracking-wide">
                Surfaces automatically. No inbox required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
