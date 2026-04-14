import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Loader2, Lock, Wallet } from 'lucide-react';
import { signIn, signOut, signUp, updateUserMetadata, verifyDemoAccess } from '../../lib/auth';
import { createBillingCheckoutSession, createBillingPayment, getBillingStatus, type CheckoutSessionResponse } from '../utils/backendApi';
import { centsToAmountString, loadSquareScript, type SquareCard } from '../utils/squareWebPayments';
import { trackBackendEvent } from '../../lib/googleAnalytics';

type AuthMode = 'signup' | 'signin';
type SignupStep = 'auth' | 'persona' | 'plan' | 'redirecting';

type PersonaAnswers = {
  foundUs: string;
  businessType: string;
  companySize: string;
};

type Plan = {
  code: 'solo_monthly_v1' | 'solo_yearly_v1' | 'agency_monthly_v1' | 'agency_yearly_v1';
  name: string;
  price: string;
  cadence: string;
  highlight?: string;
  description?: string;
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
    code: 'solo_monthly_v1',
    name: 'Solo Monthly',
    price: '$97',
    cadence: '/month',
    description: 'One workspace for one brand or team.',
  },
  {
    code: 'solo_yearly_v1',
    name: 'Solo Yearly',
    price: '$997',
    cadence: '/year',
    highlight: 'Save $167/year',
    description: 'Solo plan billed annually.',
  },
  {
    code: 'agency_monthly_v1',
    name: 'Agency Monthly',
    price: '$497',
    cadence: '/month',
    description: 'Multiple client workspaces under one agency account.',
  },
  {
    code: 'agency_yearly_v1',
    name: 'Agency Yearly',
    price: '$4,997',
    cadence: '/year',
    highlight: 'Save $967/year',
    description: 'Agency plan billed annually.',
  },
];

const STEPS: SignupStep[] = ['auth', 'persona', 'plan', 'redirecting'];
const FREE_SIGNUP_STEPS: SignupStep[] = ['auth', 'persona', 'redirecting'];

const SOCIAL_SIGNUP_ENABLED = String(import.meta.env.VITE_ENABLE_SOCIAL_SIGNUP || '').toLowerCase() === 'true';
const ONBOARDING_PENDING_KEY = 'showfi_onboarding_pending';

const PERSONA_DEFAULTS: PersonaAnswers = {
  foundUs: 'Skipped',
  businessType: 'Skipped',
  companySize: 'Skipped',
};

