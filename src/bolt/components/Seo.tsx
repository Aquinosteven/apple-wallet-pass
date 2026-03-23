import { useEffect } from 'react';

const SITE_NAME = 'ShowFi.io';
const SITE_URL = 'https://www.showfi.io';

export interface SeoConfig {
  title: string;
  description: string;
  path: string;
  robots?: string;
  ogType?: 'website' | 'product';
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function upsertMeta(selector: string, attributes: Record<string, string>, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

function replaceStructuredData(schema?: SeoConfig['schema']) {
  document.head.querySelectorAll('script[data-seo-schema="true"]').forEach((node) => node.remove());

  if (!schema) {
    return;
  }

  const entries = Array.isArray(schema) ? schema : [schema];
  entries.forEach((entry) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seoSchema = 'true';
    script.text = JSON.stringify(entry);
    document.head.appendChild(script);
  });
}

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function getSeoConfig(pathname: string): SeoConfig {
  if (pathname === '/') {
    return {
      title: 'ShowFi.io | Wallet Pass Software for Events, Webinars, and Calls',
      description:
        'ShowFi.io helps agencies and marketers increase show rates with wallet pass software for booked calls, webinars, challenges, and live events across Apple Wallet and Google Wallet.',
      path: '/',
      schema: [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'ShowFi.io',
          url: absoluteUrl('/'),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'ShowFi.io',
          url: absoluteUrl('/'),
        },
      ],
    };
  }

  if (pathname === '/pricing') {
    return {
      title: 'Pricing | ShowFi.io Wallet Pass Software',
      description:
        'Explore ShowFi.io pricing for wallet pass software, including Apple Wallet and Google Wallet support, GoHighLevel integration, automation, and attendee tracking.',
      path: '/pricing',
      ogType: 'product',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ShowFi.io',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: [
          {
            '@type': 'Offer',
            price: '97',
            priceCurrency: 'USD',
            url: absoluteUrl('/pricing'),
          },
          {
            '@type': 'Offer',
            price: '997',
            priceCurrency: 'USD',
            url: absoluteUrl('/pricing'),
          },
        ],
      },
    };
  }

  if (pathname === '/apple-wallet-pass-software') {
    return {
      title: 'Apple Wallet Pass Software | ShowFi.io',
      description:
        'ShowFi.io is Apple Wallet pass software for events, webinars, booked calls, and attendance-focused campaigns.',
      path: '/apple-wallet-pass-software',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ShowFi.io',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        featureList: [
          'Apple Wallet pass delivery',
          'Attendance reminders',
          'Campaign automation',
          'GoHighLevel integration',
        ],
      },
    };
  }

  if (pathname === '/google-wallet-pass-software') {
    return {
      title: 'Google Wallet Pass Software | ShowFi.io',
      description:
        'ShowFi.io is Google Wallet pass software for Android-friendly event, webinar, and campaign reminder flows.',
      path: '/google-wallet-pass-software',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ShowFi.io',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        featureList: [
          'Google Wallet pass delivery',
          'Cross-platform wallet support',
          'Attendance reminders',
          'Campaign automation',
        ],
      },
    };
  }

  if (pathname === '/login') {
    return {
      title: 'Log In | ShowFi.io',
      description: 'Log in to ShowFi.io to manage wallet pass campaigns, billing, and event operations.',
      path: '/login',
      robots: 'noindex, nofollow',
    };
  }

  if (pathname === '/billing/success') {
    return {
      title: 'Billing Success | ShowFi.io',
      description: 'Billing confirmation for your ShowFi.io account.',
      path: '/billing/success',
      robots: 'noindex, nofollow',
    };
  }

  if (pathname === '/billing/cancel') {
    return {
      title: 'Billing Canceled | ShowFi.io',
      description: 'Billing cancellation page for your ShowFi.io account.',
      path: '/billing/cancel',
      robots: 'noindex, nofollow',
    };
  }

  if (pathname === '/pass') {
    return {
      title: 'Pass Generator | ShowFi.io',
      description: 'Internal ShowFi.io wallet pass generator.',
      path: '/pass',
      robots: 'noindex, nofollow',
    };
  }

  if (pathname.startsWith('/claim/')) {
    return {
      title: 'Claim Your Pass | ShowFi.io',
      description: 'Claim your ShowFi.io wallet pass.',
      path: pathname,
      robots: 'noindex, nofollow',
    };
  }

  if (pathname.startsWith('/dashboard')) {
    return {
      title: 'Dashboard | ShowFi.io',
      description: 'Manage ShowFi.io wallet campaigns, reporting, billing, and integrations.',
      path: pathname,
      robots: 'noindex, nofollow',
    };
  }

  return {
    title: 'ShowFi.io | Wallet Pass Software',
    description: 'ShowFi.io powers wallet passes for marketing campaigns, events, and attendee engagement across Apple Wallet and Google Wallet.',
    path: pathname,
    robots: 'noindex, nofollow',
  };
}

export function renderSeoHeadMarkup(config: SeoConfig) {
  const canonicalUrl = absoluteUrl(config.path);
  const robots = config.robots ?? 'index, follow';
  const ogType = config.ogType ?? 'website';
  const schemaEntries = config.schema ? (Array.isArray(config.schema) ? config.schema : [config.schema]) : [];

  const parts = [
    `<title>${escapeHtml(config.title)}</title>`,
    `<meta name="description" content="${escapeHtml(config.description)}" />`,
    `<meta name="robots" content="${escapeHtml(robots)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${escapeHtml(config.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(config.description)}" />`,
    `<meta property="og:type" content="${escapeHtml(ogType)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(config.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(config.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
  ];

  schemaEntries.forEach((entry) => {
    parts.push(`<script type="application/ld+json">${JSON.stringify(entry)}</script>`);
  });

  return parts.join('\n    ');
}

export function Seo({ title, description, path, robots = 'index, follow', ogType = 'website', schema }: SeoConfig) {
  useEffect(() => {
    const canonicalUrl = absoluteUrl(path);
    document.title = title;
    document.documentElement.lang = 'en';

    upsertMeta('meta[name="description"]', { name: 'description' }, description);
    upsertMeta('meta[name="robots"]', { name: 'robots' }, robots);
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, SITE_NAME);
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, title);
    upsertMeta('meta[property="og:description"]', { property: 'og:description' }, description);
    upsertMeta('meta[property="og:type"]', { property: 'og:type' }, ogType);
    upsertMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary');
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title);
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description);
    upsertCanonical(canonicalUrl);
    replaceStructuredData(schema);
  }, [description, ogType, path, robots, schema, title]);

  return null;
}
