import { Copy, QrCode, Link as LinkIcon, ExternalLink, Info } from 'lucide-react';
import { useState } from 'react';

interface DistributionTabProps {
  eventId: string;
}

export default function DistributionTab({ eventId }: DistributionTabProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = 'https://passkit.io';
  const landingLink = `${baseUrl}/e/${eventId}`;
  const apiEndpoint = `${baseUrl}/api/events/${eventId}/tickets`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-gblue/5 border border-gblue/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-gblue flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-gray-700">
            <strong className="text-gray-900">Each ticket is unique.</strong> When you issue a ticket via API, CSV, or manual entry, a personalized "Add to Wallet" link is generated for that attendee.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Landing Page Link</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Share this link on your registration thank-you page. When attendees visit, they can add the ticket to their wallet.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 overflow-x-auto">
            {landingLink}
          </code>
          <button
            onClick={() => handleCopy(landingLink, 'landing')}
            className="px-3.5 py-2.5 text-sm font-medium text-gblue bg-gblue/10 rounded-lg hover:bg-gblue/20 transition-colors flex items-center gap-1.5"
          >
            <Copy className="w-4 h-4" />
            {copied === 'landing' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <a
          href={landingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-3 text-xs text-gblue hover:underline"
        >
          Open preview <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">QR Code</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Display this QR code at your event or on printed materials. Attendees scan to get their ticket.
        </p>
        <div className="flex items-start gap-6">
          <div className="w-40 h-40 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center">
            <QrCode className="w-24 h-24 text-gray-400" />
          </div>
          <div className="space-y-2">
            <button className="px-3.5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors w-full text-left">
              Download PNG
            </button>
            <button className="px-3.5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors w-full text-left">
              Download SVG
            </button>
            <p className="text-[10px] text-gray-400 pt-1">High resolution for print</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">API Integration</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Issue tickets programmatically after registration. The API returns a unique "Add to Wallet" link for each attendee.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Endpoint</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-mono">
                POST {apiEndpoint}
              </code>
              <button
                onClick={() => handleCopy(apiEndpoint, 'api')}
                className="px-3 py-2 text-xs font-medium text-gblue bg-gblue/10 rounded-lg hover:bg-gblue/20 transition-colors"
              >
                {copied === 'api' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Example Request Body</label>
            <pre className="px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-mono overflow-x-auto">
{`{
  "attendee_name": "John Smith",
  "email": "john@example.com"
}`}
            </pre>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Example Response</label>
            <pre className="px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-mono overflow-x-auto">
{`{
  "ticket_id": "tk_abc123",
  "wallet_url": "https://passkit.io/wallet/tk_abc123"
}`}
            </pre>
          </div>
        </div>
        <a href="#" className="inline-flex items-center gap-1 mt-4 text-xs text-gblue hover:underline">
          View full API documentation <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
