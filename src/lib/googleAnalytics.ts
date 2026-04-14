declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }

  interface ImportMetaEnv {
    readonly VITE_GA_MEASUREMENT_ID?: string;
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || '';
const GA_SCRIPT_ID = 'google-analytics-gtag';
let gaReady = false;
let gaConfigSent = false;

type QueuedAnalyticsCall = {
  command: 'event';
  eventName: string;
  params: Record<string, string | number | boolean>;
};

const queuedCalls: QueuedAnalyticsCall[] = [];

export type AnalyticsSurface = 'sales' | 'backend';

type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function sanitizeParams(params: AnalyticsEventParams): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, string | number | boolean] => {
      const [, value] = entry;
      return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
    })
  );
}

export function getAnalyticsSurface(path: string): AnalyticsSurface {
  const pathname = path.split('?')[0]?.split('#')[0] || '/';
  const backendPrefixes = ['/dashboard', '/login', '/demo', '/claim/', '/pass', '/billing'];

  if (backendPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return 'backend';
  }

  return 'sales';
}

export function hasGoogleAnalytics(): boolean {
  return Boolean(GA_MEASUREMENT_ID);
}

function ensureGoogleAnalyticsConfig(): void {
  if (!GA_MEASUREMENT_ID || typeof window.gtag !== 'function' || gaConfigSent) {
    return;
  }

  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
  });
  gaConfigSent = true;
}

function flushQueuedCalls(): void {
  if (!gaReady || typeof window.gtag !== 'function') {
    return;
  }

  ensureGoogleAnalyticsConfig();

  while (queuedCalls.length > 0) {
    const call = queuedCalls.shift();
    if (!call) {
      continue;
    }
    window.gtag(call.command, call.eventName, call.params);
  }
}

function sendOrQueueEvent(eventName: string, params: Record<string, string | number | boolean>): void {
  if (!isBrowser() || !GA_MEASUREMENT_ID || typeof window.gtag !== 'function') {
    return;
  }

  if (!gaReady) {
    queuedCalls.push({
      command: 'event',
      eventName,
      params,
    });
    return;
  }

  ensureGoogleAnalyticsConfig();
  window.gtag('event', eventName, params);
}

export function initGoogleAnalytics(): void {
  if (!isBrowser() || !GA_MEASUREMENT_ID) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };

  const existingScript = document.getElementById(GA_SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    gaReady = true;
    ensureGoogleAnalyticsConfig();
    flushQueuedCalls();
    return;
  }

  const script = document.createElement('script');
  script.id = GA_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  script.addEventListener('load', () => {
    gaReady = true;
    ensureGoogleAnalyticsConfig();
    flushQueuedCalls();
  });
  document.head.appendChild(script);
  window.gtag('js', new Date());
}

export function trackPageView(path: string, title?: string): void {
  if (!isBrowser() || !GA_MEASUREMENT_ID) {
    return;
  }

  const surface = getAnalyticsSurface(path);

  sendOrQueueEvent('page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
    surface,
    team: surface,
    send_to: GA_MEASUREMENT_ID,
  });
}

export function trackGoogleAnalyticsEvent(eventName: string, params: AnalyticsEventParams = {}): void {
  if (!isBrowser() || !GA_MEASUREMENT_ID) {
    return;
  }

  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const surface = getAnalyticsSurface(path);

  sendOrQueueEvent(eventName, {
    surface,
    team: surface,
    page_path: window.location.pathname,
    ...sanitizeParams(params),
  });
}

export function trackSalesEvent(eventName: string, params: AnalyticsEventParams = {}): void {
  trackGoogleAnalyticsEvent(eventName, {
    surface: 'sales',
    team: 'sales',
    ...params,
  });
}

export function trackBackendEvent(eventName: string, params: AnalyticsEventParams = {}): void {
  trackGoogleAnalyticsEvent(eventName, {
    surface: 'backend',
    team: 'backend',
    ...params,
  });
}

export function trackSalesSignupIntent(params: AnalyticsEventParams = {}): void {
  trackSalesEvent('sales_signup_intent', params);
}
