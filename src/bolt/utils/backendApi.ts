import type { EventStatus } from '../pages/dashboard/components/EventCard';
import type { EventDetailsData } from '../pages/dashboard/wizard/EventDetailsStep';
import type { TicketDesignData } from '../pages/dashboard/wizard/TicketDesignStep';

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
  const payload = await requestJson<ApiEvent[] | ApiEvent>('/api/events', { method: 'GET' });
  return asArray(payload);
}

export async function getEventById(eventId: string): Promise<ApiEvent | null> {
  const payload = await requestJson<ApiEvent[] | ApiEvent>(
    `/api/events?eventId=${encodeURIComponent(eventId)}`,
    { method: 'GET' },
  );
  const events = asArray(payload);
  return events.find((event) => event.id === eventId) ?? events[0] ?? null;
}

export async function createEvent(event: ApiEvent): Promise<ApiEvent | null> {
  return requestJson<ApiEvent>('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...event,
      startDate: toIsoDate(event.date || ''),
    }),
  });
}

export async function updateEvent(event: ApiEvent): Promise<ApiEvent | null> {
  return requestJson<ApiEvent>('/api/events', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...event,
      startDate: toIsoDate(event.date || ''),
    }),
  });
}

export async function getTicketDesignByEventId(eventId: string): Promise<ApiTicketDesign | null> {
  return requestJson<ApiTicketDesign>(
    `/api/ticket-designs?eventId=${encodeURIComponent(eventId)}`,
    { method: 'GET' },
  );
}

export async function createTicketDesign(ticketDesign: ApiTicketDesign): Promise<ApiTicketDesign | null> {
  return requestJson<ApiTicketDesign>('/api/ticket-designs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticketDesign),
  });
}

export async function updateTicketDesign(ticketDesign: ApiTicketDesign): Promise<ApiTicketDesign | null> {
  return requestJson<ApiTicketDesign>('/api/ticket-designs', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticketDesign),
  });
}
