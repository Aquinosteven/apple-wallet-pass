import { useState } from 'react';
import { Search, Filter, Ticket, Wallet, UserCheck, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface IssuedTicket {
  id: string;
  eventId: string;
  eventName: string;
  attendeeName: string;
  email: string;
  issuedAt: string;
  status: 'issued' | 'added' | 'checked_in' | 'expired';
}

const sampleTickets: IssuedTicket[] = [
  { id: '1', eventId: '1', eventName: 'Q1 Revenue Masterclass', attendeeName: 'Sarah Chen', email: 'sarah@acme.com', issuedAt: 'Mar 10, 2:34 PM', status: 'added' },
  { id: '2', eventId: '1', eventName: 'Q1 Revenue Masterclass', attendeeName: 'Mike Johnson', email: 'mike@startup.io', issuedAt: 'Mar 10, 2:30 PM', status: 'checked_in' },
  { id: '3', eventId: '2', eventName: 'Product Launch Webinar', attendeeName: 'Emily Davis', email: 'emily@company.co', issuedAt: 'Mar 10, 2:25 PM', status: 'added' },
  { id: '4', eventId: '1', eventName: 'Q1 Revenue Masterclass', attendeeName: 'Alex Rivera', email: 'alex@agency.com', issuedAt: 'Mar 10, 2:20 PM', status: 'issued' },
  { id: '5', eventId: '4', eventName: 'Annual Sales Conference', attendeeName: 'Jordan Lee', email: 'jordan@tech.io', issuedAt: 'Mar 10, 2:15 PM', status: 'added' },
];

const statusConfig = {
  issued: { label: 'Issued', color: 'text-gray-500', bg: 'bg-gray-100' },
  added: { label: 'Added', color: 'text-gblue', bg: 'bg-gblue/10' },
  checked_in: { label: 'Checked In', color: 'text-ggreen', bg: 'bg-ggreen/10' },
  expired: { label: 'Expired', color: 'text-gray-400', bg: 'bg-gray-100' },
};

export default function GlobalTicketsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTickets = sampleTickets.filter(
    (ticket) =>
      ticket.attendeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.eventName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: sampleTickets.length,
    added: sampleTickets.filter(t => t.status === 'added' || t.status === 'checked_in').length,
    checkedIn: sampleTickets.filter(t => t.status === 'checked_in').length,
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Issued Tickets</h1>
        <p className="text-sm text-gray-500 mt-1">
          View all tickets issued across all events.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Total Issued</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Wallet Adds</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.added}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Check-ins</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.checkedIn}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
          />
        </div>
        <button className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Attendee</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Event</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Issued</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket) => {
              const status = statusConfig[ticket.status];
              return (
                <tr key={ticket.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ticket.attendeeName}</p>
                      <p className="text-xs text-gray-400">{ticket.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/dashboard/events/${ticket.eventId}`}
                      className="inline-flex items-center gap-1 text-sm text-gblue hover:underline"
                    >
                      {ticket.eventName}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">{ticket.issuedAt}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
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
    </div>
  );
}
