import type { EventStatus } from '../pages/dashboard/components/EventCard';
import type { EventDetailsData } from '../pages/dashboard/wizard/EventDetailsStep';
import type { TicketDesignData } from '../pages/dashboard/wizard/TicketDesignStep';
import { supabase } from '../../lib/supabaseClient';

export interface ApiEvent {
  id: string;
  name: string;
  date?: string;
  time?: string;
  timezone?: string;
  startsAt?: string | null;
  description?: string;
  status: EventStatus;
  ticketPublished: boolean;
  ticketsIssued: number;
  walletAdds: number;
  checkIns: number;
  lastIssuedAt?: string;
}

export interface ApiTicketDesign {
  id?: string;
  eventId: string;
  backgroundColor: string;
  barcodeEnabled: boolean;
  logoUrl?: string | null;
  stripUrl?: string | null;
}

export interface ApiRegistrant {
  id: string;
  eventId: string;
  eventName: string;
  attendeeName: string;
  email: string;
  phone?: string | null;
  source?: string | null;
  issuedAt: string;
  issuedAtLabel: string;
  status: 'issued' | 'added' | 'checked_in' | 'expired';
  passId?: string | null;
  claimToken?: string | null;
  claimedAt?: string | null;
  passStatus?: string | null;
}

export interface GhlWebhookLog {
  id: string;
  processing_status: 'received' | 'processed' | 'failed' | 'duplicate';
  is_test: boolean;
  webhook_received: boolean;
  pass_created: boolean;
  claim_link_created: boolean;
  ghl_writeback_ok: boolean;
  error_message: string | null;
  contact_id: string | null;
  location_id: string | null;
  event_id: string | null;
  tag: string | null;
  claim_url: string | null;
  created_at: string;
}

export interface GhlIntegrationStatus {
  connected: boolean;
  locationId: string | null;
  apiKeyMasked: string | null;
  defaultEventId: string | null;
  lastWebhookAt: string | null;
  lastError: string | null;
  logs: GhlWebhookLog[];
}

export interface WorkspaceSummary {
  id: string;
  slug: string;
  name: string;
  billingState: string;
  workspaceKind: 'primary' | 'client';
  workspaceStatus: 'active' | 'archived';
  isPrimaryWorkspace: boolean;
}

export interface AccountContextResponse {
  organizationId: string | null;
  organizationName: string | null;
  organizationSlug: string | null;
  organizationType: 'solo' | 'agency';
  organizationBillingState: string | null;
  organizationPlanCode: string | null;
  membershipRole: string;
  activeWorkspaceId: string | null;
  activeWorkspaceSlug: string | null;
  activeWorkspaceName: string | null;
  requiresWorkspaceSelection: boolean;
  softWorkspaceLimit: number | null;
  workspaces: WorkspaceSummary[];
}

export interface GhlTestResult {
  webhookReceived: boolean;
  passCreated: boolean;
  claimLinkCreated: boolean;
  ghlWriteback: {
    attempted: boolean;
    ok: boolean;
    error: string | null;
  };
  claimUrl?: string | null;
  passId?: string | null;
  claimToken?: string | null;
  eventId?: string | null;
  locationId?: string | null;
  contactId?: string | null;
  isSelfTest?: boolean;
}

export interface OpsHealthBadge {
  key: string;
  label: string;
  value: number;
  tone: 'ok' | 'warn' | 'error';
}

export interface OpsHealthSummary {
  severity: 'healthy' | 'warn' | 'error';
  badges: OpsHealthBadge[];
  issuedCount: number;
  eventId: string | null;
}

export interface OpsErrorItem {
  id: string;
  event_id: string | null;
  pass_id: string | null;
  scope: string;
  severity: 'warn' | 'error';
  message: string;
  metadata: Record<string, unknown>;
  resolved_at: string | null;
  created_at: string;
}

export interface DashboardMetricPoint {
  date: string;
  passesIssued: number;
  walletAdds: number;
  reminderSends: number;
}

export interface DashboardMetrics {
  range: {
    start: string;
    end: string;
    defaultWindow: string;
  };
  totals: {
    passesIssued: number;
    walletAdds: number;
    reminderSends: number;
  };
  series: DashboardMetricPoint[];
  ops?: {
    writebackSuccessRate: number | null;
    warnings: string[];
  };
}

export interface DataExportHistoryItem {
  id: string;
  format: 'csv' | 'xlsx';
  scope: 'filtered' | 'full';
  filters: Record<string, unknown>;
  rowCount: number;
  createdAt: string;
  expiresAt: string;
  status: 'ready' | 'failed' | 'expired';
}

export interface AdminJob {
  id: string;
  owner_user_id: string;
  job_type: string;
  status: string;
  error_message: string | null;
  attempt_count: number;
  created_at: string;
  updated_at: string;
  replayed_from_id: string | null;
}

