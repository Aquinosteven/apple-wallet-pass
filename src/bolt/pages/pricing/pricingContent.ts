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

export interface PlanTier {
  code: string;
  name: string;
  badge: string;
  tagline: string;
  audience: string;
  values: Record<BillingInterval, PricingValue>;
  benefits: string[];
  ctaHref: string;
  ctaLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  featured?: boolean;
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

export const planTiers: PlanTier[] = [
  {
    code: 'solo',
    name: 'Solo',
    badge: 'Solo',
    tagline: 'For operators running one ShowFi workspace.',
    audience: 'Best for one business, one CRM location, and one working team.',
    values: {
      monthly: {
        amount: 97,
        currency: 'USD',
        cadenceLabel: '/month',
        billedLabel: 'Billed monthly',
        helperText: 'One workspace with the full pass issuance and reminder workflow.',
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
    },
    benefits: [
      'One ShowFi workspace',
      'One GoHighLevel connection',
      'Wallet pass issuance for campaigns and events',
      'Claim flow, attendee tracking, and dashboard reporting',
      'Email support and launch guidance',
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
    secondaryHref: 'mailto:hello@showfi.io?subject=ShowFi%20solo%20plan',
    secondaryLabel: 'Questions about solo?',
  },
  {
    code: 'agency',
    name: 'Agency',
    badge: 'Agency',
    tagline: 'For teams managing multiple client workspaces under one login.',
    audience: 'Built for agencies, operators, and service teams supporting multiple client CRMs.',
    values: {
      monthly: {
        amount: 497,
        currency: 'USD',
        cadenceLabel: '/month',
        billedLabel: 'Billed monthly',
        helperText: 'Agency account with multiple client workspaces and pooled usage.',
      },
      yearly: {
        amount: 4997,
        currency: 'USD',
        cadenceLabel: '/year',
        billedLabel: 'Billed annually at $4,997/year',
        helperText: 'Lower annual cost for agencies standardizing on ShowFi.',
        savingsText: 'Save $967/year',
        equivalentMonthly: 416.42,
      },
    },
    benefits: [
      'Multiple client workspaces under one organization',
      'Workspace-scoped GoHighLevel connections',
      'Shared team access at the organization level',
      'Pooled billing and internal workspace soft-cap tracking',
      'Agency-ready onboarding and priority sales support',
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Book Agency Demo',
    secondaryHref: 'mailto:hello@showfi.io?subject=ShowFi%20agency%20plan',
    secondaryLabel: 'Talk to sales',
    featured: true,
  },
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
      { title: 'GoHighLevel integration', detail: 'Connect CRM locations and automate issuance from contact activity.' },
      { title: 'Webhook mapping', detail: 'Map inbound events to pass actions without custom middleware.' },
      { title: 'Embeddable session endpoints', detail: 'Power native signup and claim touchpoints in your own pages.' },
    ],
  },
  {
    title: 'Agency operations',
    items: [
      { title: 'Client workspaces', detail: 'Keep each client CRM, event setup, and reporting boundary clean.' },
      { title: 'Workspace switching', detail: 'Move between client environments without sharing credentials.' },
      { title: 'Org-level controls', detail: 'Manage plan state and team access from one top-level organization.' },
    ],
  },
  {
    title: 'Security + reliability',
    items: [
      { title: 'Hosted API hardening', detail: 'Rate limiting, validation, and production guardrails built in.' },
      { title: 'Failure handling', detail: 'Retry and fallback flows for wallet update and reminder jobs.' },
      { title: 'Auditability', detail: 'Operational logs and admin controls for critical config changes.' },
    ],
  },
];

export const faqs: FaqItem[] = [
  {
    question: 'What is the difference between Solo and Agency?',
    answer: 'Solo is for one ShowFi workspace and one primary CRM connection. Agency adds a top-level organization with multiple client workspaces and workspace-scoped CRM connections.',
  },
  {
    question: 'What is the difference between monthly and yearly billing?',
    answer: 'Both billing options include the same features inside each tier. Yearly reduces the effective monthly cost and is billed once per year.',
  },
  {
    question: 'Do you offer a free trial?',
    answer: 'Not right now. New activations are paused temporarily, so join the waitlist and we will reach out when onboarding reopens.',
  },
  {
    question: 'Do agency plans include unlimited client workspaces?',
    answer: 'Agency plans use a soft cap in the product today, so you can create multiple client workspaces without hard blocking. We review usage with you if you grow well past the default threshold.',
  },
  {
    question: 'Can agencies connect multiple GoHighLevel accounts?',
    answer: 'Yes. Each client workspace can connect its own GoHighLevel location so client data and operations stay isolated.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. You can cancel from billing settings, and your plan remains active through the current billing period.',
  },
];

export const ctaTargets = {
  getStarted: '/waitlist',
  waitlist: '/waitlist',
  contactSales: 'mailto:hello@showfi.io?subject=ShowFi%20sales%20inquiry',
};
