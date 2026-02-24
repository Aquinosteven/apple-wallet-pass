import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

type ClaimPreview = {
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

export default function ClaimPage() {
  const { token = '' } = useParams();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [claimPreview, setClaimPreview] = useState<ClaimPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const safeToken = useMemo(() => token.trim(), [token]);

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
          return;
        }

        setClaimPreview(payload.claim);
        setLoadState('ready');
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
    if (!safeToken || claimState !== 'idle') return;

    setClaimState('submitting');
    setError(null);

    try {
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: safeToken }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setClaimState('idle');
        setError(payload.error || 'Unable to claim pass.');
        return;
      }

      setClaimState('claimed');
    } catch {
      setClaimState('idle');
      setError('Unable to claim pass right now.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[560px] bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Claim your ShowFi pass</h1>

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

            {claimState === 'claimed' ? (
              <p className="text-sm text-emerald-700">Claimed. Your pass has been reserved.</p>
            ) : (
              <button
                type="button"
                onClick={handleClaim}
                disabled={claimState === 'submitting'}
                className="btn-primary w-full disabled:cursor-not-allowed"
              >
                {claimState === 'submitting' ? 'Claiming...' : 'Continue / Claim'}
              </button>
            )}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-500 cursor-not-allowed"
              >
                Add to Apple Wallet (Soon)
              </button>
              <button
                type="button"
                disabled
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-500 cursor-not-allowed"
              >
                Add to Google Wallet (Soon)
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
