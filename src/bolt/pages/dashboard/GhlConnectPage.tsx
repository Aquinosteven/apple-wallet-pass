import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Clipboard, RefreshCw, ShieldCheck, TestTube2 } from 'lucide-react';
import { SHOWFI_CUSTOM_FIELDS } from './ghlConstants';
import {
  connectGhlApiKey,
  getGhlIntegrationStatus,
  runGhlIntegrationTest,
  type GhlIntegrationStatus,
  type GhlTestResult,
  type GhlWebhookLog,
} from '../../utils/backendApi';

type WizardStep = 1 | 2 | 3 | 4 | 5;

const steps: Array<{ id: WizardStep; title: string; description: string }> = [
  { id: 1, title: 'Save API Key', description: 'Paste your GHL Location API key.' },
  { id: 2, title: 'Verify Connection', description: 'Confirm the key and detect location.' },
  { id: 3, title: 'Create Custom Fields', description: 'Add standardized ShowFi fields.' },
  { id: 4, title: 'Webhook Setup', description: 'Configure Tag Added workflow action.' },
  { id: 5, title: 'Run Test', description: 'Send a test webhook and review diagnostics.' },
];

const webhookBodyTemplate = {
  contactId: '{{contact.id}}',
  locationId: '{{location.id}}',
  tag: 'showfi_tag_added',
  eventId: '{{workflow.eventId}}',
};

const webhookHeaderTemplate = {
  'x-ghl-secret': '<your GHL_PASS_SECRET>',
};

