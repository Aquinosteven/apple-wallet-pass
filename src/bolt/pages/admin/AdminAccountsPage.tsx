import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { listAdminAccounts, type CustomerAccountRow } from '../../utils/backendApi';
import { formatAdminDate, formatAdminStatus, formatPlanName, statusTone } from './adminUi';

export default function AdminAccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<CustomerAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get('q') || '';
  const status = searchParams.get('status') || 'paid';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const billingStatus = status === 'all' || status === 'paid' ? undefined : status;
    void listAdminAccounts({
      q: query,
      status: billingStatus,
      realOnly: true,
      paidOnly: status === 'paid',
    })
      .then((rows) => {
        if (active) setAccounts(rows);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Failed to load accounts');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, status]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Paid customer health</h1>
          <p className="mt-1 text-sm text-slate-400">Review onboarding, support blockers, and recent activity for real customers only.</p>
        </div>
        <select
          value={status}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams);
            next.set('status', event.target.value);
            setSearchParams(next);
          }}
          className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
        >
          <option value="paid">Paid customers</option>
          <option value="all">All real accounts</option>
          <option value="trial">Trial</option>
          <option value="past_due">Past due</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {error ? <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
      {loading ? <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading accounts</div> : null}

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/60">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Health</th>
              <th className="px-4 py-3">Onboarding</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Support</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {accounts.map((account) => (
              <tr key={account.id} className="hover:bg-slate-900/50">
                <td className="px-4 py-4">
                  <Link to={`/admin/accounts/${account.id}`} className="font-medium text-white hover:text-emerald-300">
                    {account.name}
                  </Link>
                  <div className="mt-1 text-xs text-slate-500">{account.slug}</div>
                </td>
                <td className="px-4 py-4">
                  <span className={`rounded-full border px-2 py-1 text-[11px] ${statusTone(account.health.status)}`}>
                    {formatAdminStatus(account.health.status)}
                  </span>
                  <div className="mt-2 text-xs text-slate-400">{account.health.summary}</div>
                  <div className="mt-2 text-xs text-slate-500">{account.owner_email || 'No email on file'}</div>
                </td>
                <td className="px-4 py-4 text-slate-300">
                  <div>{account.onboarding.integration_connected ? 'Integration connected' : 'No integration'}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {account.onboarding.event_count} events, {account.onboarding.published_event_count} published
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Last sign-in: {formatAdminDate(account.onboarding.last_sign_in_at)}
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-300">
                  <div>{account.usage.passes_total} passes total</div>
                  <div className="mt-1 text-xs text-slate-500">{account.usage.passes_last_30_days} passes in last 30d</div>
                  <div className="mt-1 text-xs text-slate-500">{account.usage.issuance_requests_completed} successful issuances</div>
                </td>
                <td className="px-4 py-4 text-slate-300">
                  <div>{account.support.open_tickets} open tickets</div>
                  <div className="mt-1 text-xs text-slate-500">{account.support.last_ticket_subject || 'No recent ticket'}</div>
                  <div className="mt-1 text-xs text-slate-500">Last touch: {formatAdminDate(account.customer_touch.last_touched_at)}</div>
                </td>
                <td className="px-4 py-4 text-slate-400">
                  <div>{formatAdminDate(account.updated_at)}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatPlanName(account.subscription.plan_code)}</div>
                </td>
              </tr>
            ))}
            {!loading && !accounts.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No accounts matched this filter.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
