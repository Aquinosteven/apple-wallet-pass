import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getAdminOperations, retryAdminJobFromCenter, type AdminJob, type AuditLogRow, type SupportTicketRow } from '../../utils/backendApi';
import { formatAdminDate, formatAdminStatus, statusTone } from './adminUi';

export default function AdminOperationsPage() {
  const [failedJobs, setFailedJobs] = useState<AdminJob[]>([]);
  const [recentAudit, setRecentAudit] = useState<AuditLogRow[]>([]);
  const [recentFailures, setRecentFailures] = useState<AuditLogRow[]>([]);
  const [openSupportTickets, setOpenSupportTickets] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getAdminOperations();
      setFailedJobs(payload.failedJobs);
      setRecentAudit(payload.recentAudit);
      setRecentFailures(payload.recentFailures);
      setOpenSupportTickets(payload.openSupportTickets);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load operations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const retryJob = async (job: AdminJob) => {
    const reason = window.prompt(`Reason for retrying ${job.job_type}?`);
    if (!reason) return;
    try {
      await retryAdminJobFromCenter(job.id, reason);
      await load();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Failed to retry job');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Operations</h1>
        <p className="mt-1 text-sm text-slate-400">Failed jobs, recent failures, retry controls, and active support pressure.</p>
      </div>
      {error ? <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
      {loading ? <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading operations</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
          <h2 className="text-base font-semibold text-white">Failed jobs</h2>
          <div className="mt-4 space-y-3">
            {failedJobs.map((job) => (
              <div key={job.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-white">{job.job_type}</div>
                    <div className="mt-1 text-xs text-slate-500">{job.error_message || 'Retry available'}</div>
                  </div>
                  <button type="button" onClick={() => retryJob(job)} className="rounded-2xl border border-slate-700 px-3 py-2 text-xs text-white">Retry</button>
                </div>
                <div className="mt-3 text-xs text-slate-500">{formatAdminDate(job.created_at)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
          <h2 className="text-base font-semibold text-white">Open support tickets</h2>
          <div className="mt-4 space-y-3">
            {openSupportTickets.map((ticket) => (
              <div key={ticket.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-white">{ticket.subject}</div>
                    <div className="mt-1 text-xs text-slate-500">{ticket.requester_email}</div>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[11px] ${statusTone(ticket.status)}`}>{formatAdminStatus(ticket.status)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
          <h2 className="text-base font-semibold text-white">Recent failures</h2>
          <div className="mt-4 space-y-3">
            {recentFailures.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="font-medium text-white">{entry.action}</div>
                <div className="mt-1 text-xs text-slate-500">{formatAdminDate(entry.created_at)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
          <h2 className="text-base font-semibold text-white">Recent audit</h2>
          <div className="mt-4 space-y-3">
            {recentAudit.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="font-medium text-white">{entry.action}</div>
                <div className="mt-1 text-xs text-slate-500">{entry.target_type} · {formatAdminDate(entry.created_at)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
