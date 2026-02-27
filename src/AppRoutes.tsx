import { Suspense, lazy, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Footer from './bolt/components/layout/Footer';
import Navbar from './bolt/components/layout/Navbar';
import { getSession, onAuthStateChange } from './lib/auth';

const LoginPage = lazy(() => import('./bolt/pages/LoginPage'));
const DashboardLayout = lazy(() => import('./bolt/pages/dashboard/DashboardLayout'));
const EventDetailPage = lazy(() => import('./bolt/pages/dashboard/EventDetailPage'));
const EventsDashboard = lazy(() => import('./bolt/pages/dashboard/EventsDashboard'));
const GlobalTicketsPage = lazy(() => import('./bolt/pages/dashboard/GlobalTicketsPage'));
const IntegrationsPage = lazy(() => import('./bolt/pages/dashboard/IntegrationsPage'));
const GhlConnectPage = lazy(() => import('./bolt/pages/dashboard/GhlConnectPage'));
const NewEventWizard = lazy(() => import('./bolt/pages/dashboard/NewEventWizard'));
const ReportingPage = lazy(() => import('./bolt/pages/dashboard/ReportingPage'));
const AdminPanelPage = lazy(() => import('./bolt/pages/dashboard/AdminPanelPage'));
const SupportPage = lazy(() => import('./bolt/pages/dashboard/SupportPage'));
const SettingsPage = lazy(() => import('./bolt/pages/dashboard/SettingsPage'));
const HomePage = lazy(() => import('./bolt/pages/home/HomePage'));
const ClaimPage = lazy(() => import('./bolt/pages/claim/ClaimPage'));
const PassGeneratorPage = lazy(() => import('./App'));

function RouteFallback() {
  return <div className="min-h-screen bg-gray-50" />;
}

function RequireAuth({ isAuthed, children }: { isAuthed: boolean; children: ReactElement }) {
  const location = useLocation();

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
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
  const [isAuthed, setIsAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        const session = await getSession();
        if (!active) {
          return;
        }
        setIsAuthed(Boolean(session));
      } catch {
        if (!active) {
          return;
        }
        setIsAuthed(false);
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    };

    void loadSession();

    const unsubscribe = onAuthStateChange((session) => {
      if (!active) {
        return;
      }
      setIsAuthed(Boolean(session));
      setAuthLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (authLoading) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  const loginElement: ReactElement = <LoginPage />;
  const dashboardElement: ReactElement = (
    <RequireAuth isAuthed={isAuthed}>
      <DashboardLayout />
    </RequireAuth>
  );

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route
          path="/"
          element={
            <MarketingLayout>
              <HomePage />
            </MarketingLayout>
          }
        />
        <Route path="/login" element={isAuthed ? <Navigate to="/dashboard" replace /> : loginElement} />
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
    </Suspense>
  );
}
