import { useEffect, useMemo, useRef, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { User, Key, Bell, CreditCard, Building, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  cancelBillingSubscription,
  getBillingStatus,
  getOpsErrorFeed,
  resumeBillingSubscription,
  updateBillingPaymentMethod,
  type BillingStatus,
  type OpsErrorItem,
} from '../../utils/backendApi';
import { getUser } from '../../../lib/auth';
import { loadSquareScript, type SquareCard } from '../../utils/squareWebPayments';

const tabs = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'api', label: 'API Access', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'operations', label: 'Operations', icon: AlertTriangle },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'team', label: 'Team', icon: Building },
] as const;

const cancellationReasons = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'missing_features', label: 'Missing features' },
  { value: 'hard_to_use', label: 'Too hard to use' },
  { value: 'temporary_pause', label: 'Just pausing for now' },
  { value: 'other', label: 'Other' },
] as const;

function formatPlanLabel(planCode: string | null | undefined) {
  if (!planCode) return 'No active plan';
  return planCode
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatStatusLabel(status: string | null | undefined) {
  if (!status) return 'Unknown';
  return status
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getUserDisplayName(user: SupabaseUser | null) {
  if (!user) return 'Signed-out user';
  const metadata = user.user_metadata || {};
  const fullName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : '';
  const name = typeof metadata.name === 'string' ? metadata.name.trim() : '';
  if (fullName) return fullName;
  if (name) return name;
  if (user.email) return user.email;
  return user.id;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
        {value}
      </div>
    </div>
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('account');
  const [opsErrors, setOpsErrors] = useState<OpsErrorItem[]>([]);
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsErrorMessage, setOpsErrorMessage] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<(typeof cancellationReasons)[number]['value'] | ''>('');
  const [cancelDetail, setCancelDetail] = useState('');
  const [missingFeature, setMissingFeature] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<'yes' | 'no' | 'not_sure'>('not_sure');
  const [billingActionBusy, setBillingActionBusy] = useState(false);
  const [billingActionMessage, setBillingActionMessage] = useState<string | null>(null);
  const [paymentMethodBusy, setPaymentMethodBusy] = useState(false);
  const [paymentMethodReady, setPaymentMethodReady] = useState(false);
  const [paymentMethodConsent, setPaymentMethodConsent] = useState(false);
  const [paymentMethodMessage, setPaymentMethodMessage] = useState<string | null>(null);
  const cardInstanceRef = useRef<SquareCard | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setOpsLoading(true);
      setOpsErrorMessage(null);
      setAccountError(null);
      setBillingError(null);

      const [opsResult, userResult, billingResult] = await Promise.allSettled([
        getOpsErrorFeed(),
        getUser(),
        getBillingStatus(),
      ]);

      if (!mounted) return;

      if (opsResult.status === 'fulfilled') {
        setOpsErrors(opsResult.value);
      } else {
        setOpsErrorMessage(opsResult.reason instanceof Error ? opsResult.reason.message : 'Failed to load operations errors.');
      }

      if (userResult.status === 'fulfilled') {
        setAuthUser(userResult.value);
      } else {
        setAccountError(userResult.reason instanceof Error ? userResult.reason.message : 'Failed to load account details.');
      }

      if (billingResult.status === 'fulfilled') {
        setBillingStatus(billingResult.value);
      } else {
        setBillingError(billingResult.reason instanceof Error ? billingResult.reason.message : 'Failed to load billing details.');
      }

      setOpsLoading(false);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (
      activeTab !== 'billing'
      || billingStatus?.provider !== 'square'
      || !billingStatus.squareApplicationId
      || !billingStatus.squareLocationId
      || billingStatus.accountBillingState === 'canceled'
    ) {
      setPaymentMethodReady(false);
      return;
    }

    let active = true;

    const initializeCard = async () => {
      setPaymentMethodReady(false);

      try {
        const applicationId = billingStatus.squareApplicationId;
        const locationId = billingStatus.squareLocationId;
        if (!applicationId || !locationId) {
          throw new Error('Embedded checkout is not configured yet.');
        }

        await loadSquareScript(billingStatus.squareEnvironment);
        if (!active) return;
        if (!window.Square) {
          throw new Error('Square checkout failed to load.');
        }

        const payments = window.Square.payments(
          applicationId,
          locationId,
        );
        const card = await payments.card();
        if (!active) {
          await card.destroy?.();
          return;
        }

        await card.attach('#billing-payment-method-card');
        if (!active) {
          await card.destroy?.();
          return;
        }

        cardInstanceRef.current = card;
        setPaymentMethodReady(true);
      } catch (error) {
        if (!active) return;
        setPaymentMethodMessage(error instanceof Error ? error.message : 'Failed to load secure card update form.');
      }
    };

    void initializeCard();

    return () => {
      active = false;
      setPaymentMethodReady(false);
      const currentCard = cardInstanceRef.current;
      cardInstanceRef.current = null;
      if (currentCard?.destroy) {
        void currentCard.destroy();
      }
      const container = document.getElementById('billing-payment-method-card');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [activeTab, billingStatus]);

  const displayName = useMemo(() => getUserDisplayName(authUser), [authUser]);
  const email = authUser?.email || 'No email available';
  const timezone =
    (typeof authUser?.user_metadata?.timezone === 'string' && authUser.user_metadata.timezone) ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'America/Chicago';
  const accessEndsLabel = formatDateTime(billingStatus?.accessEndsAt);
  const cancelRequestedLabel = formatDateTime(billingStatus?.cancelRequestedAt);
  const exitSurveyReason =
    billingStatus?.exitSurvey && typeof billingStatus.exitSurvey.reason === 'string'
      ? billingStatus.exitSurvey.reason
      : null;

  async function handleCancellationSubmit() {
    if (!cancelReason) {
      setBillingActionMessage('Select a reason so we can record the offboarding survey.');
      return;
    }

    setBillingActionBusy(true);
    setBillingActionMessage(null);

    try {
      const nextBilling = await cancelBillingSubscription({
        reason: cancelReason,
        detail: cancelDetail,
        missingFeature,
        wouldRecommend,
      });
      setBillingStatus(nextBilling);
      setBillingError(null);
      setBillingActionMessage(
        nextBilling.cancelAtPeriodEnd
          ? `Cancellation scheduled. Account access remains available through ${formatDateTime(nextBilling.accessEndsAt)}.`
          : 'Account cancellation recorded. Billing access is now closed.',
      );
    } catch (error) {
      setBillingActionMessage(error instanceof Error ? error.message : 'Failed to submit cancellation request.');
    } finally {
      setBillingActionBusy(false);
    }
  }

  async function handleResumeCancellation() {
    setBillingActionBusy(true);
    setBillingActionMessage(null);

    try {
      const nextBilling = await resumeBillingSubscription();
      setBillingStatus(nextBilling);
      setBillingError(null);
      setBillingActionMessage('Cancellation request removed. Your account will stay active.');
    } catch (error) {
      setBillingActionMessage(error instanceof Error ? error.message : 'Failed to keep the account active.');
    } finally {
      setBillingActionBusy(false);
    }
  }

  async function handlePaymentMethodUpdate() {
    const card = cardInstanceRef.current;
    if (!card || !billingStatus) {
      setPaymentMethodMessage('Secure card form is still loading. Please try again in a moment.');
      return;
    }
    if (!paymentMethodConsent) {
      setPaymentMethodMessage('Please confirm that we can store the replacement card for renewals.');
      return;
    }

    setPaymentMethodBusy(true);
    setPaymentMethodMessage(null);

    try {
      const tokenized = await card.tokenize({
        intent: 'STORE',
        customerInitiated: true,
        sellerKeyedIn: false,
        billingContact: {
          email,
          countryCode: 'US',
        },
      });

      if (tokenized.status !== 'OK' || !tokenized.token) {
        throw new Error(tokenized.errors?.[0]?.message || `Tokenization failed with status ${tokenized.status}.`);
      }

      await updateBillingPaymentMethod({
        sourceId: tokenized.token,
      });

      const refreshedBilling = await getBillingStatus();
      setBillingStatus(refreshedBilling);
      setBillingError(null);
      setPaymentMethodConsent(false);
      setPaymentMethodMessage('Payment method updated. Future subscription renewals will use the new card.');
    } catch (error) {
      setPaymentMethodMessage(error instanceof Error ? error.message : 'Failed to update payment method.');
    } finally {
      setPaymentMethodBusy(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review your live account, billing, and operations details.
        </p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="md:w-52 md:flex-shrink-0">
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-1 md:space-y-1 md:gap-0">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                      active ? 'bg-gblue/8 text-gblue' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 ${active ? 'text-gblue' : 'text-gray-400'}`} />
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex-1">
          {activeTab === 'account' && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Account Information</h3>
                <p className="mt-1 text-xs text-gray-500">
                  This reflects the live authenticated account for the current session.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ReadOnlyField label="Full Name" value={displayName} />
                <ReadOnlyField label="Email" value={email} />
                <ReadOnlyField label="Timezone" value={timezone} />
                <ReadOnlyField label="User ID" value={authUser?.id || 'Unavailable'} />
              </div>
              {accountError && <p className="text-sm text-red-600">{accountError}</p>}
              <p className="text-xs text-gray-500">
                Profile editing is not available in-app yet. Contact support if you need account changes.
              </p>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">API Access</h3>
                <p className="text-sm text-gray-600">
                  The current product uses the signed-in user&apos;s Bearer token for authenticated endpoints such as
                  <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs">/api/registrants</code>.
                </p>
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-900">No standalone dashboard API keys yet</p>
                  <p className="mt-1 text-xs text-amber-800">
                    If you need server-to-server access, use your authenticated backend session or reach out to support for setup guidance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Notification Coverage</h3>
              <div className="space-y-4">
                {[
                  { label: 'New ticket issued', description: 'Triggered when an attendee pass is created.' },
                  { label: 'Wallet adds', description: 'Tracked when a pass is downloaded or a wallet save flow is opened.' },
                  { label: 'Check-ins', description: 'Reserved for event-day attendee scans and future check-in workflows.' },
                  { label: 'Weekly summary', description: 'Reserved for summary digests once scheduled notifications are enabled.' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">Info</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'operations' && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Error Feed</h3>
              {opsLoading && <p className="text-sm text-gray-500">Loading operation errors...</p>}
              {!opsLoading && opsErrorMessage && <p className="text-sm text-red-600">{opsErrorMessage}</p>}
              {!opsLoading && !opsErrorMessage && opsErrors.length === 0 && (
                <p className="text-sm text-gray-500">No active operation errors.</p>
              )}
              {!opsLoading && !opsErrorMessage && opsErrors.length > 0 && (
                <div className="space-y-3">
                  {opsErrors.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-lg border p-3 ${
                        item.severity === 'error' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-gray-900">{item.scope}</p>
                        <span className="text-[11px] text-gray-500">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{item.message}</p>
                      {item.pass_id && <p className="mt-1 text-xs text-gray-500">Pass: {item.pass_id}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Current Plan</h3>
                <p className="mt-1 text-xs text-gray-500">Billing details are loaded from the live account billing gate.</p>
              </div>
              <div className="rounded-lg border border-gblue/20 bg-gblue/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{formatPlanLabel(billingStatus?.planCode)}</p>
                    <p className="text-xs text-gray-500">
                      Provider: {billingStatus?.provider || 'Unavailable'} · Status: {formatStatusLabel(billingStatus?.subscriptionStatus)}
                    </p>
                  </div>
                  <span className="inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700 border border-gray-200">
                    {billingStatus?.canAccessDashboard ? 'Access active' : 'Billing required'}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ReadOnlyField label="Account Billing State" value={formatStatusLabel(billingStatus?.accountBillingState)} />
                <ReadOnlyField label="Subscription ID" value={billingStatus?.subscriptionId || 'Unavailable'} />
                <ReadOnlyField label="Trial Ends" value={billingStatus?.trialEndsAt || 'No active trial'} />
                <ReadOnlyField label="Account Slug" value={billingStatus?.accountSlug || 'Unavailable'} />
              </div>
              <div className="rounded-xl border border-gray-200 p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Manage account</h4>
                  <p className="mt-1 text-xs text-gray-500">
                    Cancel future renewals with a short exit survey. If your plan is active, access stays on until the current billing period ends.
                  </p>
                </div>

                {billingStatus?.cancellationEffective || billingStatus?.accountBillingState === 'canceled' ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-900">Account offboarding complete</p>
                    <p className="mt-1 text-sm text-gray-600">
                      This account is no longer billed. You can choose a plan again any time if you want to restart.
                    </p>
                  </div>
                ) : billingStatus?.cancelAtPeriodEnd ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-medium text-amber-950">Cancellation scheduled</p>
                      <p className="mt-1 text-sm text-amber-900">
                        Requested {cancelRequestedLabel}. Access stays active through {accessEndsLabel}.
                      </p>
                      {exitSurveyReason && (
                        <p className="mt-2 text-xs text-amber-900">
                          Exit reason on file: {formatStatusLabel(exitSurveyReason)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleResumeCancellation()}
                      disabled={billingActionBusy}
                      className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {billingActionBusy ? 'Saving…' : 'Keep account active'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Exit survey</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {cancellationReasons.map((reason) => {
                          const active = cancelReason === reason.value;
                          return (
                            <button
                              key={reason.value}
                              type="button"
                              onClick={() => setCancelReason(reason.value)}
                              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                                active
                                  ? 'border-gblue bg-gblue/10 text-gblue'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
                              }`}
                            >
                              {reason.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-gray-600">What was missing?</span>
                        <input
                          type="text"
                          value={missingFeature}
                          onChange={(event) => setMissingFeature(event.target.value)}
                          placeholder="Feature, integration, workflow, or outcome"
                          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-gblue focus:ring-2 focus:ring-gblue/15"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-gray-600">Would you recommend ShowFi?</span>
                        <select
                          value={wouldRecommend}
                          onChange={(event) => setWouldRecommend(event.target.value as 'yes' | 'no' | 'not_sure')}
                          className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-gblue focus:ring-2 focus:ring-gblue/15"
                        >
                          <option value="yes">Yes</option>
                          <option value="not_sure">Not sure</option>
                          <option value="no">No</option>
                        </select>
                      </label>
                    </div>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-gray-600">Anything we should know before you go?</span>
                      <textarea
                        value={cancelDetail}
                        onChange={(event) => setCancelDetail(event.target.value)}
                        rows={4}
                        placeholder="Optional context for the team"
                        className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-gblue focus:ring-2 focus:ring-gblue/15"
                      />
                    </label>

                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
                      If there is an active billing period, the cancellation applies to future renewals and access stays available until the period ends.
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleCancellationSubmit()}
                      disabled={billingActionBusy}
                      className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {billingActionBusy ? 'Submitting…' : 'Cancel plan'}
                    </button>
                  </div>
                )}
              </div>
              {billingStatus?.provider === 'square' && billingStatus?.accountBillingState !== 'canceled' ? (
                <div className="rounded-xl border border-gray-200 p-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Update payment method</h4>
                    <p className="mt-1 text-xs text-gray-500">
                      Replace the card Square uses for future subscription renewals. Your billing cycle and plan stay the same.
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div id="billing-payment-method-card" className="min-h-20 rounded-lg bg-white p-3" />
                  </div>

                  <label className="flex items-start gap-3 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={paymentMethodConsent}
                      onChange={(event) => setPaymentMethodConsent(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gblue focus:ring-gblue"
                    />
                    <span>
                      I authorize ShowFi to replace the card Square stores for my subscription renewals with this new card.
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => void handlePaymentMethodUpdate()}
                    disabled={paymentMethodBusy || !paymentMethodReady || !paymentMethodConsent}
                    className="inline-flex items-center rounded-lg bg-gblue px-4 py-2 text-sm font-medium text-white transition hover:bg-gblue-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {paymentMethodBusy ? 'Saving…' : paymentMethodReady ? 'Update payment method' : 'Loading secure card form…'}
                  </button>

                  {paymentMethodMessage && <p className="text-sm text-gray-700">{paymentMethodMessage}</p>}
                </div>
              ) : null}
              {billingError && <p className="text-sm text-red-600">{billingError}</p>}
              {billingActionMessage && <p className="text-sm text-gray-700">{billingActionMessage}</p>}
              <Link to="/pricing" className="inline-flex text-sm font-medium text-gblue hover:underline">
                View plans
              </Link>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Team Access</h3>
                <p className="mt-1 text-xs text-gray-500">This workspace currently reflects the signed-in owner only.</p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{displayName}</p>
                    <p className="text-xs text-gray-500">{email}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">Owner</span>
              </div>
              <p className="text-xs text-gray-500">
                Team invites and role management are not enabled in the dashboard yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
