import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { trackBackendEvent } from '../../../lib/googleAnalytics';
import { getAccountContext, type AccountContextResponse } from '../../utils/backendApi';

export default function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [accountContext, setAccountContext] = useState<AccountContextResponse | null>(null);

  useEffect(() => {
    void getAccountContext()
      .then(setAccountContext)
      .catch(() => setAccountContext(null));
  }, []);

  useEffect(() => {
    const storageKey = 'showfi_dashboard_view_tracked';

    try {
      if (window.sessionStorage.getItem(storageKey) === 'true') {
        return;
      }

      trackBackendEvent('backend_dashboard_view_first', {
        entry_point: 'dashboard',
      });
      window.sessionStorage.setItem(storageKey, 'true');
    } catch {
      trackBackendEvent('backend_dashboard_view_first', {
        entry_point: 'dashboard',
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        organizationType={accountContext?.organizationType}
      />
      <div className="md:pl-56">
        <TopBar onOpenMobileNav={() => setMobileNavOpen(true)} accountContext={accountContext} />
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
