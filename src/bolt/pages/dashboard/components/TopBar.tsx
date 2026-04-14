import { LogOut, Menu, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../../../../lib/auth';
import { setActiveAccountId, type AccountContextResponse } from '../../../utils/backendApi';

export default function TopBar({
  onOpenMobileNav,
  accountContext,
}: {
  onOpenMobileNav?: () => void;
  accountContext?: AccountContextResponse | null;
}) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-gray-900 md:hidden">ShowFi</span>
      </div>

      <div className="flex items-center gap-3">
      {accountContext?.workspaces && accountContext.workspaces.length > 1 ? (
        <label className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600">
          <span>Workspace</span>
          <select
            value={accountContext.activeWorkspaceId || ''}
            onChange={(event) => {
              setActiveAccountId(event.target.value || null);
              window.location.assign('/dashboard');
            }}
            className="bg-transparent text-sm font-semibold text-gray-900 outline-none"
          >
            {accountContext.workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <LogOut className="w-3.5 h-3.5" />
        Logout
      </button>
      <button
        type="button"
        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
      >
        <User className="w-4 h-4 text-gray-600" />
      </button>
      </div>
    </header>
  );
}
