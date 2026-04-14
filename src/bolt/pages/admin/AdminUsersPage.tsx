import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { listAdminUsers, resetAdminUserPassword, type AdminUserRow } from '../../utils/backendApi';
import { formatAdminDate, formatAdminStatus } from './adminUi';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listAdminUsers());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetPassword = async (user: AdminUserRow) => {
    const reason = window.prompt(`Reason for resetting ${user.email || user.id}?`);
    if (!reason) return;
    try {
      const result = await resetAdminUserPassword(user.id, { reason });
      window.alert(`Temporary password for ${result.user.email || user.id}: ${result.temporaryPassword}`);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Failed to reset password');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Users</h1>
        <p className="mt-1 text-sm text-slate-400">Supabase-auth-backed directory for account recovery and linkage checks.</p>
      </div>

      {error ? <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
      {loading ? <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading users</div> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {users.map((user) => (
          <div key={user.id} className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-white">{user.email || 'Unknown email'}</div>
                <div className="mt-1 text-xs text-slate-500">{user.id}</div>
              </div>
              <button
                type="button"
                onClick={() => resetPassword(user)}
                className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white hover:border-slate-600"
              >
                Reset password
              </button>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-slate-300">
              <div>Created: <span className="text-white">{formatAdminDate(user.created_at)}</span></div>
              <div>Last sign-in: <span className="text-white">{formatAdminDate(user.last_sign_in_at)}</span></div>
              <div>Email confirmed: <span className="text-white">{user.email_confirmed_at ? 'Yes' : 'No'}</span></div>
              <div>Providers: <span className="text-white">{user.providers.length ? user.providers.join(', ') : 'Password only'}</span></div>
              <div>Linked account: <span className="text-white">{user.account ? `${user.account.name} (${formatAdminStatus(user.account.billing_state)})` : 'No linked account'}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
