import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import AppRoutes from './AppRoutes';
import RouteErrorBoundary from './RouteErrorBoundary';
import { initGoogleAnalytics } from './lib/googleAnalytics';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

initGoogleAnalytics();

const app = (
  <StrictMode>
    <RouteErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Analytics />
    </RouteErrorBoundary>
  </StrictMode>
);

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
