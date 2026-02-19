import { FileText, Send, Smartphone } from 'lucide-react';

function MiniPass({ active }: { active?: boolean }) {
  return (
    <div className={`w-12 h-8 rounded bg-white border shadow-sm overflow-hidden ${active ? 'border-ggreen/40 shadow-ggreen/10' : 'border-gray-200'}`}>
      <div className={`h-1 ${active ? 'bg-ggreen' : 'bg-gray-300'}`} />
      <div className="p-1">
        <div className="h-1 w-6 bg-gray-200 rounded-full mb-0.5" />
        <div className="h-0.5 w-4 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}

const steps = [
  {
    icon: FileText,
    number: '1',
    title: 'Create a pass',
    description: 'Add details — title, time, branding.',
  },
  {
    icon: Send,
    number: '2',
    title: 'Trigger post-opt-in',
    description: 'Thank-you page, email, or SMS.',
  },
  {
    icon: Smartphone,
    number: '3',
    title: 'Wallet surfaces it',
    description: 'Appears as the moment approaches.',
    active: true,
  },
];

export default function HowItWorks() {
  return (
    <section className="py-14 lg:py-18 bg-ggreen/[0.03]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Add It Once. <span className="text-ggreen">It Runs Automatically.</span>
          </h2>
        </div>

        <div className="flex flex-col md:flex-row items-stretch justify-center gap-3 max-w-3xl mx-auto">
          {steps.map(({ icon: Icon, number, title, description, active }, idx) => (
            <div key={number} className="flex-1 relative">
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-1.5 w-3 h-px bg-ggreen/30" />
              )}
              <div className={`h-full rounded-xl p-4 border transition-all ${active ? 'bg-white border-ggreen/30 shadow-md shadow-ggreen/5' : 'bg-white/60 border-gray-100'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-ggreen/10' : 'bg-gray-100'}`}>
                    <Icon className={`w-4 h-4 ${active ? 'text-ggreen' : 'text-gray-400'}`} />
                  </div>
                  <span className={`text-xs font-bold ${active ? 'text-ggreen' : 'text-gray-300'}`}>{number}</span>
                  <MiniPass active={active} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
