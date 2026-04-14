import { Link, useLocation } from 'react-router-dom';
import { Calendar, Plug, Settings, Wallet, BarChart3, Shield, LifeBuoy, BookOpen, X } from 'lucide-react';

const navItems = [
  { icon: Calendar, label: 'Events', path: '/dashboard' },
  { icon: Wallet, label: 'Agency', path: '/dashboard/agency', agencyOnly: true },
  { icon: BarChart3, label: 'Reporting', path: '/dashboard/reporting' },
  { icon: BookOpen, label: 'Help Center', path: '/dashboard/help' },
  { icon: Shield, label: 'Admin', path: '/admin' },
  { icon: LifeBuoy, label: 'Support', path: '/dashboard/support' },
  { icon: Plug, label: 'Integrations', path: '/dashboard/integrations' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
];

export default function Sidebar({
  mobileOpen = false,
  onClose,
  organizationType = 'solo',
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
  organizationType?: 'solo' | 'agency';
}) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/events');
    }
    return location.pathname.startsWith(path);
  };

  const navContent = (
    <>
      <div className="h-14 flex items-center gap-2 px-5 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-gblue flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-semibold text-gray-900">ShowFi</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 md:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 py-4 px-3">
        <ul className="space-y-1">
          {navItems
            .filter((item) => !item.agencyOnly || organizationType === 'agency')
            .map(({ icon: Icon, label, path }) => {
            const active = isActive(path);
            return (
              <li key={path}>
                <Link
                  to={path}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? 'bg-gblue/8 text-gblue'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`w-[18px] h-[18px] ${active ? 'text-gblue' : 'text-gray-400'}`} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-gray-100">
        <Link
          to="/dashboard/help"
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span>Help Center</span>
          <span className="text-gray-300">-</span>
          <span>Support</span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-56 flex-col border-r border-gray-100 bg-white md:flex">
        {navContent}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/35"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
            {navContent}
          </aside>
        </div>
      ) : null}
    </>
  );
}
