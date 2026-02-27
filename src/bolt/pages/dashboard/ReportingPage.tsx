import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createDataExport,
  downloadDataExport,
  getDashboardMetrics,
  listDataExports,
  type DashboardMetrics,
  type DataExportHistoryItem,
} from '../../utils/backendApi';

function defaultDateWindow() {
  const end = new Date();
  const start = new Date(Date.now() - (6 * 24 * 60 * 60 * 1000));
  const toInput = (value: Date) => value.toISOString().slice(0, 10);
  return { start: toInput(start), end: toInput(end) };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportingPage() {
  const [window, setWindow] = useState(defaultDateWindow());
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [history, setHistory] = useState<DataExportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [exportScope, setExportScope] = useState<'filtered' | 'full'>('filtered');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsPayload, historyPayload] = await Promise.all([
        getDashboardMetrics({ start: window.start, end: window.end }),
        listDataExports(),
      ]);
      setMetrics(metricsPayload);
      setHistory(historyPayload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load reporting data');
    } finally {
      setLoading(false);
    }
  }, [window.end, window.start]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => metrics?.totals || { passesIssued: 0, walletAdds: 0, reminderSends: 0 }, [metrics]);

  const runExport = async () => {
    setError(null);
    try {
      await createDataExport({
        format: exportFormat,
        scope: exportScope,
        filters: { start: window.start, end: window.end },
      });
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create export');
    }
  };

  const redownload = async (item: DataExportHistoryItem) => {
    setError(null);
    try {
      const blob = await downloadDataExport(item.id);
      const extension = item.format === 'xlsx' ? 'xml' : item.format;
      downloadBlob(blob, `showfi-export-${item.id}.${extension}`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Failed to re-download export');
    }
  };

  const refreshMetrics = async () => {
    setError(null);
    try {
      const payload = await getDashboardMetrics({ start: window.start, end: window.end });
      setMetrics(payload);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Failed to refresh metrics');
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reporting</h1>
        <p className="mt-1 text-sm text-gray-500">v1 dashboard metrics with export history and 30-day re-download.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-gray-600">
          Start
          <input
            type="date"
            className="block mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
            value={window.start}
            onChange={(event) => setWindow((prev) => ({ ...prev, start: event.target.value }))}
          />
        </label>
        <label className="text-sm text-gray-600">
          End
          <input
            type="date"
            className="block mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
            value={window.end}
            onChange={(event) => setWindow((prev) => ({ ...prev, end: event.target.value }))}
          />
        </label>
        <button
          type="button"
          onClick={refreshMetrics}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-gblue text-white hover:bg-gblue-dark"
        >
          Refresh Metrics
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500">Passes Issued</div>
          <div className="text-2xl font-bold text-gray-900">{totals.passesIssued}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500">Wallet Adds</div>
          <div className="text-2xl font-bold text-gray-900">{totals.walletAdds}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-xs text-gray-500">Reminder Sends</div>
          <div className="text-2xl font-bold text-gray-900">{totals.reminderSends}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Export</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm text-gray-600">
            Format
            <select
              className="block mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
              value={exportFormat}
              onChange={(event) => setExportFormat(event.target.value as 'csv' | 'xlsx')}
            >
              <option value="csv">CSV</option>
              <option value="xlsx">Spreadsheet XML</option>
            </select>
          </label>
          <label className="text-sm text-gray-600">
            Scope
            <select
              className="block mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
              value={exportScope}
              onChange={(event) => setExportScope(event.target.value as 'filtered' | 'full')}
            >
              <option value="filtered">Filtered Dataset</option>
              <option value="full">Full Dataset</option>
            </select>
          </label>
          <button
            type="button"
            onClick={runExport}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Create Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Export History</h2>
          <span className="text-xs text-gray-500">Retention: 30 days</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Created</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Format</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Scope</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Rows</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Status</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id} className="border-t border-gray-50">
                <td className="px-4 py-2">{new Date(item.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 uppercase">{item.format === 'xlsx' ? 'XML' : item.format}</td>
                <td className="px-4 py-2">{item.scope}</td>
                <td className="px-4 py-2">{item.rowCount}</td>
                <td className="px-4 py-2">{item.status}</td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    disabled={item.status !== 'ready'}
                    className="px-3 py-1.5 rounded border border-gray-200 disabled:opacity-50"
                    onClick={() => redownload(item)}
                  >
                    Re-download
                  </button>
                </td>
              </tr>
            ))}
            {!history.length && !loading && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>
                  No exports yet.
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
