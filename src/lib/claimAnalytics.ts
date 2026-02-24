export type ClaimEventType =
  | 'claim_viewed'
  | 'claim_started'
  | 'pkpass_downloaded'
  | 'apple_wallet_added'
  | 'google_wallet_link_created'
  | 'google_wallet_saved'
  | 'claim_error';

export type TrackClaimEventPayload = {
  eventType: ClaimEventType;
  claimId?: string | null;
  passId?: string | null;
  eventId?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export async function trackClaimEvent(payload: TrackClaimEventPayload): Promise<void> {
  try {
    await fetch('/api/claim-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Swallow analytics failures.
  }
}
