import { useEffect, useMemo, useState } from 'react';
import { Search, Ticket, Wallet, UserCheck, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listRegistrants, type ApiRegistrant } from '../../utils/backendApi';

const statusConfig = {
  issued: { label: 'Issued', color: 'text-gray-500', bg: 'bg-gray-100' },
  added: { label: 'Added', color: 'text-gblue', bg: 'bg-gblue/10' },
  checked_in: { label: 'Checked In', color: 'text-ggreen', bg: 'bg-ggreen/10' },
  expired: { label: 'Expired', color: 'text-gray-400', bg: 'bg-gray-100' },
};

export default function GlobalTicketsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tickets, setTickets] = useState<ApiRegistrant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadTickets() {
      try {
        setIsLoading(true);
        setLoadError(null);
        const loadedTickets = await listRegistrants();
        if (!mounted) return;
        setTickets(loadedTickets);
      } catch (error) {
        if (!mounted) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load issued tickets.');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTickets();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredTickets = useMemo(() => (
    tickets.filter((ticket) =>
      ticket.attendeeName.toLowerCase().includes(searchQuery.toLowerCase())
      || ticket.email.toLowerCase().includes(searchQuery.toLowerCase())
      || ticket.eventName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ), [searchQuery, tickets]);

  const stats = {
    total: tickets.length,
    added: tickets.filter((ticket) => ticket.status === 'added' || ticket.status === 'checked_in').length,
    checkedIn: tickets.filter((ticket) => ticket.status === 'checked_in').length,
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Issued Tickets</h1>
        <p className="text-sm text-gray-500 mt-1">
          View all attendee passes issued across your events.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">Loading issued tickets...</p>
          </div>
        ) : loadError ? (
          <div className="text-center py-12 px-6">
            <p className="text-sm font-medium text-gray-900">Issued tickets could not be loaded.</p>
            <p className="mt-1 text-sm text-gray-500">{loadError}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
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
                          {ticket.eventName || 'Event'}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400">{ticket.issuedAtLabel}</span>
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
          </div>
        )}

        {!isLoading && !loadError && filteredTickets.length === 0 && (
          <div className="text-center py-12 px-6">
            <p className="text-sm font-medium text-gray-900">No tickets found.</p>
            <p className="mt-1 text-sm text-gray-500">Issue tickets from an event to see them here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
