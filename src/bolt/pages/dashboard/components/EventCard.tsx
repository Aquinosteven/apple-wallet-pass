import { Link } from 'react-router-dom';
import { Share2, Settings, Ticket, Wallet, UserCheck } from 'lucide-react';

export type EventStatus = 'draft' | 'ready' | 'active' | 'ended';

export interface Event {
  id: string;
  name: string;
  date?: string;
  time?: string;
  timezone?: string;
  status: EventStatus;
  ticketsIssued: number;
  walletAdds: number;
  checkIns: number;
}

const statusConfig: Record<EventStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-gray-500', bg: 'bg-gray-100' },
  ready: { label: 'Ready', color: 'text-gblue', bg: 'bg-gblue/10' },
  active: { label: 'Active', color: 'text-ggreen', bg: 'bg-ggreen/10' },
  ended: { label: 'Ended', color: 'text-gray-400', bg: 'bg-gray-100' },
};

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const status = statusConfig[event.status];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">{event.name}</h3>
          {event.date && (
            <p className="text-xs text-gray-400 mt-0.5">
              {event.date}
              {event.time && ` at ${event.time}`}
              {event.timezone && ` (${event.timezone})`}
            </p>
          )}
        </div>
        <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${status.bg} ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center gap-4 py-3 border-t border-b border-gray-50 mb-4">
        <div className="flex items-center gap-1.5">
          <Ticket className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900">{event.ticketsIssued}</span> issued
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900">{event.walletAdds}</span> adds
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900">{event.checkIns}</span> check-ins
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link
          to={`/dashboard/events/${event.id}`}
          className="px-3.5 py-1.5 text-xs font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark transition-colors"
        >
          View Event
        </Link>
        <div className="flex items-center gap-1">
          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
