import { useState } from 'react';
import { Send, Search, MoreHorizontal, Upload, Code, UserPlus, Eye, XCircle } from 'lucide-react';

interface IssuedTicket {
  id: string;
  attendeeName: string;
  email: string;
  issuedAt: string;
  status: 'issued' | 'added' | 'checked_in' | 'expired';
}

const sampleTickets: IssuedTicket[] = [
  { id: '1', attendeeName: 'Sarah Chen', email: 'sarah@acme.com', issuedAt: 'Mar 10, 2:34 PM', status: 'added' },
  { id: '2', attendeeName: 'Mike Johnson', email: 'mike@startup.io', issuedAt: 'Mar 10, 2:30 PM', status: 'checked_in' },
  { id: '3', attendeeName: 'Emily Davis', email: 'emily@company.co', issuedAt: 'Mar 10, 2:25 PM', status: 'added' },
  { id: '4', attendeeName: 'Alex Rivera', email: 'alex@agency.com', issuedAt: 'Mar 10, 2:20 PM', status: 'issued' },
  { id: '5', attendeeName: 'Jordan Lee', email: 'jordan@tech.io', issuedAt: 'Mar 10, 2:15 PM', status: 'added' },
  { id: '6', attendeeName: 'Taylor Swift', email: 'taylor@music.com', issuedAt: 'Mar 9, 4:00 PM', status: 'expired' },
];

const statusConfig = {
  issued: { label: 'Issued', color: 'text-gray-500', bg: 'bg-gray-100' },
  added: { label: 'Added', color: 'text-gblue', bg: 'bg-gblue/10' },
  checked_in: { label: 'Checked In', color: 'text-ggreen', bg: 'bg-ggreen/10' },
  expired: { label: 'Expired', color: 'text-gray-400', bg: 'bg-gray-100' },
};

interface IssuedTicketsTabProps {
  eventId: string;
}

export default function IssuedTicketsTab({ eventId }: IssuedTicketsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueMethod, setIssueMethod] = useState<'api' | 'csv' | 'manual' | null>(null);

  const filteredTickets = sampleTickets.filter(
    (ticket) =>
      ticket.attendeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search attendees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
          />
        </div>
        <button
          onClick={() => setShowIssueModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark transition-colors"
        >
          <Send className="w-4 h-4" />
          Issue Tickets
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Attendee</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Email</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Issued</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket) => {
              const status = statusConfig[ticket.status];
              return (
                <tr key={ticket.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">{ticket.attendeeName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{ticket.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">{ticket.issuedAt}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-gred hover:bg-gred/5 rounded-lg transition-colors">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredTickets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">No tickets found.</p>
          </div>
        )}
      </div>

      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowIssueModal(false); setIssueMethod(null); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Issue Tickets</h2>
              <p className="text-sm text-gray-500 mt-1">Choose how to issue tickets to attendees.</p>
            </div>

            {!issueMethod ? (
              <div className="p-5 space-y-3">
                <button
                  onClick={() => setIssueMethod('api')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gblue/30 hover:bg-gblue/5 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-gblue/10 flex items-center justify-center">
                    <Code className="w-5 h-5 text-gblue" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">API</p>
                    <p className="text-xs text-gray-500">Issue tickets programmatically</p>
                  </div>
                </button>
                <button
                  onClick={() => setIssueMethod('csv')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gblue/30 hover:bg-gblue/5 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-ggreen/10 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-ggreen" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Upload CSV</p>
                    <p className="text-xs text-gray-500">Bulk import attendee list</p>
                  </div>
                </button>
                <button
                  onClick={() => setIssueMethod('manual')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gblue/30 hover:bg-gblue/5 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-gyellow/10 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-gyellow-dark" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Manual Entry</p>
                    <p className="text-xs text-gray-500">Add attendees one by one</p>
                  </div>
                </button>
              </div>
            ) : issueMethod === 'api' ? (
              <div className="p-5">
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">API Endpoint</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 text-xs bg-gray-100 rounded-lg text-gray-700 overflow-x-auto">
                      POST /api/events/{eventId}/tickets
                    </code>
                    <button className="px-3 py-2 text-xs font-medium text-gblue bg-gblue/10 rounded-lg hover:bg-gblue/20 transition-colors">
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">API Key</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 text-xs bg-gray-100 rounded-lg text-gray-700">
                      pk_live_••••••••••••
                    </code>
                    <button className="px-3 py-2 text-xs font-medium text-gblue bg-gblue/10 rounded-lg hover:bg-gblue/20 transition-colors">
                      Copy
                    </button>
                  </div>
                </div>
                <a href="#" className="inline-block mt-4 text-xs text-gblue hover:underline">View API documentation</a>
              </div>
            ) : issueMethod === 'csv' ? (
              <div className="p-5">
                <label className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Drop CSV file or click to upload</span>
                  <span className="text-xs text-gray-400 mt-1">Required columns: name, email</span>
                  <input type="file" className="hidden" accept=".csv" />
                </label>
                <a href="#" className="inline-block mt-3 text-xs text-gblue hover:underline">Download template CSV</a>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Attendee Name</label>
                  <input
                    type="text"
                    placeholder="John Smith"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
                  />
                </div>
                <button className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark transition-colors">
                  Issue Ticket
                </button>
              </div>
            )}

            <div className="p-4 border-t border-gray-100 flex justify-between">
              {issueMethod && (
                <button
                  onClick={() => setIssueMethod(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => { setShowIssueModal(false); setIssueMethod(null); }}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
