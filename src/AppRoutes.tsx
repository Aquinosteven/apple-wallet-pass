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
import AgencyOverviewPage from './bolt/pages/dashboard/AgencyOverviewPage';
import HelpCenterPage from './bolt/pages/dashboard/HelpCenterPage';
import SupportPage from './bolt/pages/dashboard/SupportPage';
import SettingsPage from './bolt/pages/dashboard/SettingsPage';
import AdminLayout from './bolt/pages/admin/AdminLayout';
import AdminLoginPage from './bolt/pages/admin/AdminLoginPage';
import AdminOverviewPage from './bolt/pages/admin/AdminOverviewPage';
import AdminAccountsPage from './bolt/pages/admin/AdminAccountsPage';
import AdminAccountDetailPage from './bolt/pages/admin/AdminAccountDetailPage';
import AdminUsersPage from './bolt/pages/admin/AdminUsersPage';
import AdminBillingPage from './bolt/pages/admin/AdminBillingPage';
import AdminSupportPage from './bolt/pages/admin/AdminSupportPage';
import AdminOperationsPage from './bolt/pages/admin/AdminOperationsPage';
import AdminAuditPage from './bolt/pages/admin/AdminAuditPage';
import { Seo, getSeoConfig } from './bolt/components/Seo';
import HomePage from './bolt/pages/home/HomePage';
import AppleWalletSoftwarePage from './bolt/pages/landing/AppleWalletSoftwarePage';
import GoogleWalletSoftwarePage from './bolt/pages/landing/GoogleWalletSoftwarePage';
import WalletPassSoftwarePage from './bolt/pages/landing/WalletPassSoftwarePage';
import WebinarReminderSoftwarePage from './bolt/pages/landing/WebinarReminderSoftwarePage';
import EventReminderSoftwarePage from './bolt/pages/landing/EventReminderSoftwarePage';
import GohighlevelWalletPassPage from './bolt/pages/landing/GohighlevelWalletPassPage';
import BookedCallRemindersPage from './bolt/pages/landing/BookedCallRemindersPage';
import PricingPage from './bolt/pages/pricing/PricingPage';
import ClaimPage from './bolt/pages/claim/ClaimPage';
import TermsPage from './bolt/pages/legal/TermsPage';
import PrivacyPage from './bolt/pages/legal/PrivacyPage';
import WaitlistPage from './bolt/pages/waitlist/WaitlistPage';
import PassGeneratorPage from './App';
import { getSession, onAuthStateChange } from './lib/auth';
import { hasGoogleAnalytics, trackPageView } from './lib/googleAnalytics';

const ONBOARDING_PENDING_KEY = 'showfi_onboarding_pending';

function readOnboardingPending() {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(ONBOARDING_PENDING_KEY) === 'true';
  } catch {
    return false;
  }
}

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

