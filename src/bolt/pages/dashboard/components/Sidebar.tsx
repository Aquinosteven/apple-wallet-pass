import { Link, useLocation } from 'react-router-dom';
import { Calendar, Plug, Settings, Wallet } from 'lucide-react';

const navItems = [
  { icon: Calendar, label: 'Events', path: '/dashboard' },
  { icon: Plug, label: 'Integrations', path: '/dashboard/integrations' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
];

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/events');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-white border-r border-gray-100 flex flex-col z-40">
      <div className="h-14 flex items-center gap-2 px-5 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-gblue flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-semibold text-gray-900">ShowFi</span>
      </div>

      <nav className="flex-1 py-4 px-3">
        <ul className="space-y-1">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = isActive(path);
            return (
              <li key={path}>
                <Link
                  to={path}
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
        <a
          href="#"
          className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span>API Docs</span>
          <span className="text-gray-300">-</span>
          <span>Support</span>
        </a>
      </div>
    </aside>
  );
}
