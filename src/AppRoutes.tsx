import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Footer from './bolt/components/layout/Footer';
import Navbar from './bolt/components/layout/Navbar';
import LoginPage from './bolt/pages/LoginPage';
import DashboardLayout from './bolt/pages/dashboard/DashboardLayout';
import EventDetailPage from './bolt/pages/dashboard/EventDetailPage';
import EventsDashboard from './bolt/pages/dashboard/EventsDashboard';
import GlobalTicketsPage from './bolt/pages/dashboard/GlobalTicketsPage';
import IntegrationsPage from './bolt/pages/dashboard/IntegrationsPage';
import NewEventWizard from './bolt/pages/dashboard/NewEventWizard';
import SettingsPage from './bolt/pages/dashboard/SettingsPage';
import HomePage from './bolt/pages/home/HomePage';
import { getSession, onAuthStateChange } from './lib/auth';
import PassGeneratorPage from './App';

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
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/pass" element={<PassGeneratorPage />} />
      <Route path="/events/new" element={<Navigate to="/dashboard/events/new" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