function getStepLabel(step: SignupStep, isFreeSignupFlow: boolean): string {
  if (step === 'auth') return 'Account';
  if (step === 'persona') return 'About You';
  if (isFreeSignupFlow && step === 'redirecting') return 'Access';
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

function setOnboardingPending(value: boolean) {
  try {
    if (value) {
      window.sessionStorage.setItem(ONBOARDING_PENDING_KEY, 'true');
    } else {
      window.sessionStorage.removeItem(ONBOARDING_PENDING_KEY);
    }
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

export default function LoginPage({ variant = 'default' }: { variant?: 'default' | 'free' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFreeSignupFlow = variant === 'free';
  const demoStorageKey = 'showfi_demo_access_granted';

  const [mode, setMode] = useState<AuthMode>('signup');
  const [step, setStep] = useState<SignupStep>('auth');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [persona, setPersona] = useState<PersonaAnswers>(PERSONA_DEFAULTS);
  const [personaSaved, setPersonaSaved] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<Plan['code']>('solo_monthly_v1');
  const [checkoutSession, setCheckoutSession] = useState<CheckoutSessionResponse | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [cardConsent, setCardConsent] = useState(false);
  const [demoPassword, setDemoPassword] = useState('');
  const [demoUnlocked, setDemoUnlocked] = useState(false);
  const [demoUnlocking, setDemoUnlocking] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const cardInstanceRef = useRef<SquareCard | null>(null);

  const activeSteps = useMemo(() => (isFreeSignupFlow ? FREE_SIGNUP_STEPS : STEPS), [isFreeSignupFlow]);
  const stepIndex = useMemo(() => activeSteps.indexOf(step), [activeSteps, step]);
  const selectedPlanDetails = useMemo(
    () => PLANS.find((plan) => plan.code === selectedPlan) || PLANS[0],
    [selectedPlan],
  );

  useEffect(() => {
    if (!isFreeSignupFlow) {
      return;
    }

    try {
      setDemoUnlocked(window.sessionStorage.getItem(demoStorageKey) === 'true');
    } catch {
      setDemoUnlocked(false);
    }
  }, [isFreeSignupFlow]);

  useEffect(() => {
    if (isFreeSignupFlow) {
      return;
    }

    const requestedPlan = searchParams.get('plan');
    if (
      mode === 'signup'
      && step === 'plan'
      && (
        requestedPlan === 'solo_monthly_v1'
        || requestedPlan === 'solo_yearly_v1'
        || requestedPlan === 'agency_monthly_v1'
        || requestedPlan === 'agency_yearly_v1'
      )
    ) {
      setSelectedPlan(requestedPlan);
    }
  }, [isFreeSignupFlow, mode, searchParams, step]);

  useEffect(() => {
    if (step !== 'plan' || !checkoutSession?.live) {
      setCardReady(false);
      return;
    }

    if (
      !checkoutSession.squareApplicationId
      || !checkoutSession.squareLocationId
      || checkoutSession.checkoutMode !== 'embedded'
    ) {
      setError('Embedded checkout is not configured yet.');
      setCardReady(false);
      return;
    }

    let active = true;

    const initializeCard = async () => {
      setCardReady(false);

      try {
        const applicationId = checkoutSession.squareApplicationId;
        const locationId = checkoutSession.squareLocationId;
        if (!applicationId || !locationId) {
          throw new Error('Embedded checkout is not configured yet.');
        }

        await loadSquareScript(checkoutSession.squareEnvironment);
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

        await card.attach('#square-card-container');
        if (!active) {
          await card.destroy?.();
          return;
        }

        cardInstanceRef.current = card;
        setCardReady(true);
      } catch (cardError) {
        if (!active) return;
        setError(cardError instanceof Error ? cardError.message : 'Failed to load secure checkout.');
      }
    };

    void initializeCard();

    return () => {
      active = false;
      setCardReady(false);
      const currentCard = cardInstanceRef.current;
      cardInstanceRef.current = null;
      if (currentCard?.destroy) {
        void currentCard.destroy();
      }
      const container = document.getElementById('square-card-container');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [checkoutSession, step]);

  const handleSwitchAccount = async () => {
    setSigningOut(true);
    setError(null);
    setMessage(null);

    try {
      await signOut();
      setOnboardingPending(false);
      setMode('signin');
      setStep('auth');
      setEmail('');
      setPassword('');
      setMessage('Signed out. You can now log in with a different account.');
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Failed to sign out.');
    } finally {
      setSigningOut(false);
    }
  };

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
        setOnboardingPending(false);
        const { error: signInError } = await signIn(cleanEmail, password);
        if (signInError) {
          setError(signInError.message);
          return;
        }

        trackBackendEvent('backend_auth_success', {
          auth_mode: 'signin',
          flow_type: isFreeSignupFlow ? 'free' : 'paid',
        });

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

      const { error: signUpError } = await signUp(
        cleanEmail,
        password,
        isFreeSignupFlow ? { freeSignup: true, demoPassword } : undefined
      );
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const { error: postSignupSignInError } = await signIn(cleanEmail, password);
      if (postSignupSignInError) {
        setError(postSignupSignInError.message || 'Account created, but automatic sign-in failed.');
        return;
      }

      trackBackendEvent('backend_auth_success', {
        auth_mode: 'signup',
        flow_type: isFreeSignupFlow ? 'free' : 'paid',
      });

      setOnboardingPending(true);
      setStep('persona');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoAccessSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDemoUnlocking(true);
    setDemoError(null);

    const cleanPassword = demoPassword.trim();
    if (!cleanPassword) {
      setDemoError('Enter the demo password to continue.');
      setDemoUnlocking(false);
      return;
    }

    try {
      const result = await verifyDemoAccess(cleanPassword);
      if (!result.ok) {
        setDemoError(result.error || 'Incorrect password.');
        return;
      }

      try {
        window.sessionStorage.setItem(demoStorageKey, 'true');
      } catch {
        // Non-blocking if storage is unavailable.
      }

      setDemoUnlocked(true);
    } catch (error) {
      setDemoError(error instanceof Error ? error.message : 'Unable to verify password.');
    } finally {
      setDemoUnlocking(false);
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

      if (isFreeSignupFlow) {
        setOnboardingPending(false);
        setStep('redirecting');
        navigate('/dashboard', { replace: true });
        return;
      }

      setOnboardingPending(false);
      setStep('plan');
    } catch (personaError) {
      setError(personaError instanceof Error ? personaError.message : 'Failed to save onboarding answers.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setError(null);
    setMessage(null);

    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/billing/success?plan=${encodeURIComponent(selectedPlan)}`;
      const cancelUrl = `${origin}/billing/cancel?plan=${encodeURIComponent(selectedPlan)}`;

      const session = await createBillingCheckoutSession({
        planCode: selectedPlan,
        successUrl,
        cancelUrl,
      });

      if (!session.live) {
        throw new Error(session.error || 'Checkout is currently unavailable.');
      }

      setCheckoutSession(session);
      setCardConsent(false);
      setMessage('Secure payment form loaded below.');
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Failed to start checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleEmbeddedPayment = async () => {
    const card = cardInstanceRef.current;
    if (!card || !checkoutSession) {
      setError('Secure checkout is still loading. Please wait a moment and try again.');
      return;
    }

    if (!cardConsent) {
      setError('Please confirm that we can save this card for your recurring subscription.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const tokenResult = await card.tokenize({
        amount: centsToAmountString(checkoutSession.amountCents),
        currencyCode: checkoutSession.currency,
        intent: 'CHARGE',
        customerInitiated: true,
        sellerKeyedIn: false,
        billingContact: {
          email: email.trim().toLowerCase(),
          countryCode: 'US',
        },
      });

      if (tokenResult.status !== 'OK' || !tokenResult.token) {
        const sdkMessage = tokenResult.errors?.[0]?.message || `Tokenization failed with status ${tokenResult.status}.`;
        throw new Error(sdkMessage);
      }

      const payment = await createBillingPayment({
        planCode: selectedPlan,
        sourceId: tokenResult.token,
      });

      persistPendingCheckout({
        planCode: selectedPlan,
        sessionId: payment.paymentId,
        checkoutUrl: payment.receiptUrl || 'embedded',
        createdAt: new Date().toISOString(),
      });

      navigate(`/billing/success?plan=${encodeURIComponent(selectedPlan)}`, { replace: true });
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Failed to complete payment.');
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
        onClick={() => {
          setSelectedPlan(plan.code);
          setCheckoutSession(null);
          setCardReady(false);
          setError(null);
          setMessage(null);
        }}
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
        <p className="mt-3 text-xs text-gray-500">{plan.description || 'Embedded secure checkout and dashboard access after activation.'}</p>
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
          <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">
            {isFreeSignupFlow ? 'Activate your complimentary ShowFi account' : 'Scale your outreach and pass operations faster'}
          </h1>
          <p className="mt-3 text-sm text-slate-200">
            {isFreeSignupFlow
              ? 'Use your private invite link to create a free account and get straight into the dashboard.'
              : 'Create your account, tell us about your business, and activate your plan in minutes.'}
          </p>

          <ol className="mt-6 space-y-3">
            {activeSteps.slice(0, isFreeSignupFlow ? 2 : 3).map((stepKey, index) => {
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
                  <span className={`${active ? 'text-white font-semibold' : 'text-slate-300'}`}>
                    {getStepLabel(stepKey, isFreeSignupFlow)}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-[0_12px_50px_rgba(15,23,42,0.10)] p-6 sm:p-8">
          {isFreeSignupFlow && !demoUnlocked ? (
            <>
              <div className="mb-5">
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Lock className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Enter demo password</h2>
                <p className="mt-1 text-sm text-gray-500">
                  This signup page is protected. Enter the password to unlock the free signup form.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleDemoAccessSubmit}>
                <div>
                  <label htmlFor="demo-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password
                  </label>
                  <input
                    id="demo-password"
                    type="password"
                    value={demoPassword}
                    onChange={(event) => setDemoPassword(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-gblue focus:outline-none focus:ring-2 focus:ring-gblue/20"
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                  />
                </div>

                {demoError ? <p className="text-sm text-red-600">{demoError}</p> : null}

                <button
                  type="submit"
                  disabled={demoUnlocking}
                  className="w-full rounded-lg bg-gblue px-4 py-2.5 text-sm font-semibold text-white hover:bg-gblue-dark disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {demoUnlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Unlock demo signup
                </button>
              </form>
            </>
          ) : null}

          {(step === 'auth' && (!isFreeSignupFlow || demoUnlocked)) ? (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-gray-900">
                  {mode === 'signup' ? (isFreeSignupFlow ? 'Create your free account' : 'Create your account') : 'Welcome back'}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {mode === 'signup'
                    ? isFreeSignupFlow
                      ? 'Start with your email and password, then finish your free account setup.'
                      : 'Start with your email and password, then complete setup.'
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
                      <a className="text-gblue hover:underline" target="_blank" rel="noreferrer" href="/terms">
                        Terms of Use
                      </a>{' '}
                      and{' '}
                      <a className="text-gblue hover:underline" target="_blank" rel="noreferrer" href="/privacy">
                        Privacy Policy
                      </a>
                      .
                    </span>
                  </label>
                ) : null}

                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-gblue px-4 py-2.5 text-sm font-semibold text-white hover:bg-gblue-dark disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {mode === 'signup' ? (isFreeSignupFlow ? 'Create Free Account' : 'Join Now') : 'Sign In'}
                  </button>

                  {!isFreeSignupFlow ? (
                    <button
                      type="button"
                      onClick={() => void handleSwitchAccount()}
                      disabled={signingOut}
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-70"
                    >
                      {signingOut ? 'Signing out...' : 'Clear saved session'}
                    </button>
                  ) : null}
                </div>

                {isFreeSignupFlow ? (
                  <a href="/login" className="block w-full text-center text-sm text-gray-600 hover:text-gray-900">
                    Already have an account? Sign in on the main login page
                  </a>
                ) : (
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
                )}
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
                  {isFreeSignupFlow ? 'Finish setup' : 'Continue'}
                </button>
              </div>
            </>
          ) : null}

          {step === 'plan' ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900">Choose your plan</h2>
              <p className="mt-1 text-sm text-gray-500">Select a plan, then complete payment directly on this page.</p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {planCards}
              </div>

              {checkoutSession?.live ? (
                <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Secure payment</h3>
                        <p className="text-xs text-gray-500">
                        {selectedPlanDetails.name} recurring subscription for {selectedPlanDetails.price}{selectedPlanDetails.cadence}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {selectedPlanDetails.price}{selectedPlanDetails.cadence}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
                    <div id="square-card-container" className="min-h-20" />
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Card details stay inside Square&apos;s secure payment fields. We save a card on file with Square so your subscription can renew automatically.
                  </p>

                  <label className="mt-4 flex items-start gap-3 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={cardConsent}
                      onChange={(event) => setCardConsent(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gblue focus:ring-gblue"
                    />
                    <span>
                      I authorize ShowFi to store this card with Square and charge it automatically for my recurring subscription until I cancel.
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => void handleEmbeddedPayment()}
                    disabled={submitting || !cardReady || !cardConsent}
                    className="mt-4 w-full rounded-lg bg-gblue px-4 py-2.5 text-sm font-semibold text-white hover:bg-gblue-dark disabled:cursor-not-allowed disabled:opacity-70 inline-flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {cardReady ? `Pay ${selectedPlanDetails.price} now` : 'Loading secure checkout...'}
                  </button>
                </div>
              ) : null}

              {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
              {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}

              <div className="mt-6 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'signin') {
                      setStep('auth');
                      setMessage(null);
                      return;
                    }
                    setStep('persona');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 inline-flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {mode === 'signin' ? 'Back to sign in' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleCheckout()}
                  disabled={checkoutLoading}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-gblue text-sm font-semibold text-white hover:bg-gblue-dark disabled:opacity-70 inline-flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {checkoutSession?.live ? 'Reload checkout form' : 'Load checkout form'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : null}

          {step === 'redirecting' ? (
            <div className="py-10 text-center">
              <Loader2 className="w-7 h-7 mx-auto animate-spin text-gblue" />
              <p className="mt-3 text-sm text-gray-600">
                {isFreeSignupFlow ? 'Opening your dashboard...' : 'Redirecting to secure checkout...'}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
