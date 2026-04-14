import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { listAdminSupport, updateAdminSupportTicket, type AdminNoteRow, type SupportTicketRow } from '../../utils/backendApi';
import { formatAdminDate, formatAdminStatus, statusTone } from './adminUi';

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [notes, setNotes] = useState<AdminNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await listAdminSupport();
      setTickets(payload.tickets);
      setNotes(payload.notes);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load support queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const notesByOwner = useMemo(() => {
    const map = new Map<string, AdminNoteRow[]>();
    notes.forEach((note) => {
      const current = map.get(note.target_id) || [];
      current.push(note);
      map.set(note.target_id, current);
    });
    return map;
  }, [notes]);

  const updateStatus = async (ticket: SupportTicketRow, status: string) => {
    const reason = window.prompt(`Reason for moving ticket to ${status}?`);
    if (!reason) return;
    try {
      await updateAdminSupportTicket(ticket.id, { status, reason });
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update ticket');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Support</h1>
        <p className="mt-1 text-sm text-slate-400">Cross-account support inbox with internal-only note context.</p>
      </div>
      {error ? <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
      {loading ? <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading support queue</div> : null}

      <div className="space-y-4">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-medium text-white">{ticket.subject}</div>
                <div className="mt-1 text-sm text-slate-400">{ticket.requester_name} · {ticket.requester_email}</div>
                <div className="mt-1 text-xs text-slate-500">{ticket.owner_user_id}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-1 text-[11px] ${statusTone(ticket.status)}`}>
                  {formatAdminStatus(ticket.status)}
                </span>
                <button type="button" onClick={() => updateStatus(ticket, 'triaged')} className="rounded-2xl border border-slate-700 px-3 py-2 text-xs text-white">Triaged</button>
                <button type="button" onClick={() => updateStatus(ticket, 'waiting')} className="rounded-2xl border border-slate-700 px-3 py-2 text-xs text-white">Waiting</button>
                <button type="button" onClick={() => updateStatus(ticket, 'resolved')} className="rounded-2xl border border-slate-700 px-3 py-2 text-xs text-white">Resolved</button>
              </div>
            </div>
            <div className="mt-4 text-sm leading-6 text-slate-300">{ticket.message}</div>
            <div className="mt-3 text-xs text-slate-500">{formatAdminDate(ticket.created_at)}</div>
            {notesByOwner.get(ticket.owner_user_id)?.length ? (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Account notes</div>
                <div className="mt-3 space-y-2">
                  {notesByOwner.get(ticket.owner_user_id)?.slice(0, 3).map((note) => (
                    <div key={note.id} className="text-sm text-slate-300">{note.body}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
