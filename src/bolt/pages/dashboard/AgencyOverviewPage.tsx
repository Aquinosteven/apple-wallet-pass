import { FormEvent, useEffect, useState } from 'react';
import { Building2, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  createWorkspace,
  getAccountContext,
  setActiveAccountId,
  type AccountContextResponse,
} from '../../utils/backendApi';

export default function AgencyOverviewPage() {
  const navigate = useNavigate();
  const [context, setContext] = useState<AccountContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const next = await getAccountContext();
      setContext(next);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load agency workspaces.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const next = await createWorkspace({ name: name.trim() });
      setContext(next);
      setName('');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create workspace.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading agency overview...</div>;
  }

  if (!context || context.organizationType !== 'agency') {
    return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Agency overview is only available for agency organizations.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-gblue/10 px-3 py-1 text-xs font-semibold text-gblue">
              <Building2 className="h-3.5 w-3.5" />
              Agency Organization
            </p>
            <h1 className="mt-3 text-2xl font-bold text-gray-900">{context.organizationName}</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage client workspaces, switch active CRM environments, and keep each client integration separated.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Plan</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{context.organizationPlanCode || 'agency'}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Client Workspaces</h2>
              <p className="mt-1 text-sm text-gray-500">
                {context.workspaces.length} workspace{context.workspaces.length === 1 ? '' : 's'} active
                {context.softWorkspaceLimit ? ` · soft cap ${context.softWorkspaceLimit}` : ''}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {context.workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                onClick={() => {
                  setActiveAccountId(workspace.id);
                  navigate('/dashboard/integrations');
                }}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors ${
                  workspace.id === context.activeWorkspaceId
                    ? 'border-gblue bg-gblue/5'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{workspace.name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {workspace.workspaceKind === 'primary' ? 'Primary workspace' : 'Client workspace'} · {workspace.slug}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreate} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Create Client Workspace</h2>
          <p className="mt-1 text-sm text-gray-500">
            Add a new client environment with its own GHL connection and operational boundary.
          </p>
          <label className="mt-5 block text-sm font-medium text-gray-700">
            Workspace name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Bad Marketing - Client A"
              className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-gblue"
            />
          </label>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gblue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gblue-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {creating ? 'Creating...' : 'Create Workspace'}
          </button>
        </form>
      </section>
    </div>
  );
}
