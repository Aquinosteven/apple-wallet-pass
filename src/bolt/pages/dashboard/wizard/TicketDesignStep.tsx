import { Upload, QrCode, Eye, EyeOff } from 'lucide-react';
import { EventDetailsData } from './EventDetailsStep';

export interface TicketDesignData {
  logoUrl: string | null;
  stripUrl: string | null;
  backgroundColor: string;
  labelColor: string;
  autoContrast: boolean;
  showDateTime: boolean;
  showPrimaryAction: boolean;
  showOrganizer: boolean;
  showQr: boolean;
}

interface TicketDesignStepProps {
  eventData: EventDetailsData;
  designData: TicketDesignData;
  onChange: (data: TicketDesignData) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  isSavingDraft?: boolean;
  onPublish: () => void;
  isPublishing: boolean;
}

function formatDate(dateStr: string, dateMode: 'single' | 'range', endDateStr?: string): string {
  if (!dateStr) return 'Date TBD';
  const date = new Date(dateStr + 'T00:00:00');
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (dateMode === 'range' && endDateStr) {
    const endDate = new Date(endDateStr + 'T00:00:00');
    const endFormatted = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${formatted} - ${endFormatted}`;
  }
  return formatted;
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getTimezoneAbbr(tz: string): string {
  const abbrs: Record<string, string> = {
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
  return abbrs[tz] || '';
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export default function TicketDesignStep({
  eventData,
  designData,
  onChange,
  onBack,
  onSaveDraft,
  isSavingDraft = false,
  onPublish,
  isPublishing,
}: TicketDesignStepProps) {
  const update = (field: keyof TicketDesignData, value: string | boolean | null) => {
    onChange({ ...designData, [field]: value });
  };

  const textColor = designData.autoContrast
    ? getContrastColor(designData.backgroundColor)
    : designData.labelColor;

  const dateDisplay = formatDate(eventData.startDate, eventData.dateMode, eventData.endDate);
  const timeDisplay = formatTime(eventData.startTime);
  const tzAbbr = getTimezoneAbbr(eventData.timezone);

  return (
    <div className="grid grid-cols-5 gap-8">
      <div className="col-span-3 space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Branding</h3>
          <p className="text-xs text-gray-500 mb-5">Upload images and set colors for your ticket.</p>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Logo</label>
              {designData.logoUrl ? (
                <div className="relative w-full h-24 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden group">
                  <img src={designData.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain p-2" />
                  <button
                    type="button"
                    onClick={() => update('logoUrl', null)}
                    className="absolute inset-0 bg-black/50 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="w-full h-24 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Upload logo</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={() => update('logoUrl', 'https://images.pexels.com/photos/4065158/pexels-photo-4065158.jpeg?auto=compress&cs=tinysrgb&w=160')}
                  />
                </label>
              )}
              <p className="text-[10px] text-gray-400 mt-1">160x50px, PNG with transparency</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Strip Image</label>
              {designData.stripUrl ? (
                <div className="relative w-full h-24 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden group">
                  <img src={designData.stripUrl} alt="Strip" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => update('stripUrl', null)}
                    className="absolute inset-0 bg-black/50 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="w-full h-24 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Upload strip</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={() => update('stripUrl', 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=600')}
                  />
                </label>
              )}
              <p className="text-[10px] text-gray-400 mt-1">1125x432px, JPG or PNG</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Background Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={designData.backgroundColor}
                  onChange={(e) => update('backgroundColor', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={designData.backgroundColor}
                  onChange={(e) => update('backgroundColor', e.target.value)}
                  className="w-24 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Text Color</label>
              <div className="flex items-center gap-3">
                {designData.autoContrast ? (
                  <div
                    className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center"
                    style={{ backgroundColor: textColor }}
                  >
                    <span className="text-[10px]" style={{ color: getContrastColor(textColor) }}>AUTO</span>
                  </div>
                ) : (
                  <input
                    type="color"
                    value={designData.labelColor}
                    onChange={(e) => update('labelColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={designData.autoContrast}
                    onChange={(e) => update('autoContrast', e.target.checked)}
                    className="w-4 h-4 text-gblue border-gray-300 rounded focus:ring-gblue"
                  />
                  <span className="text-xs text-gray-600">Auto contrast</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Field Display</h3>
          <p className="text-xs text-gray-500 mb-5">Choose which fields appear on the front of the ticket.</p>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                {designData.showDateTime ? (
                  <Eye className="w-4 h-4 text-gblue" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700">Date & Time</span>
              </div>
              <input
                type="checkbox"
                checked={designData.showDateTime}
                onChange={(e) => update('showDateTime', e.target.checked)}
                className="w-4 h-4 text-gblue border-gray-300 rounded focus:ring-gblue"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                {designData.showPrimaryAction ? (
                  <Eye className="w-4 h-4 text-gblue" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700">Primary Action</span>
              </div>
              <input
                type="checkbox"
                checked={designData.showPrimaryAction}
                onChange={(e) => update('showPrimaryAction', e.target.checked)}
                className="w-4 h-4 text-gblue border-gray-300 rounded focus:ring-gblue"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                {designData.showOrganizer ? (
                  <Eye className="w-4 h-4 text-gblue" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700">Organizer</span>
              </div>
              <input
                type="checkbox"
                checked={designData.showOrganizer}
                onChange={(e) => update('showOrganizer', e.target.checked)}
                className="w-4 h-4 text-gblue border-gray-300 rounded focus:ring-gblue"
              />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">QR Code</h3>
              <p className="text-xs text-gray-500">QR content is dynamic per attendee when tickets are issued.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={designData.showQr}
                onChange={(e) => update('showQr', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gblue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gblue"></div>
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-gray-50/80 -mx-8 -mb-8 px-8 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Back
            </button>
            <div className="flex items-center gap-3">
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
                onClick={onPublish}
                disabled={isPublishing}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPublishing ? 'Publishing...' : 'Publish Ticket'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-2">
        <div className="sticky top-6">
          <p className="text-xs font-medium text-gray-500 mb-3">Live Preview</p>
          <div
            className="w-full rounded-2xl overflow-hidden shadow-xl"
            style={{ backgroundColor: designData.backgroundColor }}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                {designData.logoUrl ? (
                  <div className="w-14 h-10 bg-white/20 rounded flex items-center justify-center overflow-hidden">
                    <img src={designData.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="w-14 h-10 bg-white/20 rounded flex items-center justify-center">
                    <span className="text-[8px] font-medium" style={{ color: textColor, opacity: 0.6 }}>LOGO</span>
                  </div>
                )}
                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: textColor, opacity: 0.6 }}>
                  Event Ticket
                </span>
              </div>

              {designData.stripUrl ? (
                <div className="rounded-lg h-24 mb-4 overflow-hidden">
                  <img src={designData.stripUrl} alt="Strip" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div
                  className="rounded-lg h-24 mb-4 flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <span className="text-[10px]" style={{ color: textColor, opacity: 0.4 }}>Strip Image</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: textColor, opacity: 0.5 }}>Event</p>
                  <p className="text-base font-semibold leading-tight" style={{ color: textColor }}>
                    {eventData.name || 'Event Name'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {designData.showDateTime && (
                    <>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: textColor, opacity: 0.5 }}>Date</p>
                        <p className="text-xs font-medium" style={{ color: textColor }}>{dateDisplay}</p>
                      </div>
                      {timeDisplay && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: textColor, opacity: 0.5 }}>Time</p>
                          <p className="text-xs font-medium" style={{ color: textColor }}>{timeDisplay} {tzAbbr}</p>
                        </div>
                      )}
                    </>
                  )}

                  {designData.showPrimaryAction && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: textColor, opacity: 0.5 }}>Action</p>
                      <p className="text-xs font-medium" style={{ color: textColor }}>
                        {eventData.actionButtonLabel || (eventData.primaryActionType === 'dynamic' ? 'Dynamic link' : 'Join Event')}
                      </p>
                    </div>
                  )}

                  {designData.showOrganizer && eventData.organizerName && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: textColor, opacity: 0.5 }}>Organizer</p>
                      <p className="text-xs font-medium" style={{ color: textColor }}>{eventData.organizerName}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {designData.showQr && (
              <div className="bg-white p-4 flex items-center justify-center">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                  <QrCode className="w-14 h-14 text-gray-400" />
                </div>
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-3">Apple Wallet preview</p>
        </div>
      </div>
    </div>
  );
}
