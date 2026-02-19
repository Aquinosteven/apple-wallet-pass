import { Ticket, Wallet, UserCheck, Clock, CheckCircle2, Circle } from 'lucide-react';
import { EventStatus } from '../EventCard';

interface EventData {
  status: EventStatus;
  ticketPublished: boolean;
  ticketsIssued: number;
  walletAdds: number;
  checkIns: number;
  lastIssuedAt?: string;
}

interface OverviewTabProps {
  event: EventData;
  onPublish: () => void;
}

const statusMessages: Record<EventStatus, { title: string; description: string; color: string }> = {
  draft: {
    title: 'Your ticket isn\'t published yet',
    description: 'Design your ticket template, then publish to start issuing tickets to attendees.',
    color: 'border-gray-200 bg-gray-50',
  },
  ready: {
    title: 'Ticket is published',
    description: 'Your ticket template is ready. Issue tickets to attendees via API, CSV, or manual entry.',
    color: 'border-gblue/20 bg-gblue/5',
  },
  active: {
    title: 'Tickets are being issued',
    description: 'Attendees are receiving tickets. Track wallet adds and check-ins below.',
    color: 'border-ggreen/20 bg-ggreen/5',
  },
  ended: {
    title: 'Event has ended',
    description: 'This event is no longer active. You can still view issued tickets and analytics.',
    color: 'border-gray-200 bg-gray-50',
  },
};

export default function OverviewTab({ event, onPublish }: OverviewTabProps) {
  const statusInfo = statusMessages[event.status];

  const steps = [
    { label: 'Create Event', done: true },
    { label: 'Publish Ticket', done: event.ticketPublished },
    { label: 'Issue Tickets', done: event.ticketsIssued > 0 },
  ];

  return (
    <div className="space-y-6">
      <div className={`rounded-xl border p-5 ${statusInfo.color}`}>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{statusInfo.title}</h3>
        <p className="text-sm text-gray-600">{statusInfo.description}</p>
        {event.status === 'draft' && (
          <button
            onClick={onPublish}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark transition-colors"
          >
            Publish Ticket
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ticket className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Tickets Issued</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{event.ticketsIssued}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Wallet Adds</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{event.walletAdds}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Check-ins</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{event.checkIns}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Last Issued</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{event.lastIssuedAt || '—'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Next Steps</h3>
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-3">
              {step.done ? (
                <CheckCircle2 className="w-5 h-5 text-ggreen" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300" />
              )}
              <span className={`text-sm ${step.done ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
