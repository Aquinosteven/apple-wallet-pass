import { Plug, Webhook, Zap, ArrowRight } from 'lucide-react';

const integrations = [
  {
    name: 'Zapier',
    description: 'Connect to 5,000+ apps',
    icon: Zap,
    color: 'bg-orange-500',
    status: 'available',
  },
  {
    name: 'Webhooks',
    description: 'Real-time event notifications',
    icon: Webhook,
    color: 'bg-gblue',
    status: 'available',
  },
  {
    name: 'Custom API',
    description: 'Full programmatic control',
    icon: Plug,
    color: 'bg-gray-700',
    status: 'available',
  },
];

export default function IntegrationsPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect PassKit to your existing tools and workflows.
        </p>
      </div>

      <div className="space-y-4">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between hover:border-gray-200 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${integration.color} flex items-center justify-center`}>
                <integration.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{integration.name}</h3>
                <p className="text-xs text-gray-500">{integration.description}</p>
              </div>
            </div>
            <button className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gblue bg-gblue/10 rounded-lg hover:bg-gblue/20 transition-colors">
              Configure
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 p-5 bg-gray-50 rounded-xl border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Need a custom integration?</h3>
        <p className="text-xs text-gray-500 mb-3">
          Our API supports any integration. Check the documentation or contact support.
        </p>
        <a href="#" className="text-xs font-medium text-gblue hover:underline">
          View API documentation
        </a>
      </div>
    </div>
  );
}
