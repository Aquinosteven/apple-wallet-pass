import { ExternalLink, Info, Link as LinkIcon, Send, Upload, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface DistributionTabProps {
  eventId: string;
}

export default function DistributionTab({ eventId }: DistributionTabProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState('https://www.showfi.io');
  const apiEndpoint = `${origin}/api/registrants`;

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

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
            <strong className="text-gray-900">Each ticket is unique.</strong> Tickets are issued per attendee, and the
            API returns a unique pass record and claim token for each person you create.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Issuance Methods</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Choose the delivery path that matches your workflow. CSV upload and manual entry are available from the
          Issued Tickets tab, and API issuance is available below.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-gblue" />
              <p className="text-sm font-medium text-gray-900">API</p>
            </div>
            <p className="mt-2 text-xs text-gray-500">Issue tickets programmatically after registration or payment.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-ggreen" />
              <p className="text-sm font-medium text-gray-900">CSV upload</p>
            </div>
            <p className="mt-2 text-xs text-gray-500">Bulk-create attendee tickets from a spreadsheet export.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-gyellow-dark" />
              <p className="text-sm font-medium text-gray-900">Manual entry</p>
            </div>
            <p className="mt-2 text-xs text-gray-500">Create individual tickets one attendee at a time.</p>
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
          Issue tickets programmatically after registration. Send your authenticated request with the event ID and
          attendee details, and ShowFi will create the registrant plus pass record for that attendee.
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
            <label className="block text-xs text-gray-500 mb-1.5">Required Header</label>
            <pre className="px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-mono overflow-x-auto">
{`Authorization: Bearer <your-session-token>`}
            </pre>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Example Request Body</label>
            <pre className="px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-mono overflow-x-auto">
{`{
  "eventId": "${eventId}",
  "name": "John Smith",
  "email": "john@example.com",
  "source": "checkout"
}`}
            </pre>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Example Response</label>
            <pre className="px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-mono overflow-x-auto">
{`{
  "ok": true,
  "registrant": { "id": "reg_123", "email": "john@example.com" },
  "pass": { "id": "pass_123", "claim_token": "..." }
}`}
            </pre>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Link to="/dashboard/support" className="inline-flex items-center gap-1 text-xs text-gblue hover:underline">
            Contact support for integration help <ExternalLink className="w-3 h-3" />
          </Link>
          <span className="text-[11px] text-gray-400">Personalized claim links are created per attendee after issuance.</span>
        </div>
      </div>
    </div>
  );
}
