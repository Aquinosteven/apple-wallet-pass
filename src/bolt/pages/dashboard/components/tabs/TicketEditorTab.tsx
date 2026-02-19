import { useEffect, useState } from 'react';
import { Upload, Image, Palette, QrCode, Clock, Info } from 'lucide-react';
import { EventStatus } from '../EventCard';
import type { ApiTicketDesign } from '../../../../utils/backendApi';

interface EventData {
  status: EventStatus;
  ticketPublished: boolean;
}

interface TicketEditorTabProps {
  event: EventData;
  eventId: string;
  ticketDesign: ApiTicketDesign | null;
  onSaveDraft: (ticketDesign: ApiTicketDesign) => Promise<void> | void;
  onPublish: () => Promise<void> | void;
}

export default function TicketEditorTab({
  event,
  eventId,
  ticketDesign,
  onSaveDraft,
  onPublish,
}: TicketEditorTabProps) {
  const [backgroundColor, setBackgroundColor] = useState('#4285F4');
  const [barcodeEnabled, setBarcodeEnabled] = useState(true);
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [stripFile, setStripFile] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (!ticketDesign) return;
    setBackgroundColor(ticketDesign.backgroundColor || '#4285F4');
    setBarcodeEnabled(Boolean(ticketDesign.barcodeEnabled));
    setLogoFile(ticketDesign.logoUrl || null);
    setStripFile(ticketDesign.stripUrl || null);
  }, [ticketDesign]);

  const handleSaveDraft = async () => {
    const payload: ApiTicketDesign = {
      eventId,
      backgroundColor,
      barcodeEnabled,
      logoUrl: logoFile,
      stripUrl: stripFile,
    };

    try {
      setIsSavingDraft(true);
      await onSaveDraft(payload);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    const payload: ApiTicketDesign = {
      eventId,
      backgroundColor,
      barcodeEnabled,
      logoUrl: logoFile,
      stripUrl: stripFile,
    };

    try {
      setIsPublishing(true);
      await onSaveDraft(payload);
      await onPublish();
    } finally {
      setIsPublishing(false);
    }
  };

  const isPublished = event.ticketPublished;

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Image className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Visuals</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Logo</label>
              <div className="relative">
                {logoFile ? (
                  <div className="w-full h-24 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                    <img src={logoFile} alt="Logo" className="max-h-full max-w-full object-contain" />
                    <button
                      onClick={() => setLogoFile(null)}
                      className="absolute top-2 right-2 p-1 bg-white rounded-full shadow text-xs text-gray-500 hover:text-gray-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-24 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Upload logo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={() => setLogoFile('/placeholder-logo.png')} />
                  </label>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">160x50px, PNG with transparency</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Strip Image</label>
              <div className="relative">
                {stripFile ? (
                  <div className="w-full h-24 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                    <img src={stripFile} alt="Strip" className="max-h-full max-w-full object-cover" />
                    <button
                      onClick={() => setStripFile(null)}
                      className="absolute top-2 right-2 p-1 bg-white rounded-full shadow text-xs text-gray-500 hover:text-gray-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-24 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Upload strip</span>
                    <input type="file" className="hidden" accept="image/*" onChange={() => setStripFile('/placeholder-strip.png')} />
                  </label>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">1125x432px, JPG or PNG</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">
              <Palette className="w-3.5 h-3.5 inline mr-1" />
              Background Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-24 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue uppercase"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Ticket Fields</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Primary Field</label>
              <input
                type="text"
                placeholder="e.g., Event Name or {{attendee_name}}"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
              />
              <p className="text-[10px] text-gray-400 mt-1">Appears prominently on the ticket</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Location</label>
                <input
                  type="text"
                  placeholder="e.g., Zoom or venue address"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Date & Time</label>
                <input
                  type="text"
                  placeholder="e.g., Mar 15, 2:00 PM EST"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">Barcode / QR</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={barcodeEnabled}
                onChange={(e) => setBarcodeEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gblue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gblue"></div>
            </label>
          </div>
          {barcodeEnabled && (
            <p className="text-xs text-gray-500">
              A unique QR code will be generated for each issued ticket. Use it for check-ins.
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Rules</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Expiration</label>
              <select className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue">
                <option value="">No expiration</option>
                <option value="1h">1 hour after event</option>
                <option value="24h">24 hours after event</option>
                <option value="7d">7 days after event</option>
              </select>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50/95 backdrop-blur -mx-6 -mb-6 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSavingDraft ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handlePublish}
            disabled={isPublished || isPublishing}
            className="px-4 py-2 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPublished ? 'Published' : isPublishing ? 'Publishing...' : 'Publish Ticket'}
          </button>
        </div>
      </div>

      <div className="col-span-1">
        <div className="sticky top-6">
          <p className="text-xs font-medium text-gray-500 mb-3">Preview</p>
          <div
            className="w-full rounded-xl overflow-hidden shadow-lg"
            style={{ backgroundColor }}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-8 bg-white/20 rounded flex items-center justify-center text-[8px] text-white/60">
                  LOGO
                </div>
                <span className="text-[10px] text-white/60 font-medium">EVENT TICKET</span>
              </div>

              <div className="bg-white/10 rounded-lg h-20 mb-4 flex items-center justify-center text-[10px] text-white/40">
                Strip Image
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-white/50">EVENT</p>
                  <p className="text-sm font-semibold text-white">Q1 Revenue Masterclass</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-[10px] text-white/50">DATE</p>
                    <p className="text-xs text-white">Mar 15, 2026</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/50">TIME</p>
                    <p className="text-xs text-white">2:00 PM EST</p>
                  </div>
                </div>
              </div>
            </div>

            {barcodeEnabled && (
              <div className="bg-white p-3 flex items-center justify-center">
                <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-gray-400" />
                </div>
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">Apple Wallet preview</p>
        </div>
      </div>
    </div>
  );
}
