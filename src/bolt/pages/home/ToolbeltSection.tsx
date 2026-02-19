import { Database, Calendar, Mail, MessageSquare, Video, Layers } from 'lucide-react';

const tools = [
  { icon: Database, label: 'CRM' },
  { icon: Calendar, label: 'Scheduler' },
  { icon: Mail, label: 'Email' },
  { icon: MessageSquare, label: 'SMS' },
  { icon: Video, label: 'Webinar' },
  { icon: Layers, label: 'Automation' },
];

export default function ToolbeltSection() {
  return (
    <section className="py-12 lg:py-14 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Works With Your Existing <span className="text-gyellow-dark">Funnel Stack</span>
          </h2>
        </div>

        <div className="flex items-center justify-center gap-3 flex-wrap max-w-2xl mx-auto">
          {tools.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-4 py-2.5 bg-gyellow/[0.08] rounded-lg border border-gyellow/20"
            >
              <Icon className="w-4 h-4 text-gyellow-dark" />
              <span className="text-xs font-medium text-gray-600">{label}</span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Slot Wallet in where intent is highest.
        </p>
      </div>
    </section>
  );
}
