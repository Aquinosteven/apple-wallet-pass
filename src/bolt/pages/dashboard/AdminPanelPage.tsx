import { useCallback, useEffect, useState } from 'react';
import {
  getAdminPanel,
  retryAdminJob,
  updateCustomerAccountService,
  updatePlanHooks,
  updatePromoCounter,
  type AdminPanelResponse,
  type CustomerAccountRow,
} from '../../utils/backendApi';

type AccountDrafts = Record<string, {
  billingState: CustomerAccountRow['billing_state'];
  monthlyIncludedIssuances: string;
  enforcementEnabled: boolean;
  hardBlockIssuance: boolean;
}>;

function formatPlanLabel(value: string | null | undefined) {
  if (!value) return 'No plan';
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatStatusLabel(value: string | null | undefined) {
  if (!value) return 'Unknown';
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AdminPanelPage() {
  const [data, setData] = useState<AdminPanelResponse | null>(null);
  const [promoClaimed, setPromoClaimed] = useState('17');
  const [planHooksJson, setPlanHooksJson] = useState('{}');
  const [accountDrafts, setAccountDrafts] = useState<AccountDrafts>({});
  const [accountFilter, setAccountFilter] = useState<'paid' | 'all'>('paid');
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const syncAccountDrafts = useCallback((accounts: CustomerAccountRow[]) => {
    setAccountDrafts((prev) => {
      const next: AccountDrafts = {};
      accounts.forEach((account) => {
        next[account.id] = prev[account.id] || {
          billingState: account.billing_state,
          monthlyIncludedIssuances: String(account.monthly_included_issuances ?? 0),
          enforcementEnabled: account.enforcement_enabled,
          hardBlockIssuance: account.hard_block_issuance,
        };
      });
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getAdminPanel();
      setData(payload);
      setPromoClaimed(String(payload.promoCounter.claimed));
      setPlanHooksJson(JSON.stringify(payload.planHooks, null, 2));
      syncAccountDrafts(payload.customerAccounts || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load admin panel');
    } finally {
      setLoading(false);
    }
  }, [syncAccountDrafts]);

  useEffect(() => {
    void load();
  }, [load]);

  const savePromoOverride = async () => {
    setError(null);
    try {
      await updatePromoCounter({ claimed: Number(promoClaimed) });
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update promo counter');
    }
  };

  const savePlanHooks = async () => {
    setError(null);
    try {
      await updatePlanHooks(JSON.parse(planHooksJson) as Record<string, unknown>);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update plan hooks');
    }
  };

  const retryJob = async (jobId: string) => {
    setError(null);
    try {
      await retryAdminJob(jobId);
      await load();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Failed to retry job');
    }
  };

  const updateAccountDraft = (accountId: string, patch: Partial<AccountDrafts[string]>) => {
    setAccountDrafts((prev) => ({
      ...prev,
      [accountId]: {
        ...(prev[accountId] || {
          billingState: 'trial',
          monthlyIncludedIssuances: '0',
          enforcementEnabled: true,
          hardBlockIssuance: false,
        }),
        ...patch,
      },
    }));
  };

  const saveAccountService = async (account: CustomerAccountRow) => {
    const draft = accountDrafts[account.id];
    if (!draft) return;

    setError(null);
    setSavingAccountId(account.id);
    try {
      await updateCustomerAccountService({
        accountId: account.id,
        billingState: draft.billingState,
        monthlyIncludedIssuances: Number(draft.monthlyIncludedIssuances),
        enforcementEnabled: draft.enforcementEnabled,
        hardBlockIssuance: draft.hardBlockIssuance,
      });
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update account service');
    } finally {
      setSavingAccountId(null);
    }
  };

  const isInternalSupport = data?.role === 'support_internal';
  const visibleAccounts = (data?.customerAccounts || []).filter((account) => accountFilter === 'all' || account.is_paid);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin + Support Tools</h1>
        <p className="text-sm text-gray-500 mt-1">Promo overrides, plan limits, retries, and audit logs.</p>
      </div>

      {!loading && !isInternalSupport && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-amber-900">Internal-only tools</h2>
          <p className="mt-1 text-sm text-amber-800">
            You can review audit and job history here, but override and replay actions are limited to the internal support role.
          </p>
        </div>
      )}

      {isInternalSupport && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Customer Accounts</h2>
                <p className="mt-1 text-xs text-gray-500">See who is paid and manage service access, usage limits, and enforcement.</p>
              </div>
              <label className="text-sm text-gray-600">
                View
                <select
                  className="ml-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={accountFilter}
                  onChange={(event) => setAccountFilter(event.target.value as 'paid' | 'all')}
                >
                  <option value="paid">Paid accounts</option>
                  <option value="all">All accounts</option>
                </select>
              </label>
            </div>

            <div className="divide-y divide-gray-100">
              {visibleAccounts.map((account) => {
                const draft = accountDrafts[account.id] || {
                  billingState: account.billing_state,
                  monthlyIncludedIssuances: String(account.monthly_included_issuances ?? 0),
                  enforcementEnabled: account.enforcement_enabled,
                  hardBlockIssuance: account.hard_block_issuance,
                };

                return (
                  <div key={account.id} className="p-4 space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">{account.name}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${account.is_paid ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            {account.is_paid ? 'Paid' : 'Not paid'}
                          </span>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                            {formatStatusLabel(account.subscription.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {account.slug} · {formatPlanLabel(account.subscription.plan_code)} · Owner {account.owner_user_id}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Usage this month: {account.usage.issuances_count} issued, {account.usage.overage_count} over, {account.usage.blocked_count} blocked
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {account.subscription.current_period_end
                          ? `Current period ends ${new Date(account.subscription.current_period_end).toLocaleDateString()}`
                          : 'No billing period on file'}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="text-sm text-gray-600">
                        Billing state
                        <select
                          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          value={draft.billingState}
                          onChange={(event) => updateAccountDraft(account.id, {
                            billingState: event.target.value as CustomerAccountRow['billing_state'],
                          })}
                        >
                          <option value="trial">Trial</option>
                          <option value="active">Active</option>
                          <option value="past_due">Past due</option>
                          <option value="canceled">Canceled</option>
                        </select>
                      </label>

                      <label className="text-sm text-gray-600">
                        Monthly included issuances
                        <input
                          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          inputMode="numeric"
                          value={draft.monthlyIncludedIssuances}
                          onChange={(event) => updateAccountDraft(account.id, {
                            monthlyIncludedIssuances: event.target.value,
                          })}
                        />
                      </label>

                      <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={draft.enforcementEnabled}
                          onChange={(event) => updateAccountDraft(account.id, {
                            enforcementEnabled: event.target.checked,
                          })}
                        />
                        Enforcement enabled
                      </label>

                      <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={draft.hardBlockIssuance}
                          onChange={(event) => updateAccountDraft(account.id, {
                            hardBlockIssuance: event.target.checked,
                          })}
                        />
                        Hard block over limit
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-gray-500">
                        Provider customer: {account.subscription.provider_customer_id || 'Not available'}
                      </div>
                      <button
                        type="button"
                        className="rounded-lg bg-gblue px-4 py-2 text-sm text-white"
                        onClick={() => saveAccountService(account)}
                        disabled={savingAccountId === account.id}
                      >
                        {savingAccountId === account.id ? 'Saving…' : 'Save Service'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {!visibleAccounts.length && !loading && (
                <div className="px-4 py-8 text-center text-gray-500">
                  No customer accounts match this filter.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Promo Counter Override</h2>
            <p className="text-xs text-gray-500 mb-3">First-100 logic baseline starts at 17 claimed.</p>
            <div className="flex gap-3 items-end">
              <label className="text-sm text-gray-600">
                Claimed
                <input
                  className="block mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  value={promoClaimed}
                  onChange={(event) => setPromoClaimed(event.target.value)}
                />
              </label>
              <button type="button" className="px-4 py-2 rounded-lg bg-gblue text-white text-sm" onClick={savePromoOverride}>
                Save Override
              </button>
              <div className="text-xs text-gray-500">
                Remaining: {data?.promoCounter.remaining ?? 0}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Plan/Limit Config Hooks</h2>
            <textarea
              className="w-full h-40 rounded-lg border border-gray-200 p-3 text-xs font-mono"
              value={planHooksJson}
              onChange={(event) => setPlanHooksJson(event.target.value)}
            />
            <button type="button" className="mt-3 px-4 py-2 rounded-lg border border-gray-200 text-sm" onClick={savePlanHooks}>
              Save Plan Hooks
            </button>
          </div>
        </>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Failed Jobs (Replay/Retry)</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Job</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Error</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Attempts</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {(data?.failedJobs || []).map((job) => (
              <tr key={job.id} className="border-t border-gray-50">
                <td className="px-4 py-2">{job.job_type}</td>
                <td className="px-4 py-2 text-xs">{job.error_message || 'Unknown error'}</td>
                <td className="px-4 py-2">{job.attempt_count}</td>
                <td className="px-4 py-2">
                  {isInternalSupport ? (
                    <button type="button" className="px-3 py-1.5 rounded border border-gray-200" onClick={() => retryJob(job.id)}>
                      Retry
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Internal only</span>
                  )}
                </td>
              </tr>
            ))}
            {!data?.failedJobs?.length && !loading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No failed jobs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Audit Logs</h2>
          <span className="text-xs text-gray-500">Retention: 1 year</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Time</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Action</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {(data?.auditLogs || []).slice(0, 20).map((row) => (
              <tr key={row.id} className="border-t border-gray-50">
                <td className="px-4 py-2">{new Date(row.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">{row.action}</td>
                <td className="px-4 py-2">{row.target_type}</td>
              </tr>
            ))}
            {!data?.auditLogs?.length && !loading && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  No audit logs.
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
