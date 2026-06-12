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
      title: 'ShowFi.io | Wallet Pass Reminders for Webinars, Events & Calls',
      description:
        'Add Apple Wallet and Google Wallet reminders for webinars, booked calls, events, and attendance-focused campaigns.',
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

  if (pathname === '/waitlist') {
    return {
      title: 'Get Started | ShowFi.io',
      description:
        'Start ShowFi.io checkout to activate wallet pass software for attendance-driven campaigns and events.',
      path: '/waitlist',
      robots: 'noindex, follow',
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

  if (pathname === '/wallet-pass-software') {
    return {
      title: 'Solutions | ShowFi.io Wallet Pass Reminders',
      description:
        'Explore ShowFi.io solutions for webinar attendance, booked call reminders, live events, agencies, sales teams, and attendance-focused campaigns.',
      path: '/wallet-pass-software',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ShowFi.io',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        featureList: [
          'Webinar attendance reminders',
          'Booked call reminders',
          'Live event wallet passes',
          'Apple Wallet and Google Wallet support',
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

  if (pathname === '/webinar-reminder-software') {
    return {
      title: 'Webinar Reminder Software | ShowFi.io',
      description:
        'ShowFi.io helps improve webinar attendance with wallet-based reminders that keep the session visible closer to the moment someone needs to join.',
      path: '/webinar-reminder-software',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ShowFi.io',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
      },
    };
  }

  if (pathname === '/zoom-webinar-reminders') {
    return {
      title: 'Zoom Webinar Reminders with Wallet Pass Fallbacks | ShowFi.io',
      description:
        'Add Apple Wallet and Google Wallet fallback reminders to Zoom webinar registration flows so missed confirmation emails, join links, and late-start recovery are easier on mobile.',
      path: '/zoom-webinar-reminders',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Zoom Webinar Reminders',
        url: absoluteUrl('/zoom-webinar-reminders'),
      },
    };
  }

  if (pathname === '/reduce-webinar-no-shows') {
    return {
      title: 'Reduce Webinar No-Shows with Wallet Pass Reminders | ShowFi.io',
      description:
        'Reduce webinar no-show risk by adding wallet pass reminders after registration, alongside email, SMS, calendar, and Zoom follow-up.',
      path: '/reduce-webinar-no-shows',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Reduce Webinar No-Shows',
        url: absoluteUrl('/reduce-webinar-no-shows'),
      },
    };
  }

  if (pathname === '/webinar-reminder-sequence-template') {
    return {
      title: 'Webinar Reminder Sequence Template | Email, SMS & Wallet',
      description:
        'Use this webinar reminder sequence template to coordinate email, SMS, calendar, and wallet pass reminders before the live session.',
      path: '/webinar-reminder-sequence-template',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Webinar Reminder Sequence Template',
        url: absoluteUrl('/webinar-reminder-sequence-template'),
      },
    };
  }

  if (pathname === '/why-webinar-reminders-fail') {
    return {
      title: 'Why Webinar Reminders Fail When the Inbox Gets Crowded',
      description:
        'Learn why email-only webinar reminders fail, how Zoom confirmation gaps happen, and how SMS, calendar, and wallet passes support final-hour join recovery.',
      path: '/why-webinar-reminders-fail',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'Why Webinar Reminders Fail When the Inbox Gets Crowded',
        url: absoluteUrl('/why-webinar-reminders-fail'),
      },
    };
  }

  if (pathname === '/wallet-pass-marketing') {
    return {
      title: 'Wallet Pass Marketing for Events, Webinars & Calls | ShowFi.io',
      description:
        'Use Apple Wallet and Google Wallet passes as a mobile reminder and retrieval channel for events, webinars, booked calls, and campaigns.',
      path: '/wallet-pass-marketing',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Wallet Pass Marketing',
        url: absoluteUrl('/wallet-pass-marketing'),
      },
    };
  }

  if (pathname === '/webinar-show-up-rate-calculator') {
    return {
      title: 'Webinar Show-Up Rate Calculator | ShowFi.io',
      description:
        'Estimate the revenue impact of webinar no-shows and see how many extra attendees better reminder retrieval could recover.',
      path: '/webinar-show-up-rate-calculator',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Webinar Show-Up Rate Calculator',
        url: absoluteUrl('/webinar-show-up-rate-calculator'),
        applicationCategory: 'BusinessApplication',
      },
    };
  }

  if (pathname === '/event-reminder-software') {
    return {
      title: 'Event Reminder Software | ShowFi.io',
      description:
        'ShowFi.io is event reminder software for live attendance, helping teams keep tickets and event details visible through Apple Wallet and Google Wallet.',
      path: '/event-reminder-software',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ShowFi.io',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
      },
    };
  }

  if (pathname === '/gohighlevel-appointment-reminders') {
    return {
      title: 'GoHighLevel Appointment Reminders with Wallet Passes',
      description:
        'ShowFi.io adds Apple Wallet and Google Wallet delivery to GoHighLevel appointment reminders, GHL ghosting workflows, booked-call no-shows, webinars, and agency events.',
      path: '/gohighlevel-appointment-reminders',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ShowFi.io',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
      },
    };
  }

  if (pathname === '/gohighlevel-wallet-pass') {
    return {
      title: 'GoHighLevel Wallet Pass | ShowFi.io',
      description:
        'ShowFi.io adds wallet pass delivery to GoHighLevel follow-up workflows for booked calls, webinars, and events that need stronger attendance visibility.',
      path: '/gohighlevel-wallet-pass',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ShowFi.io',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
      },
    };
  }

  if (pathname === '/booked-call-reminders') {
    return {
      title: 'Booked Call Reminders | ShowFi.io',
      description:
        'ShowFi.io helps reduce no-shows with booked call reminders that stay visible through Apple Wallet and Google Wallet closer to the appointment.',
      path: '/booked-call-reminders',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ShowFi.io',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
      },
    };
  }

  if (pathname === '/plan') {
    return {
      title: 'SEO Plan | ShowFi.io Growth Roadmap',
      description:
        'Review the ShowFi.io SEO status scan and 90-day plan for improving organic visibility, topic authority, internal links, and measurement.',
      path: '/plan',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'ShowFi.io SEO Plan',
        url: absoluteUrl('/plan'),
        description:
          'A practical SEO plan for improving ShowFi.io organic visibility across wallet pass, webinar reminder, event reminder, and booked-call reminder search intents.',
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

  if (pathname === '/demo') {
    return {
      title: 'Private Signup | ShowFi.io',
      description: 'Private signup page for complimentary ShowFi.io account access.',
      path: '/demo',
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
