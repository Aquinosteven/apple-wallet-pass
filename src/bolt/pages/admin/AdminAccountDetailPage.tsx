import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  createAdminNote,
  getAdminAccountDetail,
  patchAdminAccount,
  startAdminImpersonation,
  type AdminAccountDetailResponse,
} from '../../utils/backendApi';
import { formatAdminDate, formatAdminStatus, formatPlanName, statusTone } from './adminUi';

export default function AdminAccountDetailPage() {
  const { accountId = '' } = useParams();
  const [data, setData] = useState<AdminAccountDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [noteBody, setNoteBody] = useState('');

  const load = async () => {
    const payload = await getAdminAccountDetail(accountId);
    setData(payload);
  };

  useEffect(() => {
    let active = true;
    setError(null);
    void getAdminAccountDetail(accountId)
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Failed to load account detail');
      });
    return () => {
      active = false;
    };
  }, [accountId]);

  const saveAccount = async () => {
    if (!data) return;
    const reason = window.prompt('Reason for this account service update?');
    if (!reason) return;
    setSaving(true);
    try {
      await patchAdminAccount(data.account.id, {
        billingState: data.account.billing_state,
        monthlyIncludedIssuances: data.account.monthly_included_issuances,
        enforcementEnabled: data.account.enforcement_enabled,
        hardBlockIssuance: data.account.hard_block_issuance,
        planCode: data.account.subscription.plan_code || undefined,
        reason,
      });
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update account');
    } finally {
      setSaving(false);
    }
  };

  const createNote = async () => {
    if (!noteBody.trim()) return;
    const reason = window.prompt('Reason for this note?');
    if (!reason) return;
    try {
      await createAdminNote({
        scope: 'account',
        targetId: accountId,
        body: noteBody.trim(),
        reason,
      });
      setNoteBody('');
      await load();
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Failed to add note');
    }
  };

  const logCustomerTouch = async () => {
    if (!data) return;
    const summary = window.prompt('What customer touch happened?');
    if (!summary) return;
    const reason = window.prompt('Reason for logging this touch?');
    if (!reason) return;
    try {
      await createAdminNote({
        scope: 'account',
        targetId: accountId,
        body: summary.trim(),
        reason,
        metadata: {
          kind: 'customer_touch',
          customer_touch: true,
        },
      });
      await load();
    } catch (touchError) {
      setError(touchError instanceof Error ? touchError.message : 'Failed to log customer touch');
    }
  };

  const startImpersonation = async () => {
    if (!data) return;
    const reason = window.prompt('Reason for impersonation?');
    if (!reason) return;
    try {
      const session = await startAdminImpersonation({
        targetUserId: data.account.owner_user_id,
        targetAccountId: data.account.id,
        reason,
      });
      window.localStorage.setItem('showfi_admin_impersonation', JSON.stringify({
        sessionId: session.id,
        targetLabel: data.account.name,
        expiresAt: session.expires_at,
      }));
      window.alert(`Impersonation session opened for ${data.account.name}. Use the dashboard as needed, then end the session from the admin banner flow.`);
    } catch (impersonationError) {
      setError(impersonationError instanceof Error ? impersonationError.message : 'Failed to start impersonation');
    }
  };

  if (error) return <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-100">{error}</div>;
  if (!data) return <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading account detail</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">{data.account.name}</h1>
              <div className="mt-2 text-sm text-slate-400">{data.account.slug} · {data.account.owner_email || data.account.owner_user_id}</div>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(data.account.billing_state)}`}>
              {formatAdminStatus(data.account.billing_state)}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm text-slate-300">
              Billing state
              <select
                value={data.account.billing_state}
                onChange={(event) => setData((current) => current ? {
                  ...current,
                  account: { ...current.account, billing_state: event.target.value as typeof current.account.billing_state },
                } : current)}
                className="mt-2 block w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="past_due">Past due</option>
                <option value="canceled">Canceled</option>
              </select>
            </label>

            <label className="text-sm text-slate-300">
              Plan code
              <input
                value={data.account.subscription.plan_code || ''}
                onChange={(event) => setData((current) => current ? {
                  ...current,
                  account: {
                    ...current.account,
                    subscription: {
                      ...current.account.subscription,
                      plan_code: event.target.value,
                    },
                  },
                } : current)}
                className="mt-2 block w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              />
            </label>

            <label className="text-sm text-slate-300">
              Included issuances
              <input
                type="number"
                value={data.account.monthly_included_issuances}
                onChange={(event) => setData((current) => current ? {
                  ...current,
                  account: {
                    ...current.account,
                    monthly_included_issuances: Number(event.target.value),
                  },
                } : current)}
                className="mt-2 block w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              />
            </label>

            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
              <label className="flex items-center justify-between gap-3 text-sm text-slate-300">
                Enforcement
                <input
                  type="checkbox"
                  checked={data.account.enforcement_enabled}
                  onChange={(event) => setData((current) => current ? {
                    ...current,
                    account: { ...current.account, enforcement_enabled: event.target.checked },
                  } : current)}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm text-slate-300">
                Hard block
                <input
                  type="checkbox"
                  checked={data.account.hard_block_issuance}
                  onChange={(event) => setData((current) => current ? {
                    ...current,
                    account: { ...current.account, hard_block_issuance: event.target.checked },
                  } : current)}
                />
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={saveAccount}
              className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-70"
            >
              Save service changes
            </button>
            <button
              type="button"
              onClick={logCustomerTouch}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white hover:border-slate-600"
            >
              Log customer touch
            </button>
            <button
              type="button"
              onClick={startImpersonation}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white hover:border-slate-600"
            >
              Start impersonation
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
          <h2 className="text-base font-semibold text-white">Customer health</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div>
              Health:
              <span className={`ml-2 rounded-full border px-2 py-1 text-[11px] ${statusTone(data.account.health.status)}`}>
                {formatAdminStatus(data.account.health.status)}
              </span>
            </div>
            <div>{data.account.health.summary}</div>
            <div>Next action: <span className="text-white">{data.account.health.next_action}</span></div>
            <div>Account age: <span className="text-white">{data.account.health.account_age_days} days</span></div>
            <div>Plan: <span className="text-white">{formatPlanName(data.account.subscription.plan_code)}</span></div>
            <div>Provider: <span className="text-white">{data.account.subscription.provider || 'No provider'}</span></div>
            <div>Status: <span className="text-white">{formatAdminStatus(data.account.subscription.status)}</span></div>
            <div>Current period end: <span className="text-white">{formatAdminDate(data.account.subscription.current_period_end)}</span></div>
            <div>Passes created: <span className="text-white">{data.account.usage.passes_total}</span></div>
            <div>Passes last 30 days: <span className="text-white">{data.account.usage.passes_last_30_days}</span></div>
            <div>Open support tickets: <span className="text-white">{data.account.support.open_tickets}</span></div>
            <div>Last customer touch: <span className="text-white">{formatAdminDate(data.account.customer_touch.last_touched_at)}</span></div>
            <div>Touch summary: <span className="text-white">{data.account.customer_touch.last_touch_summary || 'No touch logged yet'}</span></div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="text-sm font-medium text-white">Onboarding</div>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <div>Last sign-in: <span className="text-white">{formatAdminDate(data.account.onboarding.last_sign_in_at)}</span></div>
              <div>Integration: <span className="text-white">{data.account.onboarding.integration_connected ? 'Connected' : 'Not connected'}</span></div>
              <div>Last integration webhook: <span className="text-white">{formatAdminDate(data.account.onboarding.last_webhook_at)}</span></div>
              <div>Events: <span className="text-white">{data.account.onboarding.event_count}</span></div>
              <div>Published events: <span className="text-white">{data.account.onboarding.published_event_count}</span></div>
              <div>Latest event activity: <span className="text-white">{formatAdminDate(data.account.onboarding.latest_event_updated_at)}</span></div>
              <div>Last ticket: <span className="text-white">{data.account.support.last_ticket_subject || 'No recent ticket'}</span></div>
            </div>
            {data.account.health.reasons.length ? (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Risk reasons</div>
                <div className="mt-2 space-y-2">
                  {data.account.health.reasons.map((reason) => (
                    <div key={reason} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300">
                      {reason}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {data.account.health.onboarding_blockers.length ? (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Onboarding blockers</div>
                <div className="mt-2 space-y-2">
                  {data.account.health.onboarding_blockers.map((reason) => (
                    <div key={reason} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300">
                      {reason}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
          <h2 className="text-base font-semibold text-white">Internal notes</h2>
          <div className="mt-4 space-y-3">
            <textarea
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              rows={4}
              placeholder="Add internal context, support notes, or handoff details"
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={createNote}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white hover:border-slate-600"
            >
              Save note
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {data.notes.map((note) => (
              <div key={note.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-sm text-slate-100">{note.body}</div>
                <div className="mt-2 text-xs text-slate-500">{formatAdminDate(note.created_at)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
          <h2 className="text-base font-semibold text-white">Timeline</h2>
          <div className="mt-4 space-y-3">
            {data.timeline.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-white">{item.summary}</div>
                  <span className={`rounded-full border px-2 py-1 text-[11px] ${statusTone(item.type)}`}>{item.type}</span>
                </div>
                <div className="mt-2 text-xs text-slate-500">{formatAdminDate(item.created_at)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
