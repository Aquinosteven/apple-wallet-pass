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
