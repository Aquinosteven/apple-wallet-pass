import { useEffect, useState } from 'react';
import {
  getAdminPanel,
  retryAdminJob,
  updatePlanHooks,
  updatePromoCounter,
  type AdminPanelResponse,
} from '../../utils/backendApi';

export default function AdminPanelPage() {
  const [data, setData] = useState<AdminPanelResponse | null>(null);
  const [promoClaimed, setPromoClaimed] = useState('17');
  const [planHooksJson, setPlanHooksJson] = useState('{}');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getAdminPanel();
      setData(payload);
      setPromoClaimed(String(payload.promoCounter.claimed));
      setPlanHooksJson(JSON.stringify(payload.planHooks, null, 2));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load admin panel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

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

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin + Support Tools</h1>
        <p className="text-sm text-gray-500 mt-1">Promo overrides, plan limits, retries, and audit logs.</p>
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
                  <button type="button" className="px-3 py-1.5 rounded border border-gray-200" onClick={() => retryJob(job.id)}>
                    Retry
                  </button>
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