function RequireAdmin({
  isAuthed,
  authLoading,
  isAdmin,
  children,
}: {
  isAuthed: boolean;
  authLoading: boolean;
  isAdmin: boolean;
  children: ReactElement;
}) {
  const location = useLocation();

  if (authLoading) {
    return <RouteFallback />;
  }

  if (!isAuthed) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname, denied: true }} />;
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
  const [onboardingPending, setOnboardingPending] = useState(false);
  const [adminRole, setAdminRole] = useState<'owner' | 'support_read' | 'support_write' | 'admin_super'>('owner');
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
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

  const fetchAdminSessionStatus = useCallback(async (accessToken: string): Promise<{
    isAdmin: boolean;
    role: 'owner' | 'support_read' | 'support_write' | 'admin_super';
    email: string | null;
  }> => {
    try {
      const response = await fetch('/api/admin/session', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        return { isAdmin: false, role: 'owner', email: null };
      }
      const payload = await response.json().catch(() => null);
      return {
        isAdmin: Boolean(payload?.isAdmin),
        role: (payload?.role || 'owner') as 'owner' | 'support_read' | 'support_write' | 'admin_super',
        email: typeof payload?.user?.email === 'string' ? payload.user.email : null,
      };
    } catch {
      return { isAdmin: false, role: 'owner', email: null };
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        setOnboardingPending(readOnboardingPending());
        const session = await getSession();
        if (!active) {
          return;
        }
        setIsAuthed(Boolean(session));
        if (session?.access_token) {
          const [allowed, adminStatus] = await Promise.all([
            fetchBillingGateStatus(session.access_token),
            fetchAdminSessionStatus(session.access_token),
          ]);
          if (!active) return;
          setCanAccessDashboard(allowed);
          setAdminRole(adminStatus.role);
          setAdminEmail(adminStatus.email);
          setIsAuthed(Boolean(session));
          if (!adminStatus.isAdmin) {
            setAdminRole('owner');
            setAdminEmail(session.user?.email || null);
          }
        } else {
          setCanAccessDashboard(true);
          setAdminRole('owner');
          setAdminEmail(null);
        }
      } catch {
        if (!active) {
          return;
        }
        setIsAuthed(false);
        setCanAccessDashboard(true);
        setAdminRole('owner');
        setAdminEmail(null);
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
        setOnboardingPending(readOnboardingPending());
        setIsAuthed(Boolean(session));
        if (session?.access_token) {
          const [allowed, adminStatus] = await Promise.all([
            fetchBillingGateStatus(session.access_token),
            fetchAdminSessionStatus(session.access_token),
          ]);
          if (!active) return;
          setCanAccessDashboard(allowed);
          setAdminRole(adminStatus.role);
          setAdminEmail(adminStatus.email);
          if (!adminStatus.isAdmin) {
            setAdminRole('owner');
            setAdminEmail(session.user?.email || null);
          }
        } else {
          setCanAccessDashboard(true);
          setAdminRole('owner');
          setAdminEmail(null);
        }
        setAuthLoading(false);
      };
      void syncState();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [fetchAdminSessionStatus, fetchBillingGateStatus]);

  useEffect(() => {
    if (!hasGoogleAnalytics()) {
      return;
    }

    const path = `${location.pathname}${location.search}${location.hash}`;
    trackPageView(path);
  }, [location.hash, location.pathname, location.search]);

  const dashboardElement: ReactElement = (
    <RequireAuth isAuthed={isAuthed} authLoading={authLoading} canAccessDashboard={canAccessDashboard}>
      <DashboardLayout />
    </RequireAuth>
  );

  const adminElement: ReactElement = (
    <RequireAdmin isAuthed={isAuthed} authLoading={authLoading} isAdmin={adminRole !== 'owner'}>
      <AdminLayout adminEmail={adminEmail} role={adminRole} />
    </RequireAdmin>
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
          path="/waitlist"
          element={
            <MarketingLayout>
              <WaitlistPage />
            </MarketingLayout>
          }
        />
        <Route
          path="/terms"
          element={
            <MarketingLayout>
              <TermsPage />
            </MarketingLayout>
          }
        />
        <Route
          path="/privacy"
          element={
            <MarketingLayout>
              <PrivacyPage />
            </MarketingLayout>
          }
        />
        <Route
          path="/wallet-pass-software"
          element={
            <MarketingLayout>
              <WalletPassSoftwarePage />
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
          path="/webinar-reminder-software"
          element={
            <MarketingLayout>
              <WebinarReminderSoftwarePage />
            </MarketingLayout>
          }
        />
        <Route
          path="/event-reminder-software"
          element={
            <MarketingLayout>
              <EventReminderSoftwarePage />
            </MarketingLayout>
          }
        />
        <Route
          path="/gohighlevel-wallet-pass"
          element={
            <MarketingLayout>
              <GohighlevelWalletPassPage />
            </MarketingLayout>
          }
        />
        <Route
          path="/booked-call-reminders"
          element={
            <MarketingLayout>
              <BookedCallRemindersPage />
            </MarketingLayout>
          }
        />
        <Route
          path="/login"
          element={isAuthed && canAccessDashboard && !onboardingPending ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/demo"
          element={isAuthed && canAccessDashboard && !onboardingPending ? <Navigate to="/dashboard" replace /> : <LoginPage variant="free" />}
        />
        <Route
          path="/admin/login"
          element={authLoading ? <RouteFallback /> : isAuthed && adminRole !== 'owner' ? <Navigate to="/admin" replace /> : <AdminLoginPage />}
        />
        <Route path="/admin" element={adminElement}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="accounts" element={<AdminAccountsPage />} />
          <Route path="accounts/:accountId" element={<AdminAccountDetailPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="billing" element={<AdminBillingPage />} />
          <Route path="support" element={<AdminSupportPage />} />
          <Route path="operations" element={<AdminOperationsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>
        <Route path="/billing/success" element={<BillingSuccessPage />} />
        <Route path="/billing/cancel" element={<BillingCancelPage />} />
        <Route path="/dashboard" element={dashboardElement}>
          <Route path="agency" element={<AgencyOverviewPage />} />
          <Route index element={<EventsDashboard />} />
          <Route path="events/new" element={<NewEventWizard />} />
          <Route path="events/:eventId" element={<EventDetailPage />} />
          <Route path="tickets" element={<GlobalTicketsPage />} />
          <Route path="reporting" element={<ReportingPage />} />
          <Route path="admin" element={<Navigate to="/admin" replace />} />
          <Route path="help" element={<HelpCenterPage />} />
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
