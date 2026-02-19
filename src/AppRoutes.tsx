import type { ReactElement, ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
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
import PassGeneratorPage from './App';

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
  const loginElement: ReactElement = <LoginPage />;
  const dashboardElement: ReactElement = <DashboardLayout />;

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
      <Route path="/login" element={loginElement} />
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
