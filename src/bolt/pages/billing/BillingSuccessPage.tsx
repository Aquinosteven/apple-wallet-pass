import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { getBillingStatus } from '../../utils/backendApi';
import { getSession } from '../../../lib/auth';
import { getBillingSuccessViewModel } from './billingSuccessState';

export default function BillingSuccessPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [statusMessage, setStatusMessage] = useState('Finalizing your account status...');
  const [canAccessDashboard, setCanAccessDashboard] = useState(false);
  const [statusResolved, setStatusResolved] = useState(false);
  const [requiresSignIn, setRequiresSignIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    let retryTimer: number | null = null;

    const validate = async (attempt = 0) => {
      let scheduledRetry = false;

      try {
        retryTimer = null;
        const session = await getSession();
        if (!mounted) return;

        if (!session?.access_token) {
          if (attempt < 5) {
            scheduledRetry = true;
            retryTimer = window.setTimeout(() => {
              void validate(attempt + 1);
            }, 500);
            return;
          }

          setCanAccessDashboard(false);
          setRequiresSignIn(true);
          setStatusMessage('Sign in to verify your payment and continue to your dashboard.');
          return;
        }

        setRequiresSignIn(false);
        const status = await getBillingStatus();
        if (!mounted) return;

        if (status.canAccessDashboard) {
          setCanAccessDashboard(true);
          setStatusMessage('Payment confirmed. Redirecting you to dashboard...');
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1000);
        } else {
          setCanAccessDashboard(false);
          setStatusMessage('Payment is still processing. You can retry from billing.');
        }
      } catch {
        if (!mounted) return;
        if (attempt < 5) {
          scheduledRetry = true;
          retryTimer = window.setTimeout(() => {
            void validate(attempt + 1);
          }, 500);
          return;
        }

        setCanAccessDashboard(false);
        setRequiresSignIn(false);
        setStatusMessage('Could not verify billing status yet. Use the button below to continue.');
      } finally {
        if (mounted && !scheduledRetry) {
          setStatusResolved(true);
        }
      }
    };

    void validate();

    return () => {
      mounted = false;
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [navigate]);

  const plan = params.get('plan');
  const viewModel = getBillingSuccessViewModel({
    statusResolved,
    canAccessDashboard,
    requiresSignIn,
    plan,
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
        <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Checkout completed</h1>
        <p className="mt-2 text-sm text-gray-600">
          {plan ? `Plan selected: ${plan}. ` : ''}
          {statusMessage}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          {viewModel.primaryHref ? (
            <Link
              to={viewModel.primaryHref}
              className="px-4 py-2.5 rounded-lg bg-gblue text-white text-sm font-semibold hover:bg-gblue-dark"
            >
              {viewModel.primaryLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/dashboard', { replace: true })}
              className="px-4 py-2.5 rounded-lg bg-gblue text-white text-sm font-semibold hover:bg-gblue-dark"
            >
              {viewModel.primaryLabel}
            </button>
          )}
          <Link
            to={viewModel.secondaryHref}
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {viewModel.secondaryLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
