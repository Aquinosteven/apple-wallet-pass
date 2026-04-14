import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  CreditCard,
  FileSearch,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Search,
  Shield,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { signOut } from '../../../lib/auth';
import type { AdminRole } from '../../utils/backendApi';
import { formatAdminStatus } from './adminUi';

const navItems = [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Accounts', path: '/admin/accounts', icon: Wallet },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Billing', path: '/admin/billing', icon: CreditCard },
  { label: 'Support', path: '/admin/support', icon: LifeBuoy },
  { label: 'Operations', path: '/admin/operations', icon: Activity },
  { label: 'Audit', path: '/admin/audit', icon: FileSearch },
];

const IMPERSONATION_STORAGE_KEY = 'showfi_admin_impersonation';

type AdminLayoutProps = {
  adminEmail: string | null;
  role: AdminRole;
};

type StoredImpersonation = {
  sessionId: string;
  targetLabel: string;
  expiresAt: string;
};

export default function AdminLayout({ adminEmail, role }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState(searchParams.get('q') || '');
  const [impersonation, setImpersonation] = useState<StoredImpersonation | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(IMPERSONATION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredImpersonation;
      setImpersonation(parsed);
    } catch {
      setImpersonation(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    setGlobalSearch(searchParams.get('q') || '');
  }, [searchParams]);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  const navContent = useMemo(() => (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">ShowFi Admin</div>
          <div className="text-xs text-slate-400">Backoffice center</div>
        </div>
        <button
          type="button"
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close admin navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4">
        <div className="mb-4 px-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Internal access</div>
          <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm text-slate-300">
            <div className="font-medium text-white">{adminEmail || 'Internal operator'}</div>
            <div className="mt-1 text-xs text-slate-400">{formatAdminStatus(role)}</div>
          </div>
        </div>

        <ul className="space-y-1">
          {navItems.map(({ label, path, icon: Icon, exact }) => (
            <li key={path}>
              <NavLink
                to={path}
                end={exact}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  ), [adminEmail, role]);

  const submitGlobalSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (globalSearch.trim()) next.set('q', globalSearch.trim());
    navigate({
      pathname: '/admin/accounts',
      search: next.toString() ? `?${next.toString()}` : '',
    });
  };

  return (
    <div className="min-h-screen bg-[#09111f] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-800 bg-[#07101d] md:flex md:flex-col">
        {navContent}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/70"
            aria-label="Close admin menu overlay"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-80 max-w-[88vw] flex-col border-r border-slate-800 bg-[#07101d]">
            {navContent}
          </aside>
        </div>
      ) : null}

      <div className="md:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#09111f]/95 backdrop-blur">
          {impersonation ? (
            <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 sm:px-6">
              Impersonation active for {impersonation.targetLabel}. Session expires {new Date(impersonation.expiresAt).toLocaleString()}.
            </div>
          ) : null}

          <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-slate-200 md:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open admin navigation"
              >
                <Shield className="h-4 w-4" />
              </button>
              <div>
                <div className="text-lg font-semibold text-white">Admin Center</div>
                <div className="text-sm text-slate-400">Internal operations, billing control, and support tools</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <form onSubmit={submitGlobalSearch} className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  value={globalSearch}
                  onChange={(event) => setGlobalSearch(event.target.value)}
                  placeholder="Search accounts, users, tickets"
                  className="w-full min-w-[220px] bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </form>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-200 hover:border-slate-700 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
