import { Smartphone, Zap, ShieldCheck, Code2 } from 'lucide-react';

const features = [
  {
    icon: Smartphone,
    title: 'Native Wallet delivery',
    spec: '.pkpass format',
  },
  {
    icon: Zap,
    title: 'Instant generation',
    spec: '<2 seconds',
  },
  {
    icon: Code2,
    title: 'No developer account',
    spec: 'We handle signing',
  },
  {
    icon: ShieldCheck,
    title: 'Built-in validation',
    spec: 'Auto-checked',
  },
];

export default function FeatureHighlights() {
  return (
    <section className="py-14 lg:py-18 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Built for <span className="text-gblue">Operators</span>, Not Hobbyists
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto">
          {features.map(({ icon: Icon, title, spec }) => (
            <div
              key={title}
              className="p-4 rounded-xl bg-gblue/[0.03] border border-gblue/10"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-gblue/10 flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] text-gblue" />
                </div>
                <span className="text-[10px] font-mono text-gblue/60 bg-gblue/5 px-1.5 py-0.5 rounded">{spec}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
