import { useEffect, useState } from 'react';
import { createSupportTicket, listSupportTickets, type SupportTicketRow } from '../../utils/backendApi';

const defaultForm = {
  requesterName: '',
  requesterEmail: '',
  subject: '',
  message: '',
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setTickets(await listSupportTickets());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await createSupportTicket(form);
      setForm(defaultForm);
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit support ticket');
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support</h1>
        <p className="mt-1 text-sm text-gray-500">Tickets are persisted in DB and routed to hello@showfi.io through the mail provider abstraction.</p>
      </div>

      <form className="bg-white rounded-xl border border-gray-100 p-4 space-y-3" onSubmit={submit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            placeholder="Requester name"
            value={form.requesterName}
            onChange={(e) => setForm((prev) => ({ ...prev, requesterName: e.target.value }))}
          />
          <input
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            placeholder="Requester email"
            value={form.requesterEmail}
            onChange={(e) => setForm((prev) => ({ ...prev, requesterEmail: e.target.value }))}
          />
        </div>
        <input
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
          placeholder="Subject"
          value={form.subject}
          onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
        />
        <textarea
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm h-32"
          placeholder="What happened?"
          value={form.message}
          onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
        />
        <button type="submit" className="px-4 py-2 rounded-lg bg-gblue text-white text-sm">
          Submit Ticket
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Tickets</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Created</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Requester</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Subject</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-t border-gray-50">
                <td className="px-4 py-2">{new Date(ticket.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">{ticket.requester_name}<div className="text-xs text-gray-500">{ticket.requester_email}</div></td>
                <td className="px-4 py-2">{ticket.subject}</td>
                <td className="px-4 py-2">{ticket.status}</td>
              </tr>
            ))}
            {!tickets.length && !loading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No tickets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading && <div className="text-sm text-gray-500">Loading…</div>}
    </div>
  );
}