function formatDateTime(value: string | null): string {
  if (!value) return 'Never';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function statusBadge(log: GhlWebhookLog) {
  if (log.processing_status === 'processed') return 'text-green-700 bg-green-50 border-green-200';
  if (log.processing_status === 'failed') return 'text-red-700 bg-red-50 border-red-200';
  if (log.processing_status === 'duplicate') return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-gray-700 bg-gray-50 border-gray-200';
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function StepHeader({
  activeStep,
  currentStep,
  complete,
  onSelect,
}: {
  activeStep: WizardStep;
  currentStep: WizardStep;
  complete: boolean;
  onSelect: (step: WizardStep) => void;
}) {
  const active = activeStep === currentStep;
  return (
    <button
      type="button"
      onClick={() => onSelect(currentStep)}
      className={`w-full text-left border rounded-xl p-3 transition-colors ${active ? 'border-gblue bg-gblue/5' : 'border-gray-200 bg-white'}`}
    >
      <div className="flex items-center gap-2 mb-1">
        {complete ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-gray-400" />}
        <p className="text-sm font-semibold text-gray-900">Step {currentStep}</p>
      </div>
      <p className="text-sm text-gray-900">{steps[currentStep - 1].title}</p>
      <p className="text-xs text-gray-500 mt-1">{steps[currentStep - 1].description}</p>
    </button>
  );
}

export default function GhlConnectPage() {
  const [activeStep, setActiveStep] = useState<WizardStep>(1);
  const [apiKey, setApiKey] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<GhlIntegrationStatus | null>(null);
  const [fieldChecklistDone, setFieldChecklistDone] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [testContactId, setTestContactId] = useState('');
  const [testLocationId, setTestLocationId] = useState('');
  const [testEventId, setTestEventId] = useState('');
  const [testResult, setTestResult] = useState<GhlTestResult | null>(null);

  const webhookUrl = useMemo(() => `${window.location.origin}/api/webhooks/ghl`, []);

  async function loadStatus() {
    const next = await getGhlIntegrationStatus();
    setStatus(next);
    if (next.locationId) {
      setTestLocationId(next.locationId);
    }
    if (next.apiKeyMasked) {
      setApiKeySaved(true);
    }
  }

  useEffect(() => {
    void loadStatus().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load integration status');
    });
  }, []);

  const stepComplete = {
    1: apiKeySaved,
    2: Boolean(status?.connected),
    3: fieldChecklistDone,
    4: Boolean(status?.connected),
    5: Boolean(testResult),
  } as const;

  async function handleSaveApiKey() {
    setLoading(true);
    setError(null);
    setCopyStatus(null);

    try {
      await connectGhlApiKey({ apiKey, verify: false });
      setApiKeySaved(true);
      setActiveStep(2);
      setApiKey('');
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save key');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setLoading(true);
    setError(null);
    setCopyStatus(null);

    try {
      const result = await connectGhlApiKey({ verify: true });
      await loadStatus();
      if (result.connected) {
        setActiveStep(3);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyCustomFields() {
    const copied = await copyText(SHOWFI_CUSTOM_FIELDS.join('\n'));
    setCopyStatus(copied ? 'Custom field names copied.' : 'Copy failed.');
  }

  async function handleCopyWebhookBody() {
    const copied = await copyText(JSON.stringify(webhookBodyTemplate, null, 2));
    setCopyStatus(copied ? 'Webhook JSON copied.' : 'Copy failed.');
  }

  async function handleCopyWebhookHeader() {
    const copied = await copyText(JSON.stringify(webhookHeaderTemplate, null, 2));
    setCopyStatus(copied ? 'Webhook header copied.' : 'Copy failed.');
  }

  async function handleCopyWebhookUrl() {
    const copied = await copyText(webhookUrl);
    setCopyStatus(copied ? 'Webhook URL copied.' : 'Copy failed.');
  }

  async function handleRunTest() {
    setLoading(true);
    setError(null);
    setCopyStatus(null);

    try {
      const payload = {
        contactId: testContactId || undefined,
        locationId: testLocationId || undefined,
        eventId: testEventId || undefined,
      };
      const response = await runGhlIntegrationTest(payload);
      setTestResult(response.result);
      setActiveStep(5);
      await loadStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Test failed';
      setError(message);
      setTestResult({
        webhookReceived: true,
        passCreated: false,
        claimLinkCreated: false,
        ghlWriteback: { attempted: false, ok: false, error: message },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Connect GoHighLevel</h1>
        <p className="text-sm text-gray-500 mt-1">
          Wizard setup for a sub-account Location API key with no marketplace approval. ShowFi webhook endpoints now require a shared secret header during setup.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4">
        <div className="space-y-3">
          {steps.map((step) => (
            <StepHeader
              key={step.id}
              activeStep={activeStep}
              currentStep={step.id}
              complete={stepComplete[step.id]}
              onSelect={setActiveStep}
            />
          ))}
          <button
            type="button"
            onClick={() => void loadStatus().catch(() => undefined)}
            className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh status
          </button>
        </div>

        <div className="space-y-4">
          {error ? (
            <div className="border border-red-200 bg-red-50 text-red-700 text-sm rounded-xl p-3">{error}</div>
          ) : null}
          {copyStatus ? (
            <div className="border border-green-200 bg-green-50 text-green-700 text-sm rounded-xl p-3">{copyStatus}</div>
          ) : null}

          <section className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-gblue" />
              <h2 className="text-sm font-semibold text-gray-900">Step 1: Save GHL Location API Key</h2>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Paste GHL Location API key"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSaveApiKey()}
                  disabled={loading || !apiKey.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gblue text-white disabled:opacity-50"
                >
                  Save key
                </button>
                {status?.apiKeyMasked ? <p className="text-xs text-gray-500">Saved: {status.apiKeyMasked}</p> : null}
              </div>
            </div>
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Step 2: Verify Key</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleVerify()}
                disabled={loading || !apiKeySaved}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gblue text-white disabled:opacity-50"
              >
                Verify connection
              </button>
              {status?.connected ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              ) : null}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Detected location ID: <span className="font-mono text-gray-700">{status?.locationId || 'Not detected yet'}</span>
            </p>
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Step 3: Custom Fields Checklist</h2>
              <button
                type="button"
                onClick={() => void handleCopyCustomFields()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Clipboard className="w-3.5 h-3.5" /> Copy all
              </button>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SHOWFI_CUSTOM_FIELDS.map((field) => (
                <li key={field} className="text-xs font-mono px-2.5 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                  {field}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 mt-3">
              In GHL: Settings - Custom Fields - Add Field - Contact - Text, then use the exact names above.
            </p>
            <button
              type="button"
              onClick={() => {
                setFieldChecklistDone(true);
                setActiveStep(4);
              }}
              className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white"
            >
              I created these fields
            </button>
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Step 4: Tag-Added Webhook Setup</h2>
            <p className="text-xs text-gray-500 mb-2">Workflow trigger: Tag Added (v1 universal trigger).</p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 mb-3">
              <p className="text-xs text-gray-500 mb-1">Webhook URL</p>
              <p className="text-xs font-mono text-gray-800 break-all">{webhookUrl}</p>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => void handleCopyWebhookUrl()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Clipboard className="w-3.5 h-3.5" /> Copy URL
              </button>
              <button
                type="button"
                onClick={() => void handleCopyWebhookBody()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Clipboard className="w-3.5 h-3.5" /> Copy JSON body
              </button>
              <button
                type="button"
                onClick={() => void handleCopyWebhookHeader()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Clipboard className="w-3.5 h-3.5" /> Copy header
              </button>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-3">
              <p className="text-xs font-semibold text-amber-900 mb-1">Required webhook header</p>
              <p className="text-xs text-amber-800 mb-2">
                Add this header in the GHL webhook action or ShowFi will reject the request.
              </p>
              <pre className="text-xs text-amber-900 font-mono overflow-auto">{JSON.stringify(webhookHeaderTemplate, null, 2)}</pre>
            </div>
            <pre className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto">{JSON.stringify(webhookBodyTemplate, null, 2)}</pre>
            <p className="text-xs text-gray-500 mt-3">
              Use the same secret value as your server-side <code>GHL_PASS_SECRET</code> environment variable.
            </p>
            <button
              type="button"
              onClick={() => setActiveStep(5)}
              className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white"
            >
              Next: Run test
            </button>
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TestTube2 className="w-4 h-4 text-gblue" />
              <h2 className="text-sm font-semibold text-gray-900">Step 5: End-to-End Test</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Before running the live test, confirm your workflow webhook includes <code>x-ghl-secret</code> with the same value as <code>GHL_PASS_SECRET</code>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={testContactId}
                onChange={(event) => setTestContactId(event.target.value)}
                placeholder="contactId (optional for self-test)"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                value={testLocationId}
                onChange={(event) => setTestLocationId(event.target.value)}
                placeholder="locationId"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <input
              value={testEventId}
              onChange={(event) => setTestEventId(event.target.value)}
              placeholder="eventId (optional, fallback = latest event)"
              className="mt-3 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() => void handleRunTest()}
              disabled={loading || !testLocationId.trim()}
              className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-gblue text-white disabled:opacity-50"
            >
              Test webhook
            </button>

            {testResult ? (
              <div className="mt-4 border border-gray-200 rounded-xl p-4 bg-gray-50">
                <p className="text-sm font-semibold text-gray-900 mb-2">Result</p>
                <ul className="space-y-1 text-xs">
                  <li className={testResult.webhookReceived ? 'text-green-700' : 'text-red-700'}>webhook received: {String(testResult.webhookReceived)}</li>
                  <li className={testResult.passCreated ? 'text-green-700' : 'text-red-700'}>pass created: {String(testResult.passCreated)}</li>
                  <li className={testResult.claimLinkCreated ? 'text-green-700' : 'text-red-700'}>claim link created: {String(testResult.claimLinkCreated)}</li>
                  <li className={testResult.ghlWriteback.ok ? 'text-green-700' : 'text-red-700'}>
                    GHL write-back: {testResult.ghlWriteback.ok ? 'success' : 'failed'}
                    {testResult.ghlWriteback.error ? ` (${testResult.ghlWriteback.error})` : ''}
                  </li>
                </ul>
                {testResult.claimUrl ? (
                  <a href={testResult.claimUrl} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs text-gblue hover:underline">
                    Open claim link
                  </a>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Integration Logs</h2>
            <p className="text-xs text-gray-500 mb-3">
              Last webhook: {formatDateTime(status?.lastWebhookAt || null)}
            </p>
            <div className="space-y-2 max-h-80 overflow-auto pr-1">
              {(status?.logs || []).length === 0 ? (
                <p className="text-xs text-gray-500">No webhook events yet.</p>
              ) : (
                (status?.logs || []).map((log) => (
                  <div key={log.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[11px] border px-2 py-0.5 rounded-full ${statusBadge(log)}`}>
                        {log.processing_status}
                      </span>
                      <span className="text-[11px] text-gray-500">{formatDateTime(log.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-700 mt-2 font-mono break-all">
                      contact: {log.contact_id || '-'} | location: {log.location_id || '-'}
                    </p>
                    <p className="text-xs text-gray-700 mt-1">
                      webhook={String(log.webhook_received)} | pass={String(log.pass_created)} | claim={String(log.claim_link_created)} | writeback={String(log.ghl_writeback_ok)}
                    </p>
                    {log.error_message ? (
                      <p className="text-xs text-red-700 mt-1">error: {log.error_message}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
