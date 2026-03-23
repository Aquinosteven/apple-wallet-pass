import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Loader2, Wallet } from 'lucide-react';
import { signIn, signUp, updateUserMetadata } from '../../lib/auth';
import { createBillingCheckoutSession, getBillingStatus } from '../utils/backendApi';

type AuthMode = 'signup' | 'signin';
type SignupStep = 'auth' | 'persona' | 'plan' | 'redirecting';

type PersonaAnswers = {
  foundUs: string;
  businessType: string;
  companySize: string;
};

type Plan = {
  code: 'core_monthly_v1' | 'core_yearly_v1';
  name: string;
  price: string;
  cadence: string;
  highlight?: string;
};

const FOUND_US_OPTIONS = [
  'A Friend',
  'LinkedIn',
  'X',
  'Google',
  'YouTube',
  'G2',
  'ChatGPT/LLM',
  'Other',
];

const BUSINESS_TYPE_OPTIONS = [
  'Agency',
  'Software (SaaS)',
  'Consulting/Coaching',
  'Recruiting',
  'E-commerce',
  'Other',
];

const COMPANY_SIZE_OPTIONS = ['1-10', '11-20', '21-50', '51-100', '101-200', '201-500', '500+'];

const PLANS: Plan[] = [
  {
    code: 'core_monthly_v1',
    name: 'Pro Monthly',
    price: '$97',
    cadence: '/month',
  },
  {
    code: 'core_yearly_v1',
    name: 'Pro Yearly',
    price: '$997',
    cadence: '/year',
    highlight: 'Save $167/year',
  },
];

const STEPS: SignupStep[] = ['auth', 'persona', 'plan', 'redirecting'];

const SOCIAL_SIGNUP_ENABLED = String(import.meta.env.VITE_ENABLE_SOCIAL_SIGNUP || '').toLowerCase() === 'true';

const PERSONA_DEFAULTS: PersonaAnswers = {
  foundUs: 'Skipped',
  businessType: 'Skipped',
  companySize: 'Skipped',
};

function getStepLabel(step: SignupStep): string {
  if (step === 'auth') return 'Account';
  if (step === 'persona') return 'About You';
  if (step === 'plan') return 'Plan';
  return 'Redirect';
}

function persistPendingCheckout(data: { planCode: string; sessionId: string | null; checkoutUrl: string; createdAt: string }) {
  try {
    window.localStorage.setItem('showfi_pending_checkout', JSON.stringify(data));
  } catch {
    // Non-blocking if storage is unavailable.
  }
}

