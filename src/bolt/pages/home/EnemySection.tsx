import { Mail, MessageSquare, Wallet } from 'lucide-react';

const channels = [
  {
    icon: Mail,
    title: 'Email',
    problems: ['Buried', 'Skimmed', 'Forgotten'],
    highlight: false,
  },
  {
    icon: MessageSquare,
    title: 'SMS',
    problems: ['Muted', 'Distracting', 'Easy to ignore'],
    highlight: false,
  },
  {
    icon: Wallet,
    title: 'Apple Wallet',
    problems: ['Lives on the lock screen', 'Surfaces by time', 'Hard to miss'],
    highlight: true,
  },
];

export default function EnemySection() {
  return (
    <section className="py-16 lg:py-20 bg-gblue/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-[40px] font-bold text-gray-900 tracking-tight leading-tight">
            The Problem Isn't Registration.
            <span className="text-gred"> It's Attendance.</span>
          </h2>
          <p className="mt-4 text-base text-gray-600">
            Show rate drops after the opt-in. Email and SMS fight for attention. Wallet doesn't.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {channels.map(({ icon: Icon, title, problems, highlight }) => (
            <div
              key={title}
              className={`
                rounded-xl p-5 transition-all
                ${highlight
                  ? 'bg-white shadow-xl shadow-gblue/10 ring-1 ring-gblue/20 scale-[1.03] z-10'
                  : 'bg-white/60 border border-gray-200/50'
                }
              `}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${highlight ? 'bg-gblue/10' : 'bg-gray-100'}`}>
                <Icon className={`w-5 h-5 ${highlight ? 'text-gblue' : 'text-gray-400'}`} />
              </div>
              <h3 className={`text-base font-semibold mb-3 ${highlight ? 'text-gray-900' : 'text-gray-400'}`}>
                {title}
              </h3>
              <ul className="space-y-2">
                {problems.map((problem) => (
                  <li key={problem} className="flex items-center gap-2">
                    {highlight ? (
                      <svg className="w-4 h-4 text-ggreen flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={`text-sm ${highlight ? 'text-gray-700' : 'text-gray-400'}`}>{problem}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-base font-semibold text-gray-900">
          Wallet doesn't ask for attention. It takes its place.
        </p>
      </div>
    </section>
  );
}
