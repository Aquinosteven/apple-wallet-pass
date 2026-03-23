import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { getBillingStatus } from '../../utils/backendApi';

export default function BillingSuccessPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [statusMessage, setStatusMessage] = useState('Finalizing your account status...');

  useEffect(() => {
    let mounted = true;

    const validate = async () => {
      try {
        const status = await getBillingStatus();
        if (!mounted) return;

        if (status.canAccessDashboard) {
          setStatusMessage('Payment confirmed. Redirecting you to dashboard...');
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1000);
        } else {
          setStatusMessage('Payment is still processing. You can retry from billing.');
        }
      } catch {
        if (!mounted) return;
        setStatusMessage('Could not verify billing status yet. Use the button below to continue.');
      }
    };

    void validate();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const plan = params.get('plan');

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
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="px-4 py-2.5 rounded-lg bg-gblue text-white text-sm font-semibold hover:bg-gblue-dark"
          >
            Go to dashboard
          </button>
          <Link
            to="/login"
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to billing
          </Link>
        </div>
      </div>
    </div>
  );
}
