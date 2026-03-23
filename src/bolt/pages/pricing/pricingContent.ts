export type BillingInterval = 'monthly' | 'yearly';

export interface PricingValue {
  amount: number;
  currency: 'USD';
  cadenceLabel: string;
  billedLabel: string;
  helperText: string;
  savingsText?: string;
  equivalentMonthly?: number;
}

export interface FeatureItem {
  title: string;
  detail: string;
}

export interface FeatureGroup {
  title: string;
  items: FeatureItem[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const billingOptions: Array<{ value: BillingInterval; label: string }> = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export const prices: Record<BillingInterval, PricingValue> = {
  monthly: {
    amount: 97,
    currency: 'USD',
    cadenceLabel: '/month',
    billedLabel: 'Billed monthly',
    helperText: 'Start shipping wallet passes with ShowFi.io on one simple plan.',
  },
  yearly: {
    amount: 997,
    currency: 'USD',
    cadenceLabel: '/year',
    billedLabel: 'Billed annually at $997/year',
    helperText: 'Best value for teams running campaigns year-round.',
    savingsText: 'Save $167/year',
    equivalentMonthly: 83.08,
  },
};

export const planName = 'Pro';

export const planTagline = 'Everything you need to issue, automate, and track wallet passes with ShowFi.io.';

export const benefits = [
  'Wallet pass issuance for campaigns and events',
  'Template-driven setup with reusable branding',
  'GoHighLevel integration and webhook automation',
  'Claim flow and attendee tracking dashboard',
  'Monthly usage monitoring and plan controls',
  'Operational error feed and recovery workflows',
  'Production-ready API endpoints and audit logging',
];

export const featureGroups: FeatureGroup[] = [
  {
    title: 'Core platform',
    items: [
      { title: 'Pass issuance engine', detail: 'Create and deliver wallet passes reliably across Apple Wallet and Google Wallet.' },
      { title: 'Campaign and event workflows', detail: 'Supports calls, webinars, and challenge funnels.' },
      { title: 'Usage controls', detail: 'Clear monthly limits with predictable behavior near cap.' },
    ],
  },
  {
    title: 'Automation + integrations',
    items: [
      { title: 'GoHighLevel integration', detail: 'Connect locations and automate issuance from CRM activity.' },
      { title: 'Webhook mapping', detail: 'Map inbound events to pass actions without custom middleware.' },
      { title: 'Embeddable session endpoints', detail: 'Power native signup/claim touchpoints in your own pages.' },
    ],
  },
  {
    title: 'Security + reliability',
    items: [
      { title: 'Hosted API hardening', detail: 'Rate limiting, validation, and production guardrails built in.' },
      { title: 'Failure handling', detail: 'Retry and fallback flows for wallet update/reminder jobs.' },
      { title: 'Auditability', detail: 'Operational logs and admin controls for critical config changes.' },
    ],
  },
  {
    title: 'Support',
    items: [
      { title: 'Email support', detail: 'Direct help for implementation and incident triage.' },
      { title: 'Launch guidance', detail: 'Get to first live campaign quickly with proven defaults.' },
      { title: 'High-volume path', detail: 'Book a demo for custom limits, onboarding, and SLA discussions.' },
    ],
  },
];

export const faqs: FaqItem[] = [
  {
    question: 'What is the difference between monthly and yearly billing?',
    answer: 'Both include the same Pro features. Yearly billing gives a lower effective monthly price and is billed once per year.',
  },
  {
    question: 'Do you offer a free trial?',
    answer: 'No free trial currently. You can get started immediately on the Pro plan and launch quickly with guided setup.',
  },
  {
    question: 'What happens if I exceed my included monthly volume?',
    answer: 'Usage is tracked monthly. If you regularly exceed limits, we will guide you to a higher-volume setup through our demo path.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. You can cancel from your billing settings, and your plan remains active through the current billing period.',
  },
  {
    question: 'How long does setup take?',
    answer: 'Most teams can configure templates and launch their first pass-enabled flow the same day.',
  },
  {
    question: 'Which support channels are included?',
    answer: 'Email support is included for all Pro customers, with escalation support for production-impacting issues.',
  },
  {
    question: 'Do you support agencies managing multiple clients?',
    answer: 'Yes. Agencies can manage multiple workflows and accounts; contact us for high-volume and advanced onboarding needs.',
  },
  {
    question: 'Can I book a demo before purchasing?',
    answer: 'Yes. If you need a walkthrough, architecture review, or volume planning, use the Book demo option.',
  },
];

export const ctaTargets = {
  getStarted: '/login',
  bookDemo: '/dashboard/support',
};
