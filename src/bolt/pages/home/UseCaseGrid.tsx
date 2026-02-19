import { Phone, Video, Flame, Users } from 'lucide-react';

const useCases = [
  {
    icon: Phone,
    title: 'Booked Sales Calls',
    description: 'Reinforce commitment immediately after booking.',
    color: 'bg-gblue/10 text-gblue',
    borderColor: 'hover:border-gblue/30',
  },
  {
    icon: Video,
    title: 'Webinars',
    description: 'Surface passes before you go live.',
    color: 'bg-ggreen/10 text-ggreen',
    borderColor: 'hover:border-ggreen/30',
  },
  {
    icon: Flame,
    title: 'Challenges',
    description: 'Anchor daily participation with timing.',
    color: 'bg-gyellow/10 text-gyellow-dark',
    borderColor: 'hover:border-gyellow/30',
  },
  {
    icon: Users,
    title: 'Live Events',
    description: 'Tickets on the lock screen, not in email.',
    color: 'bg-gred/10 text-gred',
    borderColor: 'hover:border-gred/30',
  },
];

export default function UseCaseGrid() {
  return (
    <section id="use-cases" className="py-14 lg:py-18 bg-gray-50/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Built for High-Intent Events
          </h2>
          <p className="mt-3 text-sm text-gray-500">
            Activates after opt-in, when intent is highest and decay begins.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {useCases.map(({ icon: Icon, title, description, color, borderColor }) => (
            <div
              key={title}
              className={`p-4 rounded-xl border border-gray-100 bg-white ${borderColor} hover:shadow-md transition-all duration-200`}
            >
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
