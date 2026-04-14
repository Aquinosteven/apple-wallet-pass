import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, ExternalLink, Search, Send, Upload, UserPlus, Code } from 'lucide-react';
import { checkInRegistrant, createRegistrant, listRegistrants, type ApiRegistrant } from '../../../../utils/backendApi';

const csvTemplateHref = `data:text/csv;charset=utf-8,${encodeURIComponent('name,email,phone\nJohn Smith,john@example.com,555-555-0101\nJane Doe,jane@example.com,\n')}`;

const statusConfig = {
  issued: { label: 'Issued', color: 'text-gray-500', bg: 'bg-gray-100' },
  added: { label: 'Added', color: 'text-gblue', bg: 'bg-gblue/10' },
  checked_in: { label: 'Checked In', color: 'text-ggreen', bg: 'bg-ggreen/10' },
  expired: { label: 'Expired', color: 'text-gray-400', bg: 'bg-gray-100' },
};

interface CsvRow {
  name: string;
  email: string;
  phone?: string;
}

interface IssuedTicketsTabProps {
  eventId: string;
  onDataChanged?: () => void;
}

function parseCsv(text: string): { rows: CsvRow[]; error: string | null } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { rows: [], error: 'CSV file is empty.' };
  }

  const headers = lines[0].split(',').map((value) => value.trim().toLowerCase());
  const nameIndex = headers.indexOf('name');
  const emailIndex = headers.indexOf('email');
  const phoneIndex = headers.indexOf('phone');

  if (nameIndex === -1 || emailIndex === -1) {
    return { rows: [], error: 'CSV must include name and email columns.' };
  }

  const rows: CsvRow[] = [];
  for (const line of lines.slice(1)) {
    const parts = line.split(',').map((value) => value.trim());
    const name = parts[nameIndex] || '';
    const email = parts[emailIndex] || '';
    const phone = phoneIndex === -1 ? '' : (parts[phoneIndex] || '');
    if (!name || !email) {
      return { rows: [], error: 'Each CSV row must include both name and email.' };
    }
    rows.push({ name, email, phone: phone || undefined });
  }

  return { rows, error: null };
}

