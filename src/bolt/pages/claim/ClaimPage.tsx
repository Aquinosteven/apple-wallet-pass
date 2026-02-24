import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { trackClaimEvent } from '../../../lib/claimAnalytics';

type ClaimPreview = {
  passId?: string;
  eventId?: string;
  event: {
    title: string;
    date: string | null;
  };
  registrant: {
    name: string;
    email: string;
  };
};

type LoadState = 'loading' | 'ready' | 'error';
type ClaimState = 'idle' | 'submitting' | 'claimed';

type DeviceKind = 'ios' | 'android' | 'desktop';

function formatEventDate(date: string | null): string {
  if (!date) return 'Date to be announced';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Date to be announced';
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function detectDevice(): DeviceKind {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  const isiOS = /iphone|ipad|ipod/.test(ua);
  if (isiOS) return 'ios';
  const isAndroid = /android/.test(ua);
  if (isAndroid) return 'android';
  return 'desktop';
}

export default function ClaimPage() {
  const { token = '' } = useParams();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [claimPreview, setClaimPreview] = useState<ClaimPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [deviceKind, setDeviceKind] = useState<DeviceKind>('desktop');

  const safeToken = useMemo(() => token.trim(), [token]);

  useEffect(() => {
    setDeviceKind(detectDevice());
  }, []);

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        window.URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  useEffect(() => {
    let active = true;

    const loadClaim = async () => {
      setLoadState('loading');
      setError(null);

      if (!safeToken) {
        setLoadState('error');
        setError('Missing claim token.');
        return;
      }

      try {
        const response = await fetch(`/api/claim?token=${encodeURIComponent(safeToken)}`);
        const payload = (await response.json()) as { ok?: boolean; error?: string; claim?: ClaimPreview };

        if (!active) return;

        if (!response.ok || !payload.ok || !payload.claim) {
          setLoadState('error');
          setError(payload.error || 'Unable to load claim.');
          await trackClaimEvent({
            eventType: 'claim_error',
            claimId: safeToken,
            metadata: { source: 'claim_page_load', status: response.status },
          });
          return;
        }

        setClaimPreview(payload.claim);
        setLoadState('ready');
        await trackClaimEvent({
          eventType: 'claim_viewed',
          claimId: safeToken,
          passId: payload.claim.passId,
          eventId: payload.claim.eventId,
          metadata: { source: 'claim_page_load' },
        });
      } catch {
        if (!active) return;
        setLoadState('error');
        setError('Unable to load claim right now.');
      }
    };

    void loadClaim();

    return () => {
      active = false;
    };
  }, [safeToken]);

  const handleClaim = async () => {
    if (!safeToken || claimState !== 'idle' || !claimPreview) return;

    setClaimState('submitting');
    setError(null);

    await trackClaimEvent({
      eventType: 'claim_started',
      claimId: safeToken,
      passId: claimPreview.passId,
      eventId: claimPreview.eventId,
      metadata: { source: 'claim_cta' },
    });

    try {
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: safeToken }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { ok?: boolean; error?: string };
        setClaimState('idle');
        setError(payload.error || 'Unable to claim pass.');
        await trackClaimEvent({
          eventType: 'claim_error',
          claimId: safeToken,
          passId: claimPreview.passId,
          eventId: claimPreview.eventId,
          metadata: { source: 'claim_submit', status: response.status, error: payload.error || 'claim_failed' },
        });
        return;
      }

      const blob = await response.blob();
      const localUrl = window.URL.createObjectURL(blob);
      setDownloadUrl((previous) => {
        if (previous) window.URL.revokeObjectURL(previous);
        return localUrl;
      });
      setClaimState('claimed');
    } catch {
      setClaimState('idle');
      setError('Unable to claim pass right now.');
    }
  };

  const triggerDownload = async () => {
    if (!downloadUrl || !claimPreview) return;
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = 'event.pkpass';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    await trackClaimEvent({
      eventType: 'pkpass_downloaded',
      claimId: safeToken,
      passId: claimPreview.passId,
      eventId: claimPreview.eventId,
      metadata: { source: 'claim_success_download' },
    });
    await trackClaimEvent({
      eventType: 'apple_wallet_added',
      claimId: safeToken,
      passId: claimPreview.passId,
      eventId: claimPreview.eventId,
      metadata: { source: 'claim_success_apple_click', detectable: 'best_effort' },
    });
  };

  const handleGoogleWallet = async () => {
    if (!claimPreview) return;
    setGoogleLoading(true);
    setError(null);

    await trackClaimEvent({
      eventType: 'google_wallet_link_created',
      claimId: safeToken,
      passId: claimPreview.passId,
      eventId: claimPreview.eventId,
      metadata: { source: 'claim_success_google_click' },
    });

    try {
      const response = await fetch('/api/google-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header: claimPreview.event.title,
          cardTitle: claimPreview.registrant.name,
          subheader: 'ShowFi Pass',
          details: `${claimPreview.event.title} • ${claimPreview.registrant.email}`,
          claimId: safeToken,
          passId: claimPreview.passId,
          eventId: claimPreview.eventId,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; saveUrl?: string };
      if (!response.ok || !payload.ok || !payload.saveUrl) {
        setError(payload.error || 'Unable to open Google Wallet.');
        return;
      }

      window.open(payload.saveUrl, '_blank', 'noopener,noreferrer');
      await trackClaimEvent({
        eventType: 'google_wallet_saved',
        claimId: safeToken,
        passId: claimPreview.passId,
        eventId: claimPreview.eventId,
        metadata: { source: 'claim_success_google_opened' },
      });
    } catch {
      setError('Unable to open Google Wallet right now.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const isIOS = deviceKind === 'ios';
  const isAndroid = deviceKind === 'android';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-[560px] bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          {claimState === 'claimed' ? 'Pass ready' : 'Claim your ShowFi pass'}
        </h1>

        {loadState === 'loading' ? <p className="mt-4 text-sm text-gray-500">Loading claim details...</p> : null}

        {loadState === 'error' ? (
          <p className="mt-4 text-sm text-red-600">{error || 'Unable to load claim.'}</p>
        ) : null}

        {loadState === 'ready' && claimPreview ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Event</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{claimPreview.event.title}</p>
              <p className="mt-1 text-sm text-gray-600">{formatEventDate(claimPreview.event.date)}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Registrant</p>
              <p className="mt-1 text-base font-medium text-gray-900">{claimPreview.registrant.name}</p>
              <p className="text-sm text-gray-600">{claimPreview.registrant.email}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-medium text-gray-700">Checklist</p>
              <ol className="mt-2 space-y-1 text-sm text-gray-600">
                <li>1. Generate</li>
                <li>2. Add to Wallet</li>
                <li>3. Done</li>
              </ol>
            </div>

            {claimState !== 'claimed' ? (
              <button
                type="button"
                onClick={handleClaim}
                disabled={claimState === 'submitting'}
                className="btn-primary w-full min-h-12 disabled:cursor-not-allowed"
              >
                {claimState === 'submitting' ? 'Preparing pass...' : 'Continue / Claim'}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={isAndroid ? handleGoogleWallet : triggerDownload}
                    disabled={isAndroid ? googleLoading : false}
                    className={`w-full min-h-12 rounded-xl font-medium px-4 py-3 disabled:opacity-60 ${
                      isIOS || isAndroid
                        ? 'bg-black text-white'
                        : 'border border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    {isAndroid
                      ? googleLoading
                        ? 'Opening Google Wallet...'
                        : 'Add to Google Wallet'
                      : 'Add to Apple Wallet'}
                  </button>
                  <button
                    type="button"
                    onClick={isAndroid ? triggerDownload : handleGoogleWallet}
                    disabled={!isAndroid ? googleLoading : false}
                    className={`w-full min-h-12 rounded-xl font-medium px-4 py-3 disabled:opacity-60 ${
                      isIOS || isAndroid
                        ? 'border border-gray-300 bg-white text-gray-900'
                        : 'border border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    {isAndroid
                      ? 'Add to Apple Wallet'
                      : googleLoading
                        ? 'Opening Google Wallet...'
                        : 'Add to Google Wallet'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={triggerDownload}
                  className="w-full min-h-12 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 px-4 py-3"
                >
                  Download pass (.pkpass)
                </button>

                <p className="text-xs text-gray-500">
                  Tap Add to Wallet. If it doesn&apos;t open, use Safari on iPhone. Google Wallet opens in a new tab.
                </p>
              </div>
            )}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
