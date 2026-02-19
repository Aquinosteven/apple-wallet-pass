import { Star, Clock, BellOff, Eye, Zap } from 'lucide-react';

const reasons = [
  { icon: Clock, text: 'Passes surface automatically as start time approaches' },
  { icon: BellOff, text: 'No unread badge competition' },
  { icon: Eye, text: 'No scroll fatigue' },
  { icon: Zap, text: 'No notification blindness' },
];

export default function MechanismSection() {
  return (
    <section className="py-14 lg:py-18 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-0.5 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 text-gyellow fill-gyellow" />
            ))}
            <span className="ml-2 text-[11px] font-medium text-gray-500 tracking-wide">Used inside high-intent funnels</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Why Apple Wallet <span className="text-ggreen">Outperforms</span> Messages for Show Rate
          </h2>

          <div className="mt-6 space-y-2.5">
            {reasons.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 p-3 bg-ggreen/[0.04] rounded-lg"
              >
                <div className="w-9 h-9 rounded-lg bg-ggreen/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-[18px] h-[18px] text-ggreen" />
                </div>
                <p className="text-sm text-gray-700">{text}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-base font-semibold text-gray-900">
            Less noise. More certainty.
          </p>
        </div>
      </div>
    </section>
  );
}