export interface CustomerAccountRow {
  id: string;
  owner_user_id: string;
  owner_email?: string | null;
  slug: string;
  name: string;
  billing_state: 'trial' | 'active' | 'past_due' | 'canceled';
  enforcement_enabled: boolean;
  hard_block_issuance: boolean;
  monthly_included_issuances: number;
  created_at: string;
  updated_at: string;
  is_paid: boolean;
  internal?: boolean;
  subscription: {
    provider: string | null;
    provider_customer_id: string | null;
    plan_code: string | null;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    metadata?: Record<string, unknown>;
  };
  usage: {
    usage_month: string;
    issuances_count: number;
    overage_count: number;
    blocked_count: number;
    last_issued_at: string | null;
    passes_total: number;
    passes_claimed_total: number;
    passes_last_30_days: number;
    issuance_requests_total: number;
    issuance_requests_completed: number;
    issuance_requests_failed: number;
    issuance_requests_last_30_days: number;
    last_pass_created_at: string | null;
    last_claimed_at: string | null;
  };
  onboarding: {
    email_confirmed_at: string | null;
    last_sign_in_at: string | null;
    integration_connected: boolean;
    integration_verified_at: string | null;
    last_webhook_at: string | null;
    last_error: string | null;
    event_count: number;
    published_event_count: number;
    latest_event_updated_at: string | null;
  };
  support: {
    open_tickets: number;
    last_ticket_at: string | null;
    last_ticket_subject: string | null;
  };
  customer_touch: {
    last_touched_at: string | null;
    last_touch_summary: string | null;
    touch_count: number;
  };
  health: {
    status: 'healthy' | 'watch' | 'at_risk';
    summary: string;
    reasons: string[];
    onboarding_blockers: string[];
    next_action: string;
    account_age_days: number;
    activated: boolean;
  };
}

export interface AuditLogRow {
  id: string;
  actor_user_id: string | null;
  owner_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminPanelResponse {
  role: 'owner' | 'support_internal';
  adminRole?: 'owner' | 'support_read' | 'support_write' | 'admin_super';
  ownerScope: string;
  promoCounter: {
    claimed: number;
    cap: number;
    remaining: number;
    source: {
      baselineClaimed: number;
      claimedFromData: number;
    };
  };
  planHooks: Record<string, unknown>;
  failedJobs: AdminJob[];
  auditLogs: AuditLogRow[];
  customerAccounts: CustomerAccountRow[];
  overview?: AdminOverviewResponse;
}

export type AdminRole = 'owner' | 'support_read' | 'support_write' | 'admin_super';

export interface AdminSessionResponse {
  isAdmin: boolean;
  role: AdminRole;
  legacyRole: 'owner' | 'support_internal';
  user: {
    id: string;
    email: string | null;
  };
}

export interface AdminOverviewResponse {
  kpis: {
    activeAccounts: number;
    trialAccounts: number;
    pastDueAccounts: number;
    canceledAccounts: number;
    failedJobs: number;
    openSupportTickets: number;
    recentSignups: number;
    paidAccounts: number;
    healthyPaidAccounts: number;
    watchPaidAccounts: number;
    atRiskPaidAccounts: number;
  };
  needsAttention: {
    pastDueAccounts: CustomerAccountRow[];
    atRiskPaidAccounts: CustomerAccountRow[];
    failedJobs: AdminJob[];
    recentErrors: AuditLogRow[];
  };
}

export interface AdminAccountDetailResponse {
  account: CustomerAccountRow;
  notes: AdminNoteRow[];
  tickets: SupportTicketRow[];
  auditLogs: AuditLogRow[];
  timeline: Array<{
    id: string;
    type: 'audit' | 'support' | 'note';
    created_at: string;
    summary: string;
    metadata: Record<string, unknown>;
  }>;
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  providers: string[];
  account: {
    id: string;
    name: string;
    slug: string;
    billing_state: string;
  } | null;
}

export interface AdminBillingRow {
  account_id: string;
  account_name: string;
  account_slug: string;
  owner_user_id: string;
  owner_email: string | null;
  billing_state: string;
  provider: string | null;
  provider_customer_id: string | null;
  plan_code: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  enforcement_enabled: boolean;
  hard_block_issuance: boolean;
  monthly_included_issuances: number;
}

export interface AdminNoteRow {
  id: string;
  scope: 'account' | 'user' | 'ticket';
  target_id: string;
  body: string;
  author_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface ImpersonationSessionResponse {
  id: string;
  actor_user_id: string;
  target_user_id: string | null;
  target_account_id: string | null;
  reason: string;
  mode: string;
  issued_at: string;
  expires_at: string;
  ended_at: string | null;
}

export interface SupportTicketInput {
  requesterName: string;
  requesterEmail: string;
  subject: string;
  message: string;
}

export interface SupportTicketRow {
  id: string;
  owner_user_id: string;
  requester_name: string;
  requester_email: string;
  subject: string;
  message: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface BillingStatus {
  accountId: string;
  accountSlug: string;
  organizationId?: string | null;
  organizationType?: 'solo' | 'agency';
  organizationPlanCode?: string | null;
  workspaceCount?: number;
  subscriptionId: string;
  provider: string;
  planCode: string;
  canAccessDashboard: boolean;
  requiresPayment: boolean;
  trialActive: boolean;
  trialEndsAt: string | null;
  subscriptionStatus: string;
  accountBillingState: string;
  cancelAtPeriodEnd: boolean;
  cancelRequestedAt: string | null;
  cancellationPending: boolean;
  cancellationEffective: boolean;
  accessEndsAt: string | null;
  exitSurvey: Record<string, unknown> | null;
  checkoutPaused: boolean;
  checkoutPauseMessage: string | null;
  squareApplicationId: string | null;
  squareLocationId: string | null;
  squareEnvironment: string | null;
}

export interface CheckoutSessionResponse {
  provider: string;
  checkoutMode: 'embedded' | 'redirect';
  checkoutUrl: string | null;
  sessionId: string | null;
  live: boolean;
  error?: string;
  accountId: string;
  planCode: string;
  amountCents: number;
  currency: string;
  squareApplicationId: string | null;
  squareLocationId: string | null;
  squareEnvironment: string | null;
}

export interface BillingPaymentResponse {
  provider: string;
  paymentId: string;
  orderId: string | null;
  receiptUrl: string | null;
  status: string | null;
  accountId: string;
  planCode: string;
  canAccessDashboard: boolean;
}

export interface BillingPaymentMethodResponse {
  cardId: string;
  subscriptionId: string;
  status: string | null;
}

interface ApiRequestInit extends RequestInit {
  body?: string;
}

const ACTIVE_ACCOUNT_STORAGE_KEY = 'showfi_active_account_id';

async function getAccessTokenOrThrow(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(`Failed to get auth session: ${error.message}`);
  }

  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Missing auth session. Please sign in again.');
  }

