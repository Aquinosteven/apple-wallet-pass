import { useState } from 'react';
import { User, Key, Bell, CreditCard, Building } from 'lucide-react';

const tabs = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'team', label: 'Team', icon: Building },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account');

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account and preferences.
        </p>
      </div>

      <div className="flex gap-6">
        <nav className="w-48 flex-shrink-0">
          <ul className="space-y-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left
                      ${active
                        ? 'bg-gblue/8 text-gblue'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <tab.icon className={`w-4 h-4 ${active ? 'text-gblue' : 'text-gray-400'}`} />
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex-1">
          {activeTab === 'account' && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Account Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    defaultValue="John Smith"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                  <input
                    type="email"
                    defaultValue="john@company.com"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Timezone</label>
                  <select className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue">
                    <option>America/New_York (EST)</option>
                    <option>America/Los_Angeles (PST)</option>
                    <option>Europe/London (GMT)</option>
                  </select>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
                <button className="px-4 py-2 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">API Keys</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Live Key</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-mono">
                        pk_live_••••••••••••••••••••••••
                      </code>
                      <button className="px-3.5 py-2.5 text-sm font-medium text-gblue bg-gblue/10 rounded-lg hover:bg-gblue/20 transition-colors">
                        Show
                      </button>
                      <button className="px-3.5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        Copy
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Test Key</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-mono">
                        pk_test_••••••••••••••••••••••••
                      </code>
                      <button className="px-3.5 py-2.5 text-sm font-medium text-gblue bg-gblue/10 rounded-lg hover:bg-gblue/20 transition-colors">
                        Show
                      </button>
                      <button className="px-3.5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
                <button className="mt-4 text-xs text-gred hover:underline">Regenerate keys</button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Email Notifications</h3>
              <div className="space-y-4">
                {[
                  { label: 'New ticket issued', description: 'When a ticket is issued to an attendee' },
                  { label: 'Wallet adds', description: 'When attendees add tickets to their wallet' },
                  { label: 'Check-ins', description: 'When attendees check in at events' },
                  { label: 'Weekly summary', description: 'Weekly digest of all activity' },
                ].map((item) => (
                  <label key={item.label} className="flex items-start justify-between gap-4 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mt-1 w-4 h-4 text-gblue rounded border-gray-300 focus:ring-gblue"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Current Plan</h3>
              <div className="p-4 bg-gblue/5 rounded-lg border border-gblue/20 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Pro Plan</p>
                    <p className="text-xs text-gray-500">$49/month - Up to 10,000 tickets</p>
                  </div>
                  <span className="px-2 py-0.5 text-[11px] font-medium text-ggreen bg-ggreen/10 rounded-full">Active</span>
                </div>
              </div>
              <button className="text-sm font-medium text-gblue hover:underline">
                Upgrade plan
              </button>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Team Members</h3>
              <div className="space-y-3">
                {[
                  { name: 'John Smith', email: 'john@company.com', role: 'Owner' },
                  { name: 'Sarah Chen', email: 'sarah@company.com', role: 'Admin' },
                ].map((member) => (
                  <div key={member.email} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{member.role}</span>
                  </div>
                ))}
              </div>
              <button className="mt-4 text-sm font-medium text-gblue hover:underline">
                + Invite team member
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
