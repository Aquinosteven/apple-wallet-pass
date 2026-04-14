import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { getAdminOverview, type AdminOverviewResponse } from '../../utils/backendApi';
import { formatAdminDate, formatAdminStatus, statusTone } from './adminUi';

const kpiLabels: Array<{ key: keyof AdminOverviewResponse['kpis']; label: string }> = [
  { key: 'paidAccounts', label: 'Paid customers' },
  { key: 'healthyPaidAccounts', label: 'Healthy paid' },
  { key: 'watchPaidAccounts', label: 'Watch list' },
  { key: 'atRiskPaidAccounts', label: 'At risk' },
  { key: 'openSupportTickets', label: 'Open tickets' },
  { key: 'pastDueAccounts', label: 'Past due' },
  { key: 'recentSignups', label: 'Recent signups' },
];

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getAdminOverview()
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Failed to load admin overview');
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-100">{error}</div>;
  }

  if (!data) {
    return <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading admin overview</div>;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiLabels.map(({ key, label }) => (
          <div key={key} className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="text-sm text-slate-400">{label}</div>
            <div className="mt-3 text-3xl font-semibold text-white">{data.kpis[key]}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 xl:col-span-1">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-4 w-4 text-rose-300" />
            <h2 className="text-base font-semibold">At-risk paid customers</h2>
          </div>
          <div className="mt-4 space-y-3">
            {data.needsAttention.atRiskPaidAccounts.length ? data.needsAttention.atRiskPaidAccounts.map((account) => (
              <div key={account.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-white">{account.name}</div>
                    <div className="text-xs text-slate-400">{account.owner_email || account.owner_user_id}</div>
                    <div className="mt-2 text-xs text-slate-500">{account.health.summary}</div>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[11px] ${statusTone(account.health.status)}`}>
                    {formatAdminStatus(account.health.status)}
                  </span>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Next action: {account.health.next_action}
                </div>
              </div>
            )) : <div className="text-sm text-slate-500">No at-risk paid customers right now.</div>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 xl:col-span-1">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-4 w-4 text-emerald-300" />
            <h2 className="text-base font-semibold">Failed jobs</h2>
          </div>
          <div className="mt-4 space-y-3">
            {data.needsAttention.failedJobs.length ? data.needsAttention.failedJobs.map((job) => (
              <div key={job.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-white">{job.job_type}</div>
                    <div className="text-xs text-slate-400">{job.error_message || 'Retry required'}</div>
                  </div>
                  <div className="text-xs text-slate-500">{formatAdminDate(job.created_at)}</div>
                </div>
              </div>
            )) : <div className="text-sm text-slate-500">No failed jobs right now.</div>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 xl:col-span-1">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <h2 className="text-base font-semibold">Past due accounts</h2>
          </div>
          <div className="mt-4 space-y-3">
            {data.needsAttention.pastDueAccounts.length ? data.needsAttention.pastDueAccounts.map((account) => (
              <div key={account.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-white">{account.name}</div>
                    <div className="mt-1 text-xs text-slate-400">{account.owner_email || account.owner_user_id}</div>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[11px] ${statusTone(account.billing_state)}`}>
                    {formatAdminStatus(account.billing_state)}
                  </span>
                </div>
              </div>
            )) : <div className="text-sm text-slate-500">No past-due accounts in the queue.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
