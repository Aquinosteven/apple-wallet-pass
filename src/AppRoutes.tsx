import { useCallback, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Footer from './bolt/components/layout/Footer';
import Navbar from './bolt/components/layout/Navbar';
import LoginPage from './bolt/pages/LoginPage';
import BillingSuccessPage from './bolt/pages/billing/BillingSuccessPage';
import BillingCancelPage from './bolt/pages/billing/BillingCancelPage';
import DashboardLayout from './bolt/pages/dashboard/DashboardLayout';
import EventDetailPage from './bolt/pages/dashboard/EventDetailPage';
import EventsDashboard from './bolt/pages/dashboard/EventsDashboard';
import GlobalTicketsPage from './bolt/pages/dashboard/GlobalTicketsPage';
import IntegrationsPage from './bolt/pages/dashboard/IntegrationsPage';
import GhlConnectPage from './bolt/pages/dashboard/GhlConnectPage';
import NewEventWizard from './bolt/pages/dashboard/NewEventWizard';
import ReportingPage from './bolt/pages/dashboard/ReportingPage';
import AdminPanelPage from './bolt/pages/dashboard/AdminPanelPage';
import SupportPage from './bolt/pages/dashboard/SupportPage';
import SettingsPage from './bolt/pages/dashboard/SettingsPage';
import { Seo, getSeoConfig } from './bolt/components/Seo';
import HomePage from './bolt/pages/home/HomePage';
import AppleWalletSoftwarePage from './bolt/pages/landing/AppleWalletSoftwarePage';
import GoogleWalletSoftwarePage from './bolt/pages/landing/GoogleWalletSoftwarePage';
import PricingPage from './bolt/pages/pricing/PricingPage';
import ClaimPage from './bolt/pages/claim/ClaimPage';
import PassGeneratorPage from './App';
import { getSession, onAuthStateChange } from './lib/auth';

function RouteFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  );
}

function RequireAuth({
  isAuthed,
  authLoading,
  canAccessDashboard,
  children,
}: {
  isAuthed: boolean;
  authLoading: boolean;
  canAccessDashboard: boolean;
  children: ReactElement;
}) {
  const location = useLocation();

  if (authLoading) {
    return <RouteFallback />;
  }

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessDashboard) {
    return <Navigate to="/login" replace state={{ from: location.pathname, billingRequired: true }} />;
  }

  return children;
}

function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}

export default function AppRoutes() {
  const location = useLocation();
  const [isAuthed, setIsAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [canAccessDashboard, setCanAccessDashboard] = useState(true);
  const seo = getSeoConfig(location.pathname);

  const fetchBillingGateStatus = useCallback(async (accessToken: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/billing/status', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        return true;
      }

      const payload = await response.json().catch(() => null);
      if (!payload || typeof payload !== 'object' || !('canAccessDashboard' in payload)) {
        return true;
      }

      return Boolean(payload.canAccessDashboard);
    } catch {
      return true;
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        const session = await getSession();
        if (!active) {
          return;
        }
        setIsAuthed(Boolean(session));
        if (session?.access_token) {
          const allowed = await fetchBillingGateStatus(session.access_token);
          if (!active) return;
          setCanAccessDashboard(allowed);
        } else {
          setCanAccessDashboard(true);
        }
      } catch {
        if (!active) {
          return;
        }
        setIsAuthed(false);
        setCanAccessDashboard(true);
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    };

    void loadSession();

    const unsubscribe = onAuthStateChange((session) => {
      const syncState = async () => {
        if (!active) {
          return;
        }
        setIsAuthed(Boolean(session));
        if (session?.access_token) {
          const allowed = await fetchBillingGateStatus(session.access_token);
          if (!active) return;
          setCanAccessDashboard(allowed);
        } else {
          setCanAccessDashboard(true);
        }
        setAuthLoading(false);
      };
      void syncState();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [fetchBillingGateStatus]);

  const dashboardElement: ReactElement = (
    <RequireAuth isAuthed={isAuthed} authLoading={authLoading} canAccessDashboard={canAccessDashboard}>
      <DashboardLayout />
    </RequireAuth>
  );

  return (
    <>
      <Seo {...seo} />
      <Routes>
        <Route
          path="/"
          element={
            <MarketingLayout>
              <HomePage />
            </MarketingLayout>
          }
        />
        <Route
          path="/pricing"
          element={
            <MarketingLayout>
              <PricingPage />
            </MarketingLayout>
          }
        />
        <Route
          path="/apple-wallet-pass-software"
          element={
            <MarketingLayout>
              <AppleWalletSoftwarePage />
            </MarketingLayout>
          }
        />
        <Route
          path="/google-wallet-pass-software"
          element={
            <MarketingLayout>
              <GoogleWalletSoftwarePage />
            </MarketingLayout>
          }
        />
        <Route
          path="/login"
          element={isAuthed && canAccessDashboard ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route path="/billing/success" element={<BillingSuccessPage />} />
        <Route path="/billing/cancel" element={<BillingCancelPage />} />
        <Route path="/dashboard" element={dashboardElement}>
          <Route index element={<EventsDashboard />} />
          <Route path="events/new" element={<NewEventWizard />} />
          <Route path="events/:eventId" element={<EventDetailPage />} />
          <Route path="tickets" element={<GlobalTicketsPage />} />
          <Route path="reporting" element={<ReportingPage />} />
          <Route path="admin" element={<AdminPanelPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="integrations/ghl" element={<GhlConnectPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="/pass" element={<PassGeneratorPage />} />
        <Route path="/claim/:token" element={<ClaimPage />} />
        <Route path="/events/new" element={<Navigate to="/dashboard/events/new" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