function SocialButtons() {
  if (!SOCIAL_SIGNUP_ENABLED) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled
        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-500 bg-gray-50 cursor-not-allowed"
      >
        Continue with Google (Coming soon)
      </button>
      <button
        type="button"
        disabled
        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-500 bg-gray-50 cursor-not-allowed"
      >
        Continue with Apple (Coming soon)
      </button>
      <div className="flex items-center gap-3 py-1">
        <div className="h-px bg-gray-200 flex-1" />
        <span className="text-xs text-gray-400">OR</span>
        <div className="h-px bg-gray-200 flex-1" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<AuthMode>('signup');
  const [step, setStep] = useState<SignupStep>('auth');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [persona, setPersona] = useState<PersonaAnswers>(PERSONA_DEFAULTS);
  const [personaSaved, setPersonaSaved] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<Plan['code']>('core_monthly_v1');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const stepIndex = useMemo(() => STEPS.indexOf(step), [step]);

  useEffect(() => {
    const requestedPlan = searchParams.get('plan');
    if (requestedPlan === 'core_monthly_v1' || requestedPlan === 'core_yearly_v1') {
      setSelectedPlan(requestedPlan);
      if (step !== 'redirecting') {
        setStep('plan');
      }
    }
  }, [searchParams, step]);

  useEffect(() => {
    let mounted = true;

    const loadBillingGateState = async () => {
      try {
        const status = await getBillingStatus();
        if (!mounted) return;

        if (status.canAccessDashboard) {
          navigate('/dashboard', { replace: true });
          return;
        }

        setMode('signup');
        setStep('plan');
        setMessage('Your account needs an active plan to continue.');
      } catch {
        // Not authenticated or endpoint unavailable; keep default login flow.
      }
    };

    void loadBillingGateState();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const syncPersonaToUser = async (answers: PersonaAnswers) => {
    if (personaSaved) {
      return;
    }

    const payload = {
      onboarding_found_us: answers.foundUs || 'Skipped',
      onboarding_business_type: answers.businessType || 'Skipped',
      onboarding_company_size: answers.companySize || 'Skipped',
    };

    const { error: updateError } = await updateUserMetadata(payload);
    if (updateError) {
      throw new Error(updateError.message || 'Failed to save onboarding answers.');
    }

    setPersonaSaved(true);
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError('Email and password are required.');
      setSubmitting(false);
      return;
    }

    if (mode === 'signup' && !termsAccepted) {
      setError('Please accept Terms of Use and Privacy Policy to continue.');
      setSubmitting(false);
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setError('Use a password with at least 6 characters.');
      setSubmitting(false);
      return;
    }

    try {
      if (mode === 'signin') {
        const { error: signInError } = await signIn(cleanEmail, password);
        if (signInError) {
          setError(signInError.message);
          return;
        }

        try {
          const status = await getBillingStatus();
          if (status.canAccessDashboard) {
            navigate('/dashboard', { replace: true });
          } else {
            setMode('signup');
            setStep('plan');
            setMessage('Sign in complete. Select a plan to continue.');
          }
        } catch {
          navigate('/dashboard', { replace: true });
        }

        return;
      }

      const { error: signUpError } = await signUp(cleanEmail, password);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const { error: postSignupSignInError } = await signIn(cleanEmail, password);
      if (postSignupSignInError) {
        setError(postSignupSignInError.message || 'Account created, but automatic sign-in failed.');
        return;
      }

      setStep('persona');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePersonaContinue = async (skip: boolean) => {
    setSubmitting(true);
    setError(null);

    try {
      const answers = skip ? PERSONA_DEFAULTS : {
        foundUs: persona.foundUs || 'Skipped',
        businessType: persona.businessType || 'Skipped',
        companySize: persona.companySize || 'Skipped',
      };

      await syncPersonaToUser(answers);
      if (skip) {
        setPersona(PERSONA_DEFAULTS);
      }
      setStep('plan');
    } catch (personaError) {
      setError(personaError instanceof Error ? personaError.message : 'Failed to save onboarding answers.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    setStep('redirecting');

    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/billing/success?plan=${encodeURIComponent(selectedPlan)}`;
      const cancelUrl = `${origin}/billing/cancel?plan=${encodeURIComponent(selectedPlan)}`;

      const session = await createBillingCheckoutSession({
        planCode: selectedPlan,
        successUrl,
        cancelUrl,
      });

      if (!session.live || !session.checkoutUrl) {
        throw new Error(session.error || 'Checkout is currently unavailable.');
      }

      persistPendingCheckout({
        planCode: selectedPlan,
        sessionId: session.sessionId,
        checkoutUrl: session.checkoutUrl,
        createdAt: new Date().toISOString(),
      });

      window.location.assign(session.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Failed to start checkout.');
      setStep('plan');
    } finally {
      setSubmitting(false);
    }
  };

  const planCards = PLANS.map((plan) => {
    const selected = selectedPlan === plan.code;
    return (
      <button
        key={plan.code}
        type="button"
        onClick={() => setSelectedPlan(plan.code)}
        className={`text-left rounded-xl border p-4 transition-all ${
          selected ? 'border-gblue bg-gblue/5 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
            <p className="mt-0.5 text-xs text-gray-500">{plan.price}{plan.cadence}</p>
          </div>
          {plan.highlight ? (
            <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2 py-1">
              {plan.highlight}
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-gray-500">Unlimited account creation flow, hosted checkout, and dashboard access after activation.</p>
      </button>
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">
        <section className="lg:col-span-2 bg-[#0B172A] text-white rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
            <Wallet className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">Scale your outreach and pass operations faster</h1>
          <p className="mt-3 text-sm text-slate-200">
            Create your account, tell us about your business, and activate your plan in minutes.
          </p>

          <ol className="mt-6 space-y-3">
            {STEPS.slice(0, 3).map((stepKey, index) => {
              const active = index === stepIndex;
              const completed = index < stepIndex;
              return (
                <li key={stepKey} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      completed
                        ? 'bg-emerald-400 text-emerald-950'
                        : active
                          ? 'bg-white text-slate-900'
                          : 'bg-white/10 text-white/80'
                    }`}
                  >
                    {completed ? <Check className="w-3.5 h-3.5" /> : index + 1}
                  </span>
                  <span className={`${active ? 'text-white font-semibold' : 'text-slate-300'}`}>{getStepLabel(stepKey)}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-[0_12px_50px_rgba(15,23,42,0.10)] p-6 sm:p-8">
          {step === 'auth' ? (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-gray-900">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {mode === 'signup'
                    ? 'Start with your email and password, then complete setup.'
                    : 'Sign in to continue to your dashboard or billing setup.'}
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleAuthSubmit}>
                <SocialButtons />

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-gblue focus:outline-none focus:ring-2 focus:ring-gblue/20"
                    placeholder="you@company.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-gblue focus:outline-none focus:ring-2 focus:ring-gblue/20"
                    placeholder="At least 6 characters"
                    required
                  />
                </div>

                {mode === 'signup' ? (
                  <label className="flex items-start gap-3 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-gblue focus:ring-gblue"
                    />
                    <span>
                      I agree to the{' '}
                      <a className="text-gblue hover:underline" target="_blank" rel="noreferrer" href="https://instantly.ai/terms">
                        Terms of Use
                      </a>{' '}
                      and{' '}
                      <a className="text-gblue hover:underline" target="_blank" rel="noreferrer" href="https://instantly.ai/privacy">
                        Privacy Policy
                      </a>
                      .
                    </span>
                  </label>
                ) : null}

                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-gblue px-4 py-2.5 text-sm font-semibold text-white hover:bg-gblue-dark disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {mode === 'signup' ? 'Join Now' : 'Sign In'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode((prev) => (prev === 'signup' ? 'signin' : 'signup'));
                    setError(null);
                    setMessage(null);
                  }}
                  disabled={submitting}
                  className="w-full text-sm text-gray-600 hover:text-gray-900"
                >
                  {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Create one'}
                </button>
              </form>
            </>
          ) : null}

          {step === 'persona' ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900">Let&apos;s get to know you</h2>
              <p className="mt-1 text-sm text-gray-500">We use this to tailor onboarding recommendations.</p>

              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Where did you find us?</p>
                  <div className="flex flex-wrap gap-2">
                    {FOUND_US_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setPersona((prev) => ({ ...prev, foundUs: option }))}
                        className={`px-3 py-1.5 rounded-full text-xs border ${
                          persona.foundUs === option
                            ? 'border-gblue bg-gblue text-white'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">What best describes your business?</p>
                  <div className="flex flex-wrap gap-2">
                    {BUSINESS_TYPE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setPersona((prev) => ({ ...prev, businessType: option }))}
                        className={`px-3 py-1.5 rounded-full text-xs border ${
                          persona.businessType === option
                            ? 'border-gblue bg-gblue text-white'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Company size</p>
                  <div className="flex flex-wrap gap-2">
                    {COMPANY_SIZE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setPersona((prev) => ({ ...prev, companySize: option }))}
                        className={`px-3 py-1.5 rounded-full text-xs border ${
                          persona.companySize === option
                            ? 'border-gblue bg-gblue text-white'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}
              </div>

              <div className="mt-7 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => void handlePersonaContinue(true)}
                  disabled={submitting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-70"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={() => void handlePersonaContinue(false)}
                  disabled={submitting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-gblue text-sm font-semibold text-white hover:bg-gblue-dark disabled:opacity-70 inline-flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Continue
                </button>
              </div>
            </>
          ) : null}

          {step === 'plan' ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900">Choose your plan</h2>
              <p className="mt-1 text-sm text-gray-500">Select a plan to activate your account and continue to the dashboard.</p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {planCards}
              </div>

              {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
              {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}

              <div className="mt-6 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setStep('persona')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 inline-flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void handleCheckout()}
                  disabled={submitting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-gblue text-sm font-semibold text-white hover:bg-gblue-dark disabled:opacity-70 inline-flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Continue to checkout
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : null}

          {step === 'redirecting' ? (
            <div className="py-10 text-center">
              <Loader2 className="w-7 h-7 mx-auto animate-spin text-gblue" />
              <p className="mt-3 text-sm text-gray-600">Redirecting to secure checkout...</p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
