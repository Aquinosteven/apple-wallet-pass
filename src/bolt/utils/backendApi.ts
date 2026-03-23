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
  subscriptionId: string;
  provider: string;
  planCode: string;
  canAccessDashboard: boolean;
  requiresPayment: boolean;
  trialActive: boolean;
  trialEndsAt: string | null;
  subscriptionStatus: string;
  accountBillingState: string;
}

export interface CheckoutSessionResponse {
  provider: string;
  checkoutUrl: string | null;
  sessionId: string | null;
  live: boolean;
  error?: string;
  accountId: string;
  planCode: string;
}

interface ApiRequestInit extends RequestInit {
  body?: string;
}

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
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
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
    subscriptionId: payload.subscriptionId,
    provider: payload.provider,
    planCode: payload.planCode,
    canAccessDashboard: payload.canAccessDashboard,
    requiresPayment: payload.requiresPayment,
    trialActive: payload.trialActive,
    trialEndsAt: payload.trialEndsAt,
    subscriptionStatus: payload.subscriptionStatus,
    accountBillingState: payload.accountBillingState,
  };
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
    checkoutUrl: payload.checkoutUrl,
    sessionId: payload.sessionId,
    live: payload.live,
    error: payload.error,
    accountId: payload.accountId,
    planCode: payload.planCode,
  };
}
