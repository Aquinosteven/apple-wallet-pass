import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, Share2, Send, CheckCircle, X } from 'lucide-react';
import { EventStatus } from './components/EventCard';
import OverviewTab from './components/tabs/OverviewTab';
import TicketEditorTab from './components/tabs/TicketEditorTab';
import IssuedTicketsTab from './components/tabs/IssuedTicketsTab';
import DistributionTab from './components/tabs/DistributionTab';
import EventSettingsTab from './components/tabs/EventSettingsTab';
import Toast from '../../components/Toast';

interface EventData {
  id: string;
  name: string;
  date?: string;
  time?: string;
  timezone?: string;
  description?: string;
  status: EventStatus;
  ticketPublished: boolean;
  ticketsIssued: number;
  walletAdds: number;
  checkIns: number;
  lastIssuedAt?: string;
}

const sampleEvent: EventData = {
  id: '1',
  name: 'Q1 Revenue Masterclass',
  date: 'Mar 15, 2026',
  time: '2:00 PM',
  timezone: 'EST',
  description: 'A comprehensive masterclass on revenue optimization strategies for Q1.',
  status: 'active',
  ticketPublished: true,
  ticketsIssued: 342,
  walletAdds: 298,
  checkIns: 156,
  lastIssuedAt: '2 hours ago',
};

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'ticket', label: 'Ticket' },
  { id: 'issued', label: 'Issued Tickets' },
  { id: 'distribution', label: 'Distribution' },
  { id: 'settings', label: 'Settings' },
];

const statusConfig: Record<EventStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-gray-500', bg: 'bg-gray-100' },
  ready: { label: 'Ready', color: 'text-gblue', bg: 'bg-gblue/10' },
  active: { label: 'Active', color: 'text-ggreen', bg: 'bg-ggreen/10' },
  ended: { label: 'Ended', color: 'text-gray-400', bg: 'bg-gray-100' },
};

export default function EventDetailPage() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('new') === 'true';
  const justPublished = searchParams.get('published') === 'true';

  const [activeTab, setActiveTab] = useState('overview');
  const [event, setEvent] = useState<EventData>(() => ({
    ...sampleEvent,
    status: justPublished ? 'ready' : sampleEvent.status,
    ticketPublished: justPublished || sampleEvent.ticketPublished,
  }));
  const [showToast, setShowToast] = useState(isNew || justPublished);
  const [showNextSteps, setShowNextSteps] = useState(justPublished);

  const status = statusConfig[event.status];

  const handlePublishTicket = () => {
    setEvent((prev) => ({
      ...prev,
      status: 'ready',
      ticketPublished: true,
    }));
    setShowToast(true);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab event={event} onPublish={handlePublishTicket} />;
      case 'ticket':
        return <TicketEditorTab event={event} onPublish={handlePublishTicket} />;
      case 'issued':
        return <IssuedTicketsTab eventId={eventId || ''} />;
      case 'distribution':
        return <DistributionTab eventId={eventId || ''} />;
      case 'settings':
        return <EventSettingsTab event={event} setEvent={setEvent} />;
      default:
        return null;
    }
  };

  const getToastMessage = () => {
    if (justPublished) return 'Ticket published. Next: issue tickets to attendees.';
    if (isNew) return 'Event created. Next: publish your ticket.';
    return 'Ticket published. You can now issue tickets.';
  };

  return (
    <div className="max-w-5xl">
      {showToast && (
        <Toast
          notification={{ type: 'success', message: getToastMessage() }}
          onDismiss={() => setShowToast(false)}
        />
      )}

      {showNextSteps && (
        <div className="mb-6 bg-ggreen/5 border border-ggreen/20 rounded-xl p-5 relative">
          <button
            onClick={() => setShowNextSteps(false)}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-ggreen/10 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-ggreen" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Your ticket is ready</h3>
              <p className="text-sm text-gray-600 mb-4">
                Start issuing tickets to attendees. You can send them individually or in bulk via CSV upload.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('issued')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Issue Tickets
                </button>
                <button
                  onClick={() => setActiveTab('distribution')}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  View Distribution Options
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/dashboard" className="hover:text-gray-700 transition-colors">
          Events
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{event.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${status.bg} ${status.color}`}>
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          {event.status === 'draft' ? (
            <button
              onClick={handlePublishTicket}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark transition-colors"
            >
              Publish Ticket
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('issued')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark transition-colors"
            >
              <Send className="w-4 h-4" />
              Issue Tickets
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                pb-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-gblue text-gblue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {renderTabContent()}
    </div>
  );
}
