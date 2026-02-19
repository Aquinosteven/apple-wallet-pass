import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, Clock, MousePointer, Tag } from 'lucide-react';

export interface EventDetailsData {
  name: string;
  eventType: 'webinar' | 'challenge' | 'call' | 'other';
  dateMode: 'single' | 'range';
  startDate: string;
  endDate: string;
  startTime: string;
  timezone: string;
  primaryActionType: 'fixed' | 'dynamic';
  primaryActionUrl: string;
  actionButtonLabel: string;
  websiteUrl: string;
  description: string;
  organizerName: string;
  supportContact: string;
  relevanceTiming: 'at_start' | '30_before' | '1_hour_before' | 'custom';
  relevanceCustomTime: string;
  postEventBehavior: 'nothing' | 'expire' | 'update_link';
  postEventUrl: string;
  expiration: 'never' | 'at_event_end' | 'custom';
  expirationDate: string;
  allowUpdates: boolean;
  enableCheckIn: boolean;
}

interface EventDetailsStepProps {
  data: EventDetailsData;
  onChange: (data: EventDetailsData) => void;
  onSaveDraft: () => void;
  isSavingDraft?: boolean;
  onContinue: () => void;
}

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' },
];

const eventTypes = [
  { value: 'webinar', label: 'Webinar' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'call', label: 'Call' },
  { value: 'other', label: 'Other' },
];

const actionLabelPlaceholders: Record<string, string> = {
  webinar: 'Join Webinar',
  challenge: 'Open Day 1',
  call: 'Join Call',
  other: 'Watch Training',
};