  return token;
}

function getActiveAccountId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);
    return value ? value.trim() : null;
  } catch {
    return null;
  }
}

export function setActiveAccountId(accountId: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (accountId) {
      window.localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, accountId);
    } else {
      window.localStorage.removeItem(ACTIVE_ACCOUNT_STORAGE_KEY);
    }
  } catch {
    // Non-blocking when storage is unavailable.
  }
}

function mapStatusToUi(status: string | undefined): EventStatus {
  if (status === 'draft') return 'draft';
  if (status === 'published') return 'ready';
  if (status === 'active') return 'active';
  if (status === 'ended') return 'ended';
  if (status === 'ready') return 'ready';
  return 'draft';
}

function mapStatusToApi(status: EventStatus): 'draft' | 'published' {
  return status === 'draft' ? 'draft' : 'published';
}

function mapEventResponse(event: ApiEvent): ApiEvent {
  return {
    ...event,
    startsAt: event.startsAt ?? null,
    status: mapStatusToUi(String(event.status || 'draft')),
  };
}

async function requestJson<T>(url: string, init: ApiRequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function asArray<T>(payload: T | T[] | null): T[] {
  if (!payload) return [];
  return Array.isArray(payload) ? payload : [payload];
}

async function authedRequestJson<T>(url: string, init: ApiRequestInit): Promise<T | null> {
  const token = await getAccessTokenOrThrow();

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  const activeAccountId = getActiveAccountId();
  if (activeAccountId) {
    headers.set('x-showfi-account-id', activeAccountId);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return requestJson<T>(url, {
    ...init,
    headers,
  });
}

async function authedRequestOrThrow<T>(url: string, init: ApiRequestInit): Promise<T> {
  const token = await getAccessTokenOrThrow();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  const activeAccountId = getActiveAccountId();
  if (activeAccountId) {
    headers.set('x-showfi-account-id', activeAccountId);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...init, headers });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (payload && typeof payload === 'object' && 'error' in payload)
      ? String(payload.error)
      : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

async function authedDownloadBlob(url: string): Promise<Blob> {
  const token = await getAccessTokenOrThrow();
  const activeAccountId = getActiveAccountId();
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(activeAccountId ? { 'x-showfi-account-id': activeAccountId } : {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = (payload && typeof payload === 'object' && 'error' in payload)
      ? String(payload.error)
      : `Download failed (${response.status})`;
    throw new Error(message);
  }

  return response.blob();
}

function toIsoDate(dateValue: string): string | undefined {
  if (!dateValue) return undefined;
  const parsed = Date.parse(dateValue);
  if (Number.isNaN(parsed)) return dateValue;
  return new Date(parsed).toISOString();
}

function toDisplayDate(dateValue: string | undefined): string | undefined {
  if (!dateValue) return undefined;
  const parsed = Date.parse(dateValue);
  if (Number.isNaN(parsed)) return dateValue;
  return new Date(parsed).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function deriveStatus(eventDetails: EventDetailsData, isPublished: boolean): EventStatus {
  if (isPublished) return 'ready';
  return eventDetails.name.trim() ? 'draft' : 'draft';
}

export function mapEventForApi(
  eventDetails: EventDetailsData,
  options?: { id?: string; isPublished?: boolean },
): ApiEvent {
  return {
    id: options?.id ?? crypto.randomUUID(),
    name: eventDetails.name.trim() || 'Untitled Event',
    date: toDisplayDate(eventDetails.startDate) ?? toDisplayDate(eventDetails.endDate),
    time: eventDetails.startTime || undefined,
    timezone: eventDetails.timezone || undefined,
    description: eventDetails.description || undefined,
    status: deriveStatus(eventDetails, Boolean(options?.isPublished)),
    ticketPublished: Boolean(options?.isPublished),
    ticketsIssued: 0,
    walletAdds: 0,
    checkIns: 0,
    lastIssuedAt: undefined,
  };
}

export function mapTicketDesignForApi(eventId: string, design: TicketDesignData): ApiTicketDesign {
  return {
    eventId,
    backgroundColor: design.backgroundColor,
    barcodeEnabled: design.showQr,
    logoUrl: design.logoUrl,
    stripUrl: design.stripUrl,
  };
}

export async function listEvents(): Promise<ApiEvent[]> {
  const payload = await authedRequestJson<ApiEvent[] | ApiEvent>('/api/events', { method: 'GET' });
  return asArray(payload).map(mapEventResponse);
}

export async function getEventById(eventId: string): Promise<ApiEvent | null> {
  const payload = await authedRequestJson<ApiEvent[] | ApiEvent>(
    `/api/events?eventId=${encodeURIComponent(eventId)}`,
    { method: 'GET' },
  );
  const events = asArray(payload);
  const match = events.find((event) => event.id === eventId) ?? events[0] ?? null;
  return match ? mapEventResponse(match) : null;
}

export async function createEvent(event: ApiEvent): Promise<ApiEvent | null> {
  const payload = await authedRequestJson<ApiEvent>('/api/events', {
    method: 'POST',
    body: JSON.stringify({
      ...event,
      status: mapStatusToApi(event.status),
      startDate: toIsoDate(event.date || ''),
    }),
  });
  return payload ? mapEventResponse(payload) : null;
}

export async function updateEvent(event: ApiEvent): Promise<ApiEvent | null> {
  const payload = await authedRequestJson<ApiEvent>('/api/events', {
    method: 'PUT',
    body: JSON.stringify({
      ...event,
      status: mapStatusToApi(event.status),
      startDate: toIsoDate(event.date || ''),
    }),
  });
  return payload ? mapEventResponse(payload) : null;
}

export async function deleteEvent(eventId: string): Promise<void> {
  await authedRequestOrThrow<{ ok: boolean }>(`/api/events?eventId=${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
  });
}

export async function getTicketDesignByEventId(eventId: string): Promise<ApiTicketDesign | null> {
  return authedRequestJson<ApiTicketDesign>(
    `/api/ticket-designs?eventId=${encodeURIComponent(eventId)}`,
    { method: 'GET' },
  );
}

export async function createTicketDesign(ticketDesign: ApiTicketDesign): Promise<ApiTicketDesign | null> {
  return authedRequestJson<ApiTicketDesign>('/api/ticket-designs', {
    method: 'POST',
    body: JSON.stringify(ticketDesign),
  });
}

export async function updateTicketDesign(ticketDesign: ApiTicketDesign): Promise<ApiTicketDesign | null> {
  return authedRequestJson<ApiTicketDesign>('/api/ticket-designs', {
    method: 'PUT',
    body: JSON.stringify(ticketDesign),
  });
}

export async function listRegistrants(eventId?: string): Promise<ApiRegistrant[]> {
  const suffix = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
  const payload = await authedRequestOrThrow<{ ok: boolean; registrants?: ApiRegistrant[] }>(`/api/registrants${suffix}`, {
    method: 'GET',
  });
  return Array.isArray(payload.registrants) ? payload.registrants : [];
}

export async function createRegistrant(input: {
  eventId: string;
  name: string;
  email: string;
  phone?: string;
  source?: string;
}): Promise<ApiRegistrant> {
  const payload = await authedRequestOrThrow<{ ok: boolean; registrant: ApiRegistrant }>('/api/registrants', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.registrant;
}

export async function checkInRegistrant(passId: string): Promise<ApiRegistrant> {
  const payload = await authedRequestOrThrow<{ ok: boolean; registrant: ApiRegistrant }>('/api/registrants', {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'check_in',
      passId,
    }),
  });
  return payload.registrant;
}

export async function connectGhlApiKey(input: {
  apiKey?: string;
  verify?: boolean;
  defaultEventId?: string | null;
}): Promise<{
  connected: boolean;
  locationId: string | null;
  apiKeyMasked: string | null;
  verifiedAt?: string | null;
}> {
  return authedRequestOrThrow('/api/integrations/ghl/connect', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getGhlIntegrationStatus(): Promise<GhlIntegrationStatus> {
  return authedRequestOrThrow<GhlIntegrationStatus>('/api/integrations/ghl/status', {
    method: 'GET',
  });
}

export async function getAccountContext(): Promise<AccountContextResponse> {
  const payload = await authedRequestOrThrow<{ ok: boolean } & AccountContextResponse>('/api/account/context', {
    method: 'GET',
  });

  if (payload.activeWorkspaceId) {
    setActiveAccountId(payload.activeWorkspaceId);
  }

  return payload;
}

export async function createWorkspace(input: { name: string }): Promise<AccountContextResponse> {
  const payload = await authedRequestOrThrow<{ ok: boolean } & AccountContextResponse>('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (payload.activeWorkspaceId) {
    setActiveAccountId(payload.activeWorkspaceId);
  }

  return payload;
}

export async function runGhlIntegrationTest(input: {
  contactId?: string;
  locationId?: string;
  eventId?: string;
}): Promise<{ ok: boolean; result: GhlTestResult }> {
  return authedRequestOrThrow('/api/integrations/ghl/test', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getOpsHealthSummary(eventId?: string): Promise<OpsHealthSummary | null> {
  const suffix = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
  return authedRequestJson<OpsHealthSummary>(`/api/ops/health${suffix}`, {
    method: 'GET',
  });
}

export async function getOpsErrorFeed(eventId?: string): Promise<OpsErrorItem[]> {
  const suffix = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
  const payload = await authedRequestJson<{ ok: boolean; items?: OpsErrorItem[] }>(
    `/api/ops/errors${suffix}`,
    { method: 'GET' },
  );
  if (!payload || !Array.isArray(payload.items)) return [];
  return payload.items;
}

export async function getDashboardMetrics(input?: {
  start?: string;
  end?: string;
  ownerUserId?: string;
}): Promise<DashboardMetrics> {
  const params = new URLSearchParams();
  if (input?.start) params.set('start', input.start);
  if (input?.end) params.set('end', input.end);
  if (input?.ownerUserId) params.set('ownerUserId', input.ownerUserId);
  const query = params.toString();
  const payload = await authedRequestOrThrow<{ ok: boolean } & DashboardMetrics>(
    `/api/dashboard-metrics${query ? `?${query}` : ''}`,
    { method: 'GET' },
  );
  if (!payload) {
    throw new Error('Reporting metrics returned an empty response');
  }
  return {
    range: payload.range,
    totals: payload.totals,
    series: payload.series,
    ops: payload.ops,
  };
}

export async function listDataExports(ownerUserId?: string): Promise<DataExportHistoryItem[]> {
  const params = new URLSearchParams();
  if (ownerUserId) params.set('ownerUserId', ownerUserId);
  const payload = await authedRequestOrThrow<{ ok: boolean; history: DataExportHistoryItem[] }>(
    `/api/exports${params.toString() ? `?${params.toString()}` : ''}`,
    { method: 'GET' },
  );
  if (!payload) {
    throw new Error('Export history returned an empty response');
  }
  return payload.history || [];
}

export async function createDataExport(input: {
  format: 'csv' | 'xlsx';
  scope: 'filtered' | 'full';
  filters?: {
    start?: string;
    end?: string;
    eventId?: string;
  };
  ownerUserId?: string;
}): Promise<DataExportHistoryItem> {
  const payload = await authedRequestOrThrow<{ ok: boolean; export: DataExportHistoryItem }>(
    '/api/exports',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  if (!payload?.export) {
    throw new Error('Export creation returned an empty response');
  }
  return payload.export;
}

export async function downloadDataExport(exportId: string, ownerUserId?: string): Promise<Blob> {
  const params = new URLSearchParams();
  params.set('downloadId', exportId);
  if (ownerUserId) params.set('ownerUserId', ownerUserId);
  return authedDownloadBlob(`/api/exports?${params.toString()}`);
}

export async function getAdminPanel(ownerUserId?: string): Promise<AdminPanelResponse> {
  const params = new URLSearchParams();
  if (ownerUserId) params.set('ownerUserId', ownerUserId);
  const payload = await authedRequestOrThrow<{ ok: boolean } & AdminPanelResponse>(
    `/api/admin${params.toString() ? `?${params.toString()}` : ''}`,
    { method: 'GET' },
  );
  if (!payload) {
    throw new Error('Admin panel returned an empty response');
  }
  return {
    role: payload.role,
    ownerScope: payload.ownerScope,
    promoCounter: payload.promoCounter,
    planHooks: payload.planHooks,
    failedJobs: payload.failedJobs,
    auditLogs: payload.auditLogs,
    customerAccounts: payload.customerAccounts || [],
  };
}

export async function updatePromoCounter(input: { claimed: number; cap?: number }): Promise<{
  claimed: number;
  cap: number;
}> {
  const payload = await authedRequestOrThrow<{
    ok: boolean;
    promoCounter: { claimed: number; cap: number };
  }>('/api/admin', {
    method: 'POST',
    body: JSON.stringify({
      action: 'promo.override',
      ...input,
    }),
  });
  return payload.promoCounter;
}

export async function updatePlanHooks(value: Record<string, unknown>): Promise<Record<string, unknown>> {
  const payload = await authedRequestOrThrow<{
    ok: boolean;
    planHooks: Record<string, unknown>;
  }>('/api/admin', {
    method: 'POST',
    body: JSON.stringify({
      action: 'plan_limits.update',
      value,
    }),
  });
  return payload.planHooks;
}

export async function retryAdminJob(jobId: string): Promise<{ id: string; status: string }> {
  const payload = await authedRequestOrThrow<{
    ok: boolean;
    queuedJob: { id: string; status: string };
  }>('/api/admin', {
    method: 'POST',
    body: JSON.stringify({
      action: 'jobs.retry',
      jobId,
    }),
  });
  return payload.queuedJob;
}

export async function updateCustomerAccountService(input: {
  accountId: string;
  billingState: 'trial' | 'active' | 'past_due' | 'canceled';
  monthlyIncludedIssuances: number;
  enforcementEnabled: boolean;
  hardBlockIssuance: boolean;
  planCode?: string;
  reason?: string;
}): Promise<{
  id: string;
  owner_user_id: string;
  billing_state: string;
  monthly_included_issuances: number;
  enforcement_enabled: boolean;
  hard_block_issuance: boolean;
}> {
  const payload = await authedRequestOrThrow<{
    ok: boolean;
    account: {
      id: string;
      owner_user_id: string;
      billing_state: string;
      monthly_included_issuances: number;
      enforcement_enabled: boolean;
      hard_block_issuance: boolean;
    };
  }>('/api/admin', {
    method: 'POST',
    body: JSON.stringify({
      action: 'account.service.update',
      reason: input.reason || 'Manual admin service update',
      ...input,
    }),
  });

  return payload.account;
}

export async function getAdminSession(): Promise<AdminSessionResponse> {
  const payload = await authedRequestOrThrow<{ ok: boolean } & AdminSessionResponse>('/api/admin/session', {
    method: 'GET',
  });
  return {
    isAdmin: payload.isAdmin,
    role: payload.role,
    legacyRole: payload.legacyRole,
    user: payload.user,
  };
}

export async function getAdminOverview(): Promise<AdminOverviewResponse> {
  const payload = await authedRequestOrThrow<{ ok: boolean } & AdminOverviewResponse>('/api/admin/overview', {
    method: 'GET',
  });
  return {
    kpis: payload.kpis,
    needsAttention: payload.needsAttention,
  };
}

export async function listAdminAccounts(input?: {
  q?: string;
  status?: string;
  limit?: number;
  realOnly?: boolean;
  paidOnly?: boolean;
}): Promise<CustomerAccountRow[]> {
  const params = new URLSearchParams();
  if (input?.q) params.set('q', input.q);
  if (input?.status) params.set('status', input.status);
  if (input?.limit) params.set('limit', String(input.limit));
  if (input?.realOnly !== undefined) params.set('realOnly', input.realOnly ? 'true' : 'false');
  if (input?.paidOnly !== undefined) params.set('paidOnly', input.paidOnly ? 'true' : 'false');
  const payload = await authedRequestOrThrow<{ ok: boolean; accounts: CustomerAccountRow[] }>(
    `/api/admin/accounts${params.toString() ? `?${params.toString()}` : ''}`,
    { method: 'GET' },
  );
  return payload.accounts || [];
}

export async function getAdminAccountDetail(accountId: string): Promise<AdminAccountDetailResponse> {
  const payload = await authedRequestOrThrow<{ ok: boolean } & AdminAccountDetailResponse>(
    `/api/admin/accounts/${encodeURIComponent(accountId)}`,
    { method: 'GET' },
  );
  return payload;
}

export async function patchAdminAccount(accountId: string, input: {
  billingState: 'trial' | 'active' | 'past_due' | 'canceled';
  monthlyIncludedIssuances: number;
  enforcementEnabled: boolean;
  hardBlockIssuance: boolean;
  planCode?: string;
  reason: string;
}): Promise<void> {
  await authedRequestOrThrow<{ ok: boolean }>(`/api/admin/accounts/${encodeURIComponent(accountId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function listAdminUsers(q?: string): Promise<AdminUserRow[]> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  const payload = await authedRequestOrThrow<{ ok: boolean; users: AdminUserRow[] }>(
    `/api/admin/users${params.toString() ? `?${params.toString()}` : ''}`,
    { method: 'GET' },
  );
  return payload.users || [];
}

export async function resetAdminUserPassword(userId: string, input: {
  reason: string;
  temporaryPassword?: string;
}): Promise<{ temporaryPassword: string; user: { id: string; email: string | null } }> {
  const payload = await authedRequestOrThrow<{
    ok: boolean;
    temporaryPassword: string;
    user: { id: string; email: string | null };
  }>(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return {
    temporaryPassword: payload.temporaryPassword,
    user: payload.user,
  };
}

export async function listAdminBilling(input?: {
  q?: string;
  status?: string;
}): Promise<AdminBillingRow[]> {
  const params = new URLSearchParams();
  if (input?.q) params.set('q', input.q);
  if (input?.status) params.set('status', input.status);
  const payload = await authedRequestOrThrow<{ ok: boolean; subscriptions: AdminBillingRow[] }>(
    `/api/admin/billing${params.toString() ? `?${params.toString()}` : ''}`,
    { method: 'GET' },
  );
  return payload.subscriptions || [];
}

export async function listAdminSupport(input?: {
  q?: string;
  status?: string;
}): Promise<{ tickets: SupportTicketRow[]; notes: AdminNoteRow[] }> {
  const params = new URLSearchParams();
  if (input?.q) params.set('q', input.q);
  if (input?.status) params.set('status', input.status);
  const payload = await authedRequestOrThrow<{ ok: boolean; tickets: SupportTicketRow[]; notes: AdminNoteRow[] }>(
    `/api/admin/support${params.toString() ? `?${params.toString()}` : ''}`,
    { method: 'GET' },
  );
  return {
    tickets: payload.tickets || [],
    notes: payload.notes || [],
  };
}

export async function updateAdminSupportTicket(ticketId: string, input: {
  status?: string;
  assigneeUserId?: string;
  labels?: string[];
  reason: string;
}): Promise<void> {
  await authedRequestOrThrow<{ ok: boolean }>(`/api/admin/support/${encodeURIComponent(ticketId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function getAdminOperations(): Promise<{
  failedJobs: AdminJob[];
  recentAudit: AuditLogRow[];
  recentFailures: AuditLogRow[];
  openSupportTickets: SupportTicketRow[];
}> {
  const payload = await authedRequestOrThrow<{
    ok: boolean;
    failedJobs: AdminJob[];
    recentAudit: AuditLogRow[];
    recentFailures: AuditLogRow[];
    openSupportTickets: SupportTicketRow[];
  }>('/api/admin/operations', {
    method: 'GET',
  });
  return payload;
}

export async function retryAdminJobFromCenter(jobId: string, reason: string): Promise<{ id: string; status: string }> {
  const payload = await authedRequestOrThrow<{
    ok: boolean;
    queuedJob: { id: string; status: string };
  }>(`/api/admin/jobs/${encodeURIComponent(jobId)}/retry`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return payload.queuedJob;
}

export async function listAdminAudit(input?: {
  actorUserId?: string;
  action?: string;
  targetType?: string;
  since?: string;
  limit?: number;
}): Promise<AuditLogRow[]> {
  const params = new URLSearchParams();
  if (input?.actorUserId) params.set('actorUserId', input.actorUserId);
  if (input?.action) params.set('action', input.action);
  if (input?.targetType) params.set('targetType', input.targetType);
  if (input?.since) params.set('since', input.since);
  if (input?.limit) params.set('limit', String(input.limit));
  const payload = await authedRequestOrThrow<{ ok: boolean; auditLogs: AuditLogRow[] }>(
    `/api/admin/audit${params.toString() ? `?${params.toString()}` : ''}`,
    { method: 'GET' },
  );
  return payload.auditLogs || [];
}

export async function createAdminNote(input: {
  scope: 'account' | 'user' | 'ticket';
  targetId: string;
  body: string;
  reason: string;
  metadata?: Record<string, unknown>;
}): Promise<AdminNoteRow> {
  const payload = await authedRequestOrThrow<{ ok: boolean; note: AdminNoteRow }>('/api/admin/notes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.note;
}

export async function startAdminImpersonation(input: {
  targetUserId?: string;
  targetAccountId?: string;
  reason: string;
}): Promise<ImpersonationSessionResponse> {
  const payload = await authedRequestOrThrow<{ ok: boolean; session: ImpersonationSessionResponse }>('/api/admin/impersonation/start', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.session;
}

export async function endAdminImpersonation(input: {
  sessionId: string;
  reason: string;
}): Promise<void> {
  await authedRequestOrThrow<{ ok: boolean }>('/api/admin/impersonation/end', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listSupportTickets(ownerUserId?: string): Promise<SupportTicketRow[]> {
  const params = new URLSearchParams();
  if (ownerUserId) params.set('ownerUserId', ownerUserId);
  const payload = await authedRequestOrThrow<{ ok: boolean; tickets: SupportTicketRow[] }>(
    `/api/support${params.toString() ? `?${params.toString()}` : ''}`,
    { method: 'GET' },
  );
  if (!payload) {
    throw new Error('Support tickets returned an empty response');
  }
  return payload.tickets || [];
}

export async function createSupportTicket(input: SupportTicketInput & { ownerUserId?: string }): Promise<{
  ticket: SupportTicketRow;
  mail: {
    ok: boolean;
    provider: string;
    error: string | null;
  };
}> {
  const payload = await authedRequestOrThrow<{
    ok: boolean;
    ticket: SupportTicketRow;
    mail: {
      ok: boolean;
      provider: string;
      error: string | null;
    };
  }>('/api/support', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return {
    ticket: payload.ticket,
    mail: payload.mail,
  };
}

export async function getBillingStatus(): Promise<BillingStatus> {
  const payload = await authedRequestOrThrow<{ ok: boolean } & BillingStatus>('/api/billing/status', {
    method: 'GET',
  });

  return {
    accountId: payload.accountId,
    accountSlug: payload.accountSlug,
    organizationId: payload.organizationId,
    organizationType: payload.organizationType,
    organizationPlanCode: payload.organizationPlanCode,
    workspaceCount: payload.workspaceCount,
    subscriptionId: payload.subscriptionId,
    provider: payload.provider,
    planCode: payload.planCode,
    canAccessDashboard: payload.canAccessDashboard,
    requiresPayment: payload.requiresPayment,
    trialActive: payload.trialActive,
    trialEndsAt: payload.trialEndsAt,
    subscriptionStatus: payload.subscriptionStatus,
    accountBillingState: payload.accountBillingState,
    cancelAtPeriodEnd: payload.cancelAtPeriodEnd,
    cancelRequestedAt: payload.cancelRequestedAt,
    cancellationPending: payload.cancellationPending,
    cancellationEffective: payload.cancellationEffective,
    accessEndsAt: payload.accessEndsAt,
    exitSurvey: payload.exitSurvey,
    checkoutPaused: payload.checkoutPaused,
    checkoutPauseMessage: payload.checkoutPauseMessage,
    squareApplicationId: payload.squareApplicationId,
    squareLocationId: payload.squareLocationId,
    squareEnvironment: payload.squareEnvironment,
  };
}

export interface CancelBillingSubscriptionInput {
  reason: string;
  detail?: string;
  missingFeature?: string;
  wouldRecommend?: 'yes' | 'no' | 'not_sure';
}

export async function cancelBillingSubscription(input: CancelBillingSubscriptionInput): Promise<BillingStatus> {
  const payload = await authedRequestOrThrow<{ ok: boolean; billing: BillingStatus }>('/api/billing/cancel', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return payload.billing;
}

export async function resumeBillingSubscription(): Promise<BillingStatus> {
  const payload = await authedRequestOrThrow<{ ok: boolean; billing: BillingStatus }>('/api/billing/cancel', {
    method: 'DELETE',
  });
  return payload.billing;
}

export async function createBillingCheckoutSession(input: {
  planCode: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutSessionResponse> {
  const payload = await authedRequestOrThrow<CheckoutSessionResponse & { ok: boolean }>(
    '/api/billing/checkout-session',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  return {
    provider: payload.provider,
    checkoutMode: payload.checkoutMode,
    checkoutUrl: payload.checkoutUrl,
    sessionId: payload.sessionId,
    live: payload.live,
    error: payload.error,
    accountId: payload.accountId,
    planCode: payload.planCode,
    amountCents: payload.amountCents,
    currency: payload.currency,
    squareApplicationId: payload.squareApplicationId,
    squareLocationId: payload.squareLocationId,
    squareEnvironment: payload.squareEnvironment,
  };
}

export async function createBillingPayment(input: {
  planCode: string;
  sourceId: string;
}): Promise<BillingPaymentResponse> {
  const payload = await authedRequestOrThrow<BillingPaymentResponse & { ok: boolean }>(
    '/api/billing/payment',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  return {
    provider: payload.provider,
    paymentId: payload.paymentId,
    orderId: payload.orderId,
    receiptUrl: payload.receiptUrl,
    status: payload.status,
    accountId: payload.accountId,
    planCode: payload.planCode,
    canAccessDashboard: payload.canAccessDashboard,
  };
}

export async function updateBillingPaymentMethod(input: {
  sourceId: string;
  verificationToken?: string;
}): Promise<BillingPaymentMethodResponse> {
  const payload = await authedRequestOrThrow<BillingPaymentMethodResponse & { ok: boolean }>(
    '/api/billing/payment-method',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  return {
    cardId: payload.cardId,
    subscriptionId: payload.subscriptionId,
    status: payload.status,
  };
}
