import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { listAdminAudit, type AuditLogRow } from '../../utils/backendApi';
import { formatAdminDate } from './adminUi';

export default function AdminAuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void listAdminAudit({ action: actionFilter || undefined, limit: 200 })
      .then((payload) => {
        if (active) setAuditLogs(payload);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Failed to load audit');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [actionFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Audit</h1>
          <p className="mt-1 text-sm text-slate-400">Structured internal activity logs for admin-originated actions and operational events.</p>
        </div>
        <input
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          placeholder="Filter by action"
          className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500"
        />
      </div>
      {error ? <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
      {loading ? <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading audit logs</div> : null}

      <div className="space-y-3">
        {auditLogs.map((entry) => (
          <div key={entry.id} className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-medium text-white">{entry.action}</div>
                <div className="mt-1 text-sm text-slate-400">{entry.target_type} {entry.target_id || ''}</div>
              </div>
              <div className="text-xs text-slate-500">{formatAdminDate(entry.created_at)}</div>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300">
              {JSON.stringify(entry.metadata || {}, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
