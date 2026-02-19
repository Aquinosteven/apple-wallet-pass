import { useEffect, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { EventStatus } from '../EventCard';

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

interface EventSettingsTabProps {
  event: EventData;
  onSave: (event: EventData) => Promise<void> | void;
}

export default function EventSettingsTab({ event, onSave }: EventSettingsTabProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date || '');
  const [time, setTime] = useState(event.time || '');
  const [description, setDescription] = useState(event.description || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(event.name);
    setDate(event.date || '');
    setTime(event.time || '');
    setDescription(event.description || '');
  }, [event]);

  const handleSave = async () => {
    const updatedEvent: EventData = {
      ...event,
      name,
      date: date || undefined,
      time: time || undefined,
      description: description || undefined,
    };

    try {
      setIsSaving(true);
      await onSave(updatedEvent);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Event Details</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Event Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="Mar 15, 2026"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Time</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="2:00 PM EST"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of your event..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue resize-none"
            />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gred/30 p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-gred" />
          <h3 className="text-sm font-semibold text-gray-900">Danger Zone</h3>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Deleting an event will permanently remove all associated data, including issued tickets. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-gred bg-gred/10 rounded-lg hover:bg-gred/20 transition-colors"
          >
            Delete Event
          </button>
        ) : (
          <div className="p-4 bg-gred/5 rounded-lg border border-gred/20">
            <p className="text-sm text-gray-700 mb-3">
              Are you sure you want to delete <strong>{event.name}</strong>? This will remove all issued tickets.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gred rounded-lg hover:bg-gred-dark transition-colors">
                <Trash2 className="w-4 h-4" />
                Delete Event
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
