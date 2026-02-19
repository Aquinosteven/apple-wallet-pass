import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar } from 'lucide-react';
import EventCard, { Event, EventStatus } from './components/EventCard';

const sampleEvents: Event[] = [
  {
    id: '1',
    name: 'Q1 Revenue Masterclass',
    date: 'Mar 15, 2026',
    time: '2:00 PM',
    timezone: 'EST',
    status: 'active',
    ticketsIssued: 342,
    walletAdds: 298,
    checkIns: 156,
  },
  {
    id: '2',
    name: 'Product Launch Webinar',
    date: 'Mar 22, 2026',
    time: '11:00 AM',
    timezone: 'PST',
    status: 'ready',
    ticketsIssued: 0,
    walletAdds: 0,
    checkIns: 0,
  },
  {
    id: '3',
    name: '5-Day Conversion Challenge',
    date: 'Apr 1-5, 2026',
    status: 'draft',
    ticketsIssued: 0,
    walletAdds: 0,
    checkIns: 0,
  },
  {
    id: '4',
    name: 'Annual Sales Conference 2025',
    date: 'Dec 10, 2025',
    time: '9:00 AM',
    timezone: 'CST',
    status: 'ended',
    ticketsIssued: 1250,
    walletAdds: 1180,
    checkIns: 1043,
  },
];

const filterOptions: { value: EventStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Events' },
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'active', label: 'Active' },
  { value: 'ended', label: 'Ended' },
];

export default function EventsDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');

  const filteredEvents = sampleEvents.filter((event) => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const hasEvents = sampleEvents.length > 0;

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create an event, publish your ticket, then issue tickets to attendees.
          </p>
        </div>
        <Link
          to="/dashboard/events/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Event
        </Link>
      </div>

      {hasEvents ? (
        <>
          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EventStatus | 'all')}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No events match your search.</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-gblue/10 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7 text-gblue" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Create your first event</h2>
            <p className="text-sm text-gray-500 mb-6">
              An event contains your ticket design and all issued tickets.
            </p>
            <Link
              to="/dashboard/events/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Event
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