export default function IssuedTicketsTab({ eventId, onDataChanged }: IssuedTicketsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [registrants, setRegistrants] = useState<ApiRegistrant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueMethod, setIssueMethod] = useState<'api' | 'csv' | 'manual' | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [checkInPassId, setCheckInPassId] = useState<string | null>(null);

  const loadRegistrants = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const loadedRegistrants = await listRegistrants(eventId);
      setRegistrants(loadedRegistrants);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load issued tickets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRegistrants();
  }, [eventId]);

  const filteredTickets = useMemo(() => (
    registrants.filter((ticket) =>
      ticket.attendeeName.toLowerCase().includes(searchQuery.toLowerCase())
      || ticket.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ), [registrants, searchQuery]);

  const apiEndpoint = `${window.location.origin}/api/registrants`;
  const claimBaseUrl = `${window.location.origin}/claim`;

  const resetModal = () => {
    setShowIssueModal(false);
    setIssueMethod(null);
    setManualName('');
    setManualEmail('');
    setManualPhone('');
    setSubmitError(null);
    setSubmitSuccess(null);
    setCsvRows([]);
    setCsvFileName('');
    setCsvError(null);
    setIsSubmitting(false);
  };

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setSubmitSuccess('Copied to clipboard.');
  };

  const handleManualIssue = async () => {
    setSubmitError(null);
    setSubmitSuccess(null);
    if (!manualName.trim() || !manualEmail.trim()) {
      setSubmitError('Name and email are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createRegistrant({
        eventId,
        name: manualName.trim(),
        email: manualEmail.trim(),
        phone: manualPhone.trim() || undefined,
        source: 'manual_dashboard',
      });
      setSubmitSuccess('Ticket issued successfully.');
      setManualName('');
      setManualEmail('');
      setManualPhone('');
      await loadRegistrants();
      onDataChanged?.();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to issue ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCsvSelected = async (file: File | null) => {
    setCsvRows([]);
    setCsvFileName('');
    setCsvError(null);
    setSubmitSuccess(null);
    if (!file) return;

    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.error) {
      setCsvError(parsed.error);
      return;
    }

    setCsvRows(parsed.rows);
    setCsvFileName(file.name);
  };

  const handleCsvImport = async () => {
    if (!csvRows.length) {
      setCsvError('Upload a CSV file first.');
      return;
    }

    try {
      setIsSubmitting(true);
      setCsvError(null);
      setSubmitSuccess(null);
      for (const row of csvRows) {
        await createRegistrant({
          eventId,
          name: row.name,
          email: row.email,
          phone: row.phone,
          source: 'csv_dashboard',
        });
      }
      setSubmitSuccess(`Imported ${csvRows.length} attendee${csvRows.length === 1 ? '' : 's'}.`);
      setCsvRows([]);
      setCsvFileName('');
      await loadRegistrants();
      onDataChanged?.();
    } catch (error) {
      setCsvError(error instanceof Error ? error.message : 'CSV import failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckIn = async (ticket: ApiRegistrant) => {
    if (!ticket.passId) {
      setSubmitError('This pass does not have a check-in token yet.');
      return;
    }

    try {
      setCheckInPassId(ticket.passId);
      setSubmitError(null);
      setSubmitSuccess(null);
      await checkInRegistrant(ticket.passId);
      await loadRegistrants();
      onDataChanged?.();
      setSubmitSuccess(`${ticket.attendeeName} checked in successfully.`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to check in attendee.');
    } finally {
      setCheckInPassId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search attendees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
          />
        </div>
        <button
          onClick={() => setShowIssueModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark transition-colors"
        >
          <Send className="w-4 h-4" />
          Issue Tickets
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">Loading issued tickets...</p>
          </div>
        ) : loadError ? (
          <div className="text-center py-12 px-6">
            <p className="text-sm font-medium text-gray-900">Issued tickets could not be loaded.</p>
            <p className="mt-1 text-sm text-gray-500">{loadError}</p>
            <button
              onClick={() => void loadRegistrants()}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Attendee</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Issued</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => {
                  const status = statusConfig[ticket.status];
                  const claimHref = ticket.claimToken ? `${claimBaseUrl}/${ticket.claimToken}` : null;
                  const canCheckIn = Boolean(ticket.passId) && ticket.status !== 'checked_in' && ticket.status !== 'expired';
                  return (
                    <tr key={ticket.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{ticket.attendeeName}</span>
                          {ticket.phone && <p className="text-xs text-gray-400 mt-0.5">{ticket.phone}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">{ticket.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400">{ticket.issuedAtLabel}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {canCheckIn ? (
                            <button
                              onClick={() => void handleCheckIn(ticket)}
                              disabled={checkInPassId === ticket.passId}
                              className="text-sm font-medium text-ggreen hover:underline disabled:opacity-50 disabled:no-underline"
                            >
                              {checkInPassId === ticket.passId ? 'Checking in...' : 'Check in'}
                            </button>
                          ) : null}
                          {claimHref ? (
                            <a
                              href={claimHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-gblue hover:underline"
                            >
                              View claim
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">No claim link</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !loadError && filteredTickets.length === 0 && (
          <div className="text-center py-12 px-6">
            <p className="text-sm font-medium text-gray-900">No tickets issued yet.</p>
            <p className="mt-1 text-sm text-gray-500">
              Issue tickets by API, CSV upload, or manual entry when you are ready to invite attendees.
            </p>
          </div>
        )}
      </div>

      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={resetModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Issue Tickets</h2>
              <p className="text-sm text-gray-500 mt-1">Choose how you want to create attendee passes for this event.</p>
            </div>

            {!issueMethod ? (
              <div className="p-5 space-y-3">
                <button
                  onClick={() => setIssueMethod('api')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gblue/30 hover:bg-gblue/5 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-gblue/10 flex items-center justify-center">
                    <Code className="w-5 h-5 text-gblue" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">API</p>
                    <p className="text-xs text-gray-500">Use your authenticated backend or session token to create registrants.</p>
                  </div>
                </button>
                <button
                  onClick={() => setIssueMethod('csv')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gblue/30 hover:bg-gblue/5 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-ggreen/10 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-ggreen" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Upload CSV</p>
                    <p className="text-xs text-gray-500">Bulk import attendees with name and email columns.</p>
                  </div>
                </button>
                <button
                  onClick={() => setIssueMethod('manual')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gblue/30 hover:bg-gblue/5 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-gyellow/10 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-gyellow-dark" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Manual Entry</p>
                    <p className="text-xs text-gray-500">Add one attendee now and issue a pass immediately.</p>
                  </div>
                </button>
              </div>
            ) : issueMethod === 'api' ? (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Endpoint</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 text-xs bg-gray-100 rounded-lg text-gray-700 overflow-x-auto">
                      POST {apiEndpoint}
                    </code>
                    <button
                      onClick={() => void handleCopy(apiEndpoint)}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gblue bg-gblue/10 rounded-lg hover:bg-gblue/20 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">Request body</p>
                  <pre className="text-xs text-gray-600 overflow-x-auto">{JSON.stringify({
                    eventId,
                    name: 'Jane Doe',
                    email: 'jane@example.com',
                    phone: '555-555-0101',
                    source: 'api',
                  }, null, 2)}</pre>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <p className="text-xs font-medium text-amber-800">Authentication</p>
                  <p className="mt-1 text-xs text-amber-700">
                    This endpoint expects the signed-in user&apos;s Bearer token in the <code>Authorization</code> header.
                    There is no standalone API key flow in the current product.
                  </p>
                </div>
              </div>
            ) : issueMethod === 'csv' ? (
              <div className="p-5 space-y-4">
                <label className="w-full min-h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition-colors p-4 text-center">
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Drop CSV file or click to upload</span>
                  <span className="text-xs text-gray-400 mt-1">Required columns: name, email. Optional: phone.</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv,text/csv"
                    onChange={(e) => void handleCsvSelected(e.target.files?.[0] || null)}
                  />
                </label>
                <a href={csvTemplateHref} download="showfi-ticket-import-template.csv" className="inline-block text-xs text-gblue hover:underline">Download template CSV</a>
                {csvFileName && (
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-900">{csvFileName}</p>
                    <p className="text-xs text-gray-500 mt-1">{csvRows.length} attendee{csvRows.length === 1 ? '' : 's'} ready to import.</p>
                  </div>
                )}
                {csvError && (
                  <div className="rounded-lg bg-gred/5 border border-gred/20 p-3 text-sm text-gred flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    <span>{csvError}</span>
                  </div>
                )}
                <button
                  onClick={() => void handleCsvImport()}
                  disabled={!csvRows.length || isSubmitting}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Importing...' : `Import ${csvRows.length || ''} Ticket${csvRows.length === 1 ? '' : 's'}`.trim()}
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Attendee Name</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone (optional)</label>
                  <input
                    type="tel"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="555-555-0101"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gblue/20 focus:border-gblue"
                  />
                </div>
                {submitError && (
                  <div className="rounded-lg bg-gred/5 border border-gred/20 p-3 text-sm text-gred flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}
                <button
                  onClick={() => void handleManualIssue()}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gblue rounded-lg hover:bg-gblue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Issuing...' : 'Issue Ticket'}
                </button>
              </div>
            )}

            {submitSuccess && (
              <div className="px-5 pb-2">
                <div className="rounded-lg bg-ggreen/5 border border-ggreen/20 p-3 text-sm text-ggreen flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5" />
                  <span>{submitSuccess}</span>
                </div>
              </div>
            )}

            <div className="p-4 border-t border-gray-100 flex justify-between">
              {issueMethod && (
                <button
                  onClick={() => {
                    setIssueMethod(null);
                    setSubmitError(null);
                    setSubmitSuccess(null);
                    setCsvError(null);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={resetModal}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
