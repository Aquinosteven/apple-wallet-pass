import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { listAdminBilling, type AdminBillingRow } from '../../utils/backendApi';
import { formatAdminDate, formatAdminStatus, formatPlanName, statusTone } from './adminUi';

export default function AdminBillingPage() {
  const [rows, setRows] = useState<AdminBillingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listAdminBilling()
      .then((payload) => {
        if (active) setRows(payload);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Failed to load billing');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Billing</h1>
        <p className="mt-1 text-sm text-slate-400">Manual billing oversight with account state and provider state side by side.</p>
      </div>
      {error ? <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
      {loading ? <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading billing</div> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {rows.map((row) => (
          <div key={row.account_id} className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-white">{row.account_name}</div>
                <div className="mt-1 text-xs text-slate-500">{row.owner_email || row.owner_user_id}</div>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[11px] ${statusTone(row.billing_state)}`}>
                {formatAdminStatus(row.billing_state)}
              </span>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-slate-300">
              <div>Plan: <span className="text-white">{formatPlanName(row.plan_code)}</span></div>
              <div>Provider: <span className="text-white">{row.provider || 'No provider'}</span></div>
              <div>Provider status: <span className="text-white">{formatAdminStatus(row.status)}</span></div>
              <div>Period end: <span className="text-white">{formatAdminDate(row.current_period_end)}</span></div>
              <div>Enforcement: <span className="text-white">{row.enforcement_enabled ? 'On' : 'Off'}</span></div>
              <div>Hard block: <span className="text-white">{row.hard_block_issuance ? 'Enabled' : 'Disabled'}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