function formatPreviewDate(dateStr: string, dateMode: 'single' | 'range', endDateStr?: string): string {
  if (!dateStr) return 'Not set';
  const date = new Date(dateStr + 'T00:00:00');
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (dateMode === 'range' && endDateStr) {
    const endDate = new Date(endDateStr + 'T00:00:00');
    const endFormatted = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${formatted} - ${endFormatted}`;
  }
  return formatted;
}

function formatPreviewTime(timeStr: string, tz: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  const tzAbbrs: Record<string, string> = {
    'America/New_York': 'ET',
    'America/Chicago': 'CT',
    'America/Denver': 'MT',
    'America/Los_Angeles': 'PT',
    'America/Phoenix': 'MST',
    'America/Anchorage': 'AKT',
    'Pacific/Honolulu': 'HST',
    'Europe/London': 'GMT',
    'Europe/Paris': 'CET',
    'Asia/Tokyo': 'JST',
    'Australia/Sydney': 'AEST',
    'UTC': 'UTC',
  };
  return `${hour12}:${minutes} ${ampm} ${tzAbbrs[tz] || ''}`.trim();
}

export default function EventDetailsStep({
  data,
  onChange,
  onSaveDraft,
  isSavingDraft = false,
  onContinue,
}: EventDetailsStepProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const update = (field: keyof EventDetailsData, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  const isValid = data.name.trim() && data.timezone;

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Core Info</h3>
          <p className="text-xs text-gray-500 mb-5">Basic event details that appear on your ticket.</p>

          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Event Name <span className="text-gred">*</span>
                </label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g., Product Launch Webinar"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Type</label>
                <select
                  value={data.eventType}
                  onChange={(e) => update('eventType', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
                >
                  {eventTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Used to suggest defaults</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <div className="flex items-center gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dateMode"
                    checked={data.dateMode === 'single'}
                    onChange={() => update('dateMode', 'single')}
                    className="w-4 h-4 text-gblue border-gray-300 focus:ring-gblue"
                  />
                  <span className="text-sm text-gray-700">Single date</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dateMode"
                    checked={data.dateMode === 'range'}
                    onChange={() => update('dateMode', 'range')}
                    className="w-4 h-4 text-gblue border-gray-300 focus:ring-gblue"
                  />
                  <span className="text-sm text-gray-700">Date range</span>
                </label>
              </div>
              <div className={`grid gap-3 ${data.dateMode === 'range' ? 'grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>
                <div>
                  <input
                    type="date"
                    value={data.startDate}
                    onChange={(e) => update('startDate', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
                  />
                </div>
                {data.dateMode === 'range' && (
                  <div>
                    <input
                      type="date"
                      value={data.endDate}
                      onChange={(e) => update('endDate', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={data.startTime}
                  onChange={(e) => update('startTime', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Timezone <span className="text-gred">*</span>
                </label>
                <select
                  value={data.timezone}
                  onChange={(e) => update('timezone', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
                >
                  <option value="">Select timezone</option>
                  {timezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Primary Action</h3>
          <p className="text-xs text-gray-500 mb-5">This is the main action attendees tap from the ticket (join, watch, or open).</p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Action Link</label>
              <div className="flex items-center gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="primaryActionType"
                    checked={data.primaryActionType === 'fixed'}
                    onChange={() => update('primaryActionType', 'fixed')}
                    className="w-4 h-4 text-gblue border-gray-300 focus:ring-gblue"
                  />
                  <span className="text-sm text-gray-700">Fixed link</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="primaryActionType"
                    checked={data.primaryActionType === 'dynamic'}
                    onChange={() => update('primaryActionType', 'dynamic')}
                    className="w-4 h-4 text-gblue border-gray-300 focus:ring-gblue"
                  />
                  <span className="text-sm text-gray-700">Dynamic link</span>
                </label>
              </div>
              {data.primaryActionType === 'fixed' ? (
                <div>
                  <input
                    type="url"
                    value={data.primaryActionUrl}
                    onChange={(e) => update('primaryActionUrl', e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
                  />
                  <p className="text-xs text-gray-400 mt-1">Same link for all attendees</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Link can be updated later and pushed to issued tickets.</p>
                  <p className="text-xs text-gray-400 mt-2">Supported: Zoom, GoHighLevel, Calendly</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Action Button Label</label>
              <input
                type="text"
                value={data.actionButtonLabel}
                onChange={(e) => update('actionButtonLabel', e.target.value)}
                placeholder={actionLabelPlaceholders[data.eventType] || 'Join Event'}
                className="w-full max-w-xs px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">Text shown on the ticket's main action button</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Links & Info</h3>
          <p className="text-xs text-gray-500 mb-5">Additional details shown on the back of the ticket.</p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Website URL</label>
                <input
                  type="url"
                  value={data.websiteUrl}
                  onChange={(e) => update('websiteUrl', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Organizer Name</label>
                <input
                  type="text"
                  value={data.organizerName}
                  onChange={(e) => update('organizerName', e.target.value)}
                  placeholder="Your company name"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Description</label>
              <textarea
                value={data.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Brief description of your event..."
                rows={3}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Support Contact</label>
              <input
                type="text"
                value={data.supportContact}
                onChange={(e) => update('supportContact', e.target.value)}
                placeholder="Email or URL"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Advanced</h3>
              <p className="text-xs text-gray-500">Timing, lifecycle, and check-in settings</p>
            </div>
            {advancedOpen ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {advancedOpen && (
            <div className="px-6 pb-6 pt-2 border-t border-gray-100 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ticket Relevance Timing</label>
                <select
                  value={data.relevanceTiming}
                  onChange={(e) => update('relevanceTiming', e.target.value)}
                  className="w-full max-w-xs px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
                >
                  <option value="at_start">At event start</option>
                  <option value="30_before">30 minutes before</option>
                  <option value="1_hour_before">1 hour before</option>
                  <option value="custom">Custom time</option>
                </select>
                {data.relevanceTiming === 'custom' && (
                  <input
                    type="time"
                    value={data.relevanceCustomTime}
                    onChange={(e) => update('relevanceCustomTime', e.target.value)}
                    className="mt-2 w-full max-w-xs px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
                  />
                )}
                <p className="text-xs text-gray-400 mt-1">Controls when the ticket becomes prominent in Apple Wallet</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">After Event Ends</label>
                <select
                  value={data.postEventBehavior}
                  onChange={(e) => update('postEventBehavior', e.target.value)}
                  className="w-full max-w-xs px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
                >
                  <option value="nothing">Do nothing</option>
                  <option value="expire">Expire ticket</option>
                  <option value="update_link">Update primary action link</option>
                </select>
                {data.postEventBehavior === 'update_link' && (
                  <input
                    type="url"
                    value={data.postEventUrl}
                    onChange={(e) => update('postEventUrl', e.target.value)}
                    placeholder="https://replay.example.com/..."
                    className="mt-2 w-full max-w-xs px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
                  />
                )}
                <p className="text-xs text-gray-400 mt-1">Useful for replays, follow-ups, or next steps</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiration</label>
                <select
                  value={data.expiration}
                  onChange={(e) => update('expiration', e.target.value)}
                  className="w-full max-w-xs px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
                >
                  <option value="never">Never</option>
                  <option value="at_event_end">At event end</option>
                  <option value="custom">Custom date/time</option>
                </select>
                {data.expiration === 'custom' && (
                  <input
                    type="datetime-local"
                    value={data.expirationDate}
                    onChange={(e) => update('expirationDate', e.target.value)}
                    className="mt-2 w-full max-w-xs px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue transition-colors"
                  />
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Allow ticket updates</p>
                    <p className="text-xs text-gray-500">Push changes to issued tickets</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={data.allowUpdates}
                      onChange={(e) => update('allowUpdates', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gblue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gblue"></div>
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Enable check-in</p>
                    <p className="text-xs text-gray-500">Scan QR codes at entry</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={data.enableCheckIn}
                      onChange={(e) => update('enableCheckIn', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gblue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gblue"></div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-gray-50/80 -mx-8 -mb-8 px-8 py-4 border-t border-gray-200">
          <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={isSavingDraft}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSavingDraft ? 'Saving...' : 'Save Draft'}
              </button>
            <button
              type="button"
              onClick={onContinue}
              disabled={!isValid}
              className="px-5 py-2.5 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue to Ticket Design
            </button>
          </div>
        </div>
      </div>

      <div className="col-span-1">
        <div className="sticky top-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Ticket Preview Summary</h4>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-4 h-4 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Event Name</p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {data.name || 'Not set'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatPreviewDate(data.startDate, data.dateMode, data.endDate)}
                  </p>
                </div>
              </div>

              {data.startTime && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Time</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatPreviewTime(data.startTime, data.timezone)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <MousePointer className="w-4 h-4 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Action Button</p>
                  <p className="text-sm font-medium text-gray-900">
                    {data.actionButtonLabel || actionLabelPlaceholders[data.eventType] || 'Join Event'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded-full capitalize">
                    {data.eventType}
                  </span>
                  <span className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {data.primaryActionType === 'dynamic' ? 'Dynamic link' : 'Fixed link'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
